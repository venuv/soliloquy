import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { matchQuotes, pickWisdomType, pickVoice, VOICES, loadQuotes } from '../muse/matcher.js';
import { writeAndSync } from '../persist.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const MUSE_ANALYTICS_FILE = path.join(__dirname, '../data/muse-analytics.json');

// Initialize Anthropic client
let anthropic = null;
function getClient() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic();
  }
  return anthropic;
}

// Preload quotes on startup
loadQuotes();

/**
 * Parse user input to extract emotions and themes.
 * Uses Haiku — this is classification, not creative work. ~3x faster than Sonnet.
 */
async function parseUserInput(client, userInput) {
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

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 192,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = message.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Failed to parse user input analysis');
}

/**
 * LLM-rerank: given algorithmic top candidates, ask Claude which quote
 * actually connects to what the user said.
 */
async function rerankQuotes(client, candidates, userInput, userState) {
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
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 128,
      messages: [{ role: 'user', content: prompt }]
    });
    const text = message.content[0].text;
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
 * Actor: Generate response with a specific quote and voice.
 */
async function generateResponse(client, quote, userInput, userState, voice, criticNotes) {
  const voiceConfig = VOICES[voice];
  const revision = criticNotes
    ? `\n\nIMPORTANT — A critic reviewed your previous attempt and said:\n"${criticNotes}"\nFix these issues in this version.`
    : '';

  const prompt = `You are the Morning Muse. Someone shared how their morning is going. You offer Shakespeare's wisdom — but only if it genuinely connects. You are NOT a Shakespeare encyclopedia. You are a friend who happens to know Shakespeare deeply.

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

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }]
  });

  return message.content[0].text;
}

/**
 * Critic: evaluate whether the response is specific enough, whether the quote
 * actually connects, and whether the voice is consistent.
 */
async function critiqueResponse(client, response, quote, userInput, voice) {
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
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }]
    });
    const text = message.content[0].text;
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
router.post('/', async (req, res) => {
  const client = getClient();
  if (!client) {
    return res.status(503).json({
      error: 'Muse unavailable',
      message: 'ANTHROPIC_API_KEY not configured'
    });
  }

  const { input, style: preferredStyle } = req.body;

  if (!input || input.trim().length < 5) {
    return res.status(400).json({ error: 'Please share how you are feeling (at least a few words)' });
  }

  try {
    const t0 = Date.now();

    // Step 1: Parse user input (Haiku — fast, ~300ms)
    const userState = await parseUserInput(client, input);
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
      const reranked = await rerankQuotes(client, candidates, input, userState);
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
      // SSE streaming — user sees words immediately (~1s to first token)
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
      const stream = await client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [{ role: 'user', content: buildActorPrompt(quote, input, voiceConfig, null) }]
      });

      let fullResponse = '';
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta?.text) {
          fullResponse += event.delta.text;
          res.write(`event: token\ndata: ${JSON.stringify(event.delta.text)}\n\n`);
        }
      }

      res.write(`event: done\ndata: {}\n\n`);
      res.end();
      console.log(`[muse] Actor (streamed): ${Date.now() - t3}ms`);
      console.log(`[muse] Total: ${Date.now() - t0}ms (${confident ? '2' : '3'} LLM calls, streamed)`);

      // Async critic + analytics
      critiqueAndLog(client, fullResponse, quote, input, voice, responseId, userState, wisdomType, rerankReason, Date.now() - t0);
    } else {
      // Batch mode — original behavior
      const response = await generateResponse(client, quote, input, userState, voice, null);
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

      // Async critic + analytics
      critiqueAndLog(client, response, quote, input, voice, responseId, userState, wisdomType, rerankReason, totalMs);
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

    // Keep last 1000 feedback entries
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

    // Emotion distribution
    const emotions = {};
    analytics.responses.forEach(r => {
      r.userState?.emotions?.forEach(e => {
        emotions[e] = (emotions[e] || 0) + 1;
      });
    });

    // Voice distribution
    const styles = {};
    analytics.responses.forEach(r => {
      const v = r.voice || r.style;
      styles[v] = (styles[v] || 0) + 1;
    });

    // Top plays
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
async function critiqueAndLog(client, response, quote, userInput, voice, responseId, userState, wisdomType, rerankReason, totalMs) {
  try {
    const critique = await critiqueResponse(client, response, quote, userInput, voice);

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

    // Keep last 1000 responses
    if (analytics.responses.length > 1000) {
      analytics.responses = analytics.responses.slice(-1000);
    }

    await saveMuseAnalytics(analytics);
  } catch (err) {
    console.warn('[muse] critiqueAndLog failed:', err.message);
  }
}

export default router;
