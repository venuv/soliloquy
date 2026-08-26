import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { matchQuotes, pickWisdomType, pickVoice, VOICES, loadQuotes } from '../muse/matcher.js';
import { writeAndSync } from '../persist.js';
import { rateLimit } from '../rate-limit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const MUSE_ANALYTICS_FILE = path.join(__dirname, '../data/muse-analytics.json');

// Migrated from Anthropic (Sonnet 4 was deprecated 2026-08 with model-not-found
// 404s) to Groq's openai/gpt-oss family — same provider we already use for
// beats, recite, and word-picture generation. ~5x cheaper than Sonnet, still
// good enough for quote-selection + character-voicing tasks.
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';      // quality tasks: rerank, actor, critic
const MODEL_FAST = 'openai/gpt-oss-20b';  // classification: parse user input

function getApiKey() {
  return process.env.GROQ_API_KEY || null;
}

/**
 * Single-shot Groq call. Returns the assistant's text (raw string).
 * Callers that need JSON parse it themselves — matches the existing pattern
 * in this file (regex extract) and avoids depending on model-specific
 * response_format quirks.
 */
async function callGroq(prompt, { model = MODEL, maxTokens = 512, temperature = 0.7 } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Streaming Groq call. Invokes onDelta(tokenText) for each incoming chunk.
 * Returns the full concatenated text when the stream completes.
 * OpenAI-compatible SSE format: `data: {...}\n\n` per event, `data: [DONE]` at end.
 */
async function streamGroq(prompt, onDelta, { model = MODEL, maxTokens = 512, temperature = 0.7 } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      stream: true,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq stream ${res.status}: ${errText.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep;
    while ((sep = buffer.indexOf('\n\n')) >= 0) {
      const raw = buffer.slice(0, sep).trim();
      buffer = buffer.slice(sep + 2);
      if (!raw.startsWith('data:')) continue;
      const payload = raw.slice(5).trim();
      if (payload === '[DONE]') break;
      try {
        const obj = JSON.parse(payload);
        const delta = obj.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onDelta(delta);
        }
      } catch {
        // ignore malformed chunks
      }
    }
  }

  return full;
}

// Preload quotes on startup
loadQuotes();

/**
 * Parse user input to extract emotions and themes.
 * Uses the fast/cheap model — this is classification, not creative work.
 */
async function parseUserInput(userInput) {
  const prompt = `Classify this morning check-in. JSON only, no explanation.

"${userInput}"

{
  "emotions": ["primary", "secondary"],
  "themes": ["theme1", "theme2"],
  "intensity": "low|medium|high",
  "valence": "positive|negative|mixed|neutral",
  "needs": "validation|perspective|comfort|challenge|reflection",
  "subtext": "one sentence: what's unsaid"
}

Emotions: sadness, melancholy, aimlessness, searching, anxiety, restlessness, weariness, frustration, contentment, hope, gratitude, fear, anger, joy, love
Themes: purpose, identity, time, change, decision, relationships, ambition, mortality, legacy, self_discovery, acceptance`;

  const text = await callGroq(prompt, { model: MODEL_FAST, maxTokens: 256, temperature: 0.2 });
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);
  throw new Error('Failed to parse user input analysis');
}

/**
 * LLM-rerank: given algorithmic top candidates, ask the model which quote
 * actually connects to what the user said.
 */
async function rerankQuotes(candidates, userInput, userState) {
  const candidateSummaries = candidates.map((q, i) =>
    `${i}: "${q.quote}" — ${q.character}, ${q.play}. Situation: ${q.character_situation || 'unknown'}`
  ).join('\n');

  const prompt = `A user shared how they're feeling this morning:
"${userInput}"
(Emotions: ${userState.emotions?.join(', ')}. Themes: ${userState.themes?.join(', ')})

Here are ${candidates.length} Shakespeare quotes. Pick the ONE that most genuinely connects to what this specific person said — not just matching emotions, but where the character's situation resonates with the user's actual experience.

${candidateSummaries}

Respond with JSON only:
{
  "pick": 0,
  "reason": "one sentence: why this quote connects to what they actually said"
}`;

  try {
    const text = await callGroq(prompt, { maxTokens: 192, temperature: 0.3 });
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0]);
    const idx = Math.min(Math.max(0, json.pick), candidates.length - 1);
    console.log(`[muse] Reranked: picked #${idx} — ${json.reason}`);
    return { quote: candidates[idx], reason: json.reason };
  } catch (err) {
    console.warn('[muse] Rerank failed, using algorithmic top:', err.message);
    return { quote: candidates[0], reason: null };
  }
}

/**
 * Actor: Generate response with a specific quote and voice (batch mode).
 */
async function generateResponse(quote, userInput, userState, voice, criticNotes) {
  const voiceConfig = VOICES[voice];
  const prompt = buildActorPrompt(quote, userInput, voiceConfig, criticNotes);
  return await callGroq(prompt, { maxTokens: 640, temperature: 0.75 });
}

/**
 * Critic: evaluate whether the response is specific enough, whether the quote
 * actually connects, and whether the voice is consistent.
 */
async function critiqueResponse(response, quote, userInput, voice) {
  const prompt = `You are a quality critic for the Morning Muse — a Shakespeare wisdom service.

THE USER SAID: "${userInput}"
VOICE CHOSEN: ${voice}
QUOTE USED: "${quote.quote}" — ${quote.character}, ${quote.play}

RESPONSE GENERATED:
---
${response}
---

Score each criterion 1-5 and explain briefly:

1. SPECIFICITY: Does the response reference what the user actually said (their specific words/situation), or does it use generic therapy-speak like "you're tired and stuck"?
2. QUOTE FIT: Does the Shakespeare quote genuinely connect to the user's situation, or is it shoehorned in?
3. VOICE: Does the response sound like the specified voice throughout, or does it slip into generic advice-giving?
4. BREVITY: Is it tight and punchy, or does it ramble?

Respond with JSON:
{
  "scores": { "specificity": 3, "quote_fit": 4, "voice": 3, "brevity": 4 },
  "pass": true,
  "notes": "If pass is false, explain what to fix in 1-2 sentences. Be specific."
}

Set pass=true if ALL scores are 3+. Set pass=false if any score is 1-2.`;

  try {
    const text = await callGroq(prompt, { maxTokens: 320, temperature: 0.3 });
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0]);
    console.log(`[muse] Critic scores:`, json.scores, json.pass ? 'PASS' : 'FAIL');
    return json;
  } catch (err) {
    console.warn('[muse] Critic failed, accepting response:', err.message);
    return { pass: true, scores: {}, notes: null };
  }
}

/**
 * Load or initialize muse analytics
 */
async function loadMuseAnalytics() {
  try {
    const content = await fs.readFile(MUSE_ANALYTICS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { responses: [], feedback: [] };
  }
}

/**
 * Save muse analytics
 */
async function saveMuseAnalytics(analytics) {
  await writeAndSync(MUSE_ANALYTICS_FILE, analytics);
}

/**
 * POST /api/muse
 * Main endpoint - takes user input, returns Shakespeare wisdom
 */
router.post('/', rateLimit({ name: 'muse', capacity: 5, windowMs: 3600_000 }), async (req, res) => {
  if (!getApiKey()) {
    return res.status(503).json({
      error: 'Muse unavailable',
      message: 'GROQ_API_KEY not configured'
    });
  }

  const { input, style: preferredStyle } = req.body;

  if (!input || input.trim().length < 5) {
    return res.status(400).json({ error: 'Please share how you are feeling (at least a few words)' });
  }

  try {
    const t0 = Date.now();

    // Step 1: Parse user input (fast model — ~300-500ms)
    const userState = await parseUserInput(input);
    const t1 = Date.now();
    console.log(`[muse] Parse: ${t1 - t0}ms`);

    // Step 2: Bucket lookup + score (instant, <5ms)
    const wisdomType = pickWisdomType(userState);
    userState.wisdom_type = wisdomType;
    const { candidates, confident, poolSize } = matchQuotes(userState, 5);
    if (candidates.length === 0) {
      return res.status(503).json({
        error: 'No quotes available',
        message: 'Quote database not loaded. Run crab-enrich.js first.'
      });
    }

    // Step 3: Pick voice (instant)
    const voice = pickVoice(preferredStyle);
    const t2 = Date.now();
    console.log(`[muse] Match: ${t2 - t1}ms (pool=${poolSize}, confident=${confident})`);

    // Step 4: Conditional rerank — only if algorithmic scores are tight
    let quote, rerankReason = null;
    if (!confident) {
      const reranked = await rerankQuotes(candidates, input, userState);
      quote = reranked.quote;
      rerankReason = reranked.reason;
      console.log(`[muse] Rerank: ${Date.now() - t2}ms`);
    } else {
      quote = candidates[0]; // algorithmic winner is clear
      console.log(`[muse] Rerank: skipped (confident)`);
    }

    // Step 5: Generate response — stream if client accepts, else batch
    const t3 = Date.now();
    const responseId = `muse-${Date.now()}`;
    const wantsStream = req.query.stream === '1' || req.headers.accept === 'text/event-stream';

    if (wantsStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Send metadata first
      const meta = {
        id: responseId,
        quote: {
          text: quote.full_text?.split('\n').slice(0, 8).join('\n'),
          character: quote.character,
          play: quote.play,
          situation: quote.character_situation
        },
        meta: {
          emotions: userState.emotions,
          wisdomType,
          voice: VOICES[voice].name
        }
      };
      res.write(`event: meta\ndata: ${JSON.stringify(meta)}\n\n`);

      // Stream the actor response
      const voiceConfig = VOICES[voice];
      const actorPrompt = buildActorPrompt(quote, input, voiceConfig, null);
      const fullResponse = await streamGroq(actorPrompt, (delta) => {
        res.write(`event: token\ndata: ${JSON.stringify(delta)}\n\n`);
      }, { maxTokens: 640, temperature: 0.75 });

      res.write(`event: done\ndata: {}\n\n`);
      res.end();
      console.log(`[muse] Actor (streamed): ${Date.now() - t3}ms`);
      console.log(`[muse] Total: ${Date.now() - t0}ms (${confident ? '2' : '3'} LLM calls, streamed)`);

      // Async critic + analytics
      critiqueAndLog(fullResponse, quote, input, voice, responseId, userState, wisdomType, rerankReason, Date.now() - t0);
    } else {
      // Batch mode
      const response = await generateResponse(quote, input, userState, voice, null);
      const totalMs = Date.now() - t0;
      console.log(`[muse] Actor: ${Date.now() - t3}ms`);
      console.log(`[muse] Total: ${totalMs}ms (${confident ? '2' : '3'} LLM calls)`);

      res.json({
        id: responseId,
        response,
        quote: {
          text: quote.full_text?.split('\n').slice(0, 8).join('\n'),
          character: quote.character,
          play: quote.play,
          situation: quote.character_situation
        },
        meta: {
          emotions: userState.emotions,
          wisdomType,
          voice: VOICES[voice].name,
          latencyMs: totalMs
        }
      });

      critiqueAndLog(response, quote, input, voice, responseId, userState, wisdomType, rerankReason, totalMs);
    }
  } catch (error) {
    console.error('Muse error:', error);
    res.status(500).json({ error: 'The muse is momentarily silent', message: error.message });
  }
});

/**
 * POST /api/muse/feedback
 * Record like/dislike for a response
 */
router.post('/feedback', async (req, res) => {
  const { responseId, liked, comment } = req.body;

  if (!responseId || typeof liked !== 'boolean') {
    return res.status(400).json({ error: 'responseId and liked (boolean) required' });
  }

  try {
    const analytics = await loadMuseAnalytics();

    analytics.feedback.push({
      responseId,
      liked,
      comment: comment?.substring(0, 500),
      timestamp: new Date().toISOString()
    });

    if (analytics.feedback.length > 1000) {
      analytics.feedback = analytics.feedback.slice(-1000);
    }

    await saveMuseAnalytics(analytics);

    res.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

/**
 * GET /api/muse/stats
 * Get muse usage statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const analytics = await loadMuseAnalytics();

    const totalResponses = analytics.responses.length;
    const totalFeedback = analytics.feedback.length;
    const likes = analytics.feedback.filter(f => f.liked).length;
    const dislikes = totalFeedback - likes;

    const emotions = {};
    analytics.responses.forEach(r => {
      r.userState?.emotions?.forEach(e => {
        emotions[e] = (emotions[e] || 0) + 1;
      });
    });

    const styles = {};
    analytics.responses.forEach(r => {
      const v = r.voice || r.style;
      styles[v] = (styles[v] || 0) + 1;
    });

    const plays = {};
    analytics.responses.forEach(r => {
      plays[r.play] = (plays[r.play] || 0) + 1;
    });

    res.json({
      totalResponses,
      totalFeedback,
      likes,
      dislikes,
      approvalRate: totalFeedback > 0 ? Math.round((likes / totalFeedback) * 100) : null,
      emotionDistribution: emotions,
      styleDistribution: styles,
      topPlays: Object.entries(plays)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([play, count]) => ({ play, count }))
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/muse/quotes/count
 * Get count of available quotes
 */
router.get('/quotes/count', (req, res) => {
  const quotes = loadQuotes();
  res.json({ count: quotes.length });
});

/**
 * Build the actor prompt (extracted for reuse in streaming + batch paths)
 */
function buildActorPrompt(quote, userInput, voiceConfig, criticNotes) {
  const revision = criticNotes
    ? `\n\nIMPORTANT — A critic reviewed your previous attempt and said:\n"${criticNotes}"\nFix these issues in this version.`
    : '';

  return `You are the Morning Muse. Someone shared how their morning is going. You offer Shakespeare's wisdom — but only if it genuinely connects. You are NOT a Shakespeare encyclopedia. You are a friend who happens to know Shakespeare deeply.

THE USER SAID:
"${userInput}"

READ CAREFULLY. What did they actually say? Reference their specific words and situation, not a generic emotional category.

SHAKESPEARE QUOTE TO USE:
Character: ${quote.character} (${quote.play})
Situation: ${quote.character_situation}
Quote:
"${quote.full_text?.split('\n').slice(0, 8).join('\n')}"

YOUR VOICE TODAY: ${voiceConfig.name}
${voiceConfig.description}
Example: "${voiceConfig.example}"

RULES:
1. Your FIRST sentence must reference something SPECIFIC the user said — their actual words, not a paraphrase into therapy-speak.
2. Connect the quote to their situation with a concrete parallel — what the character was going through that mirrors this.
3. Present 2-4 key lines from the quote (the ones that land hardest for THIS situation).
4. Close with one sentence — insight, question, or reframe. Match the voice.
5. Under 150 words total. The voice dictates everything — word choice, sentence length, attitude.${revision}`;
}

/**
 * Async critique + analytics logging (fire-and-forget after response is sent)
 */
async function critiqueAndLog(response, quote, userInput, voice, responseId, userState, wisdomType, rerankReason, totalMs) {
  try {
    const critique = await critiqueResponse(response, quote, userInput, voice);

    const analytics = await loadMuseAnalytics();
    analytics.responses.push({
      id: responseId,
      timestamp: new Date().toISOString(),
      userState,
      wisdomType,
      voice,
      play: quote.play,
      character: quote.character,
      quote: quote.quote,
      rerankReason,
      critique: critique.scores,
      critiquePass: critique.pass,
      latencyMs: totalMs
    });

    if (analytics.responses.length > 1000) {
      analytics.responses = analytics.responses.slice(-1000);
    }

    await saveMuseAnalytics(analytics);
  } catch (err) {
    console.warn('[muse] critiqueAndLog failed:', err.message);
  }
}

export default router;
