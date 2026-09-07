import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { writeAndSync } from '../persist.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const DATA_DIR = path.join(__dirname, '../data');
const ANALYTICS_DIR = path.join(DATA_DIR, 'analytics');
const SOURCES_PATH = path.join(ANALYTICS_DIR, 'intention-sources.json');
const CANONICAL_PATH = path.join(ANALYTICS_DIR, 'canonical-intentions.json');
const VOTES_PATH = path.join(ANALYTICS_DIR, 'extract-votes.json');
const HIDDEN_PATH = path.join(ANALYTICS_DIR, 'hidden-extracts.json');

// User keys that get owner privileges (side-thumb to hide bad extracts).
// Env var OWNER_USER_KEYS is a comma-separated list; defaults to '121292'
// (The Builder in NICKNAMES).
const OWNER_KEYS = (process.env.OWNER_USER_KEYS || '121292')
  .split(',').map(s => s.trim()).filter(Boolean);
function isOwner(req) {
  const key = req.headers['x-user-key'];
  return key && OWNER_KEYS.includes(key);
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';
const FETCH_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

// ---------- Helpers ----------

async function readJson(p, fallback) {
  try { return JSON.parse(await fs.readFile(p, 'utf-8')); }
  catch { return fallback; }
}

function beatKey(authorId, workId, beatIndex) {
  return `${authorId}/${workId}/${beatIndex}`;
}

// Stable ID for an extract — hash(quote + source). Survives regeneration
// when the LLM picks the same extract again; votes stay attached.
function extractId(quote, source) {
  return crypto.createHash('sha256').update(`${quote}|${source}`).digest('hex').slice(0, 12);
}

function voteKey(authorId, workId, beatIndex, exId) {
  return `${authorId}/${workId}/${beatIndex}/${exId}`;
}
function workKey(authorId, workId) {
  return `${authorId}/${workId}`;
}

async function loadWork(authorId, workId) {
  const authorPath = path.join(DATA_DIR, 'authors', `${authorId}.json`);
  const data = JSON.parse(await fs.readFile(authorPath, 'utf-8'));
  return (data.works || []).find(w => w.id === workId) || null;
}

// Extract the text of a chunk. Chunks are objects with .front + .back
// (flashcard-style split); we join them with a space to reconstitute prose.
// Older/simpler chunks may be plain strings.
function chunkText(c) {
  if (typeof c === 'string') return c;
  const front = c.front || '';
  const back = c.back || '';
  return (front && back) ? `${front} ${back}` : (front || back || c.text || '');
}

// Extract the text of a beat by concatenating its chunk range.
function beatText(work, beat) {
  const chunks = work.chunks || [];
  const start = beat.startChunk ?? 0;
  const end = beat.endChunk ?? chunks.length - 1;
  return chunks.slice(start, end + 1).map(chunkText).join(' ');
}

function fullSoliloquyText(work) {
  return (work.chunks || []).map(chunkText).join(' ');
}

// Strip HTML tags + collapse whitespace. Not a real parser — but sufficient
// for feeding scraped source pages to the LLM as noisy context.
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchSource(url, maxBytes = 20000) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': FETCH_UA, 'Accept': 'text/html,*/*' } });
    if (!res.ok) return { url, ok: false, error: `${res.status}` };
    const html = await res.text();
    const text = stripHtml(html).slice(0, maxBytes);
    return { url, ok: true, text };
  } catch (err) {
    return { url, ok: false, error: err.message };
  }
}

async function callGroq(prompt, { maxTokens = 1200, temperature = 0.4 } = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      // 'medium' gives the model room to actually think about the
      // beat + adjacent beats + sources before producing a tactical
      // intention. 'low' produced conservative, generic verbs. Extra
      // reasoning tokens are budgeted via the larger max_tokens.
      reasoning_effort: 'medium',
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

// Sources that returned very little visible text (e.g. SPA shells that need
// JS to render) are effectively useless as evidence — drop them from the
// prompt so the LLM can't cite them as if they mattered.
const MIN_SOURCE_BYTES = 500;

function buildPrompt({ work, beat, beatIdx, beatTextStr, fullText, sources }) {
  const sourceBlocks = sources
    .filter(s => s.ok && s.text && s.text.length >= MIN_SOURCE_BYTES)
    .map(s => `--- ${s.url} ---\n${s.text}`)
    .join('\n\n');
  return `You are annotating a Shakespeare soliloquy for a memorization app.

YOUR JOB IS EXTRACTION, NOT SYNTHESIS. Do not write anything of your own. Do not paraphrase. Do not summarize. Do not "improve" the source language. Your entire output must be quotations pulled verbatim from the retrieved passages, plus the source URL each came from.

For the CURRENT BEAT below, find the sentence(s) in the RETRIEVED PASSAGES that most directly discuss the MEANING, PURPOSE, or INTERPRETATION of what happens in this specific beat. Ignore passages that only discuss the whole play, other scenes, or the character's biography — we want the interpretive content SPECIFIC to what this beat says or does.

RULES:
- Every extract MUST be verbatim from a retrieved passage — word for word. If in doubt, omit.
- Prefer 1-3 short extracts (1-3 sentences each). Multiple short beats a single long dump.
- Extracts should come from different sources when possible.
- Extracts must actually pertain to THIS beat, not the whole speech.
- If NO retrieved passage has anything specifically relevant to this beat, respond EXTRACTS: none
- Never fabricate. If nothing verbatim fits, return none.

WORK: ${work.source} (character: ${work.character})

FULL SOLILOQUY (context only — for locating the beat, not for extraction):
${fullText}

CURRENT BEAT (beat ${beatIdx}${beat.label ? `, "${beat.label}"` : ''}):
${beatTextStr}

RETRIEVED PASSAGES:
${sourceBlocks || '(no sources retrieved — respond EXTRACTS: none)'}

Respond EXACTLY in this format, nothing else:
EXTRACT: "<verbatim quote>" | <source URL>
EXTRACT: "<verbatim quote>" | <source URL>
(add more EXTRACT lines as needed, or respond EXTRACTS: none)`;
}

// Parses either "EXTRACT: \"quote\" | url" lines or "EXTRACTS: none".
// Returns { extracts: [{ quote, source }, ...] } — empty array if none.
function parseGroqResponse(text) {
  if (/EXTRACTS:\s*none/i.test(text)) return { extracts: [] };
  const extracts = [];
  const lineRe = /EXTRACT:\s*"([^"]+)"\s*\|\s*(\S+)/gi;
  let m;
  while ((m = lineRe.exec(text)) !== null) {
    const quote = m[1].trim();
    const source = m[2].trim();
    if (quote && source) extracts.push({ quote, source });
  }
  return { extracts };
}

function requireAdmin(req, res, next) {
  const adminKey = process.env.ADMIN_KEY || 'change-me-in-production';
  const provided = req.headers['x-admin-key'] || req.query.adminKey;
  if (provided !== adminKey) return res.status(401).json({ error: 'admin key required' });
  next();
}

async function validateUserKey(req, res, next) {
  const key = req.headers['x-user-key'];
  if (!key) return res.status(401).json({ error: 'No key provided' });
  try {
    await fs.access(path.join(ANALYTICS_DIR, `${key}.json`));
    req.userKey = key;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid key' });
  }
}

// ---------- Public endpoints ----------

// Return all beats for a work with the cached extracts (LLM-selected verbatim
// quotes from curated sources) plus per-extract vote tallies. Extraction
// happens once via admin-generate and is cached in canonical-intentions.json
// — this endpoint is a cheap read.
router.get('/:authorId/:workId', async (req, res) => {
  try {
    const { authorId, workId } = req.params;
    const userKey = req.headers['x-user-key'] || null;
    const work = await loadWork(authorId, workId);
    if (!work) return res.status(404).json({ error: 'work not found' });

    const canonical = await readJson(CANONICAL_PATH, {});
    const sources = await readJson(SOURCES_PATH, {});
    const votes = await readJson(VOTES_PATH, {});
    const hidden = await readJson(HIDDEN_PATH, {});
    const viewerIsOwner = isOwner(req);

    const beats = (work.beats || []).map((b, i) => {
      const k = beatKey(authorId, workId, i);
      const cached = canonical[k];
      const extractsAll = (cached?.extracts || []).map(ex => {
        const id = extractId(ex.quote, ex.source);
        const vk = voteKey(authorId, workId, i, id);
        const v = votes[vk] || { up: [], down: [] };
        return {
          id,
          quote: ex.quote,
          source: ex.source,
          hidden: !!hidden[vk],
          votes: { up: v.up?.length || 0, down: v.down?.length || 0 },
          myVote: userKey
            ? (v.up?.includes(userKey) ? 'up' : (v.down?.includes(userKey) ? 'down' : null))
            : null
        };
      });
      // Owner sees hidden extracts (marked as such). Non-owners don't.
      const extracts = viewerIsOwner ? extractsAll : extractsAll.filter(e => !e.hidden);
      return {
        beatIndex: i,
        label: b.label || null,
        baselineIntention: b.intention || null,
        extracts,
        generatedAt: cached?.generatedAt || null
      };
    });

    res.json({
      workId,
      authorId,
      isOwner: viewerIsOwner,
      sourceUrls: sources[workKey(authorId, workId)] || [],
      beats
    });
  } catch (err) {
    console.error('GET intentions failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Owner-only: toggle hidden state on a specific extract. Hidden extracts
// disappear from non-owner views entirely; owner still sees them marked.
router.post('/:authorId/:workId/:beatIndex/:extractId/hide', validateUserKey, async (req, res) => {
  try {
    if (!isOwner(req)) return res.status(403).json({ error: 'owner only' });
    const { authorId, workId, beatIndex, extractId: exId } = req.params;
    const hidden = await readJson(HIDDEN_PATH, {});
    const k = voteKey(authorId, workId, Number(beatIndex), exId);
    if (hidden[k]) delete hidden[k];
    else hidden[k] = { hiddenAt: new Date().toISOString(), by: req.userKey };
    await writeAndSync(HIDDEN_PATH, hidden);
    res.json({ success: true, hidden: !!hidden[k] });
  } catch (err) {
    console.error('extract hide failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Cast (or clear) a vote on a specific extract. Same-direction click clears.
router.post('/:authorId/:workId/:beatIndex/:extractId/vote', validateUserKey, async (req, res) => {
  try {
    const { authorId, workId, beatIndex, extractId: exId } = req.params;
    const vote = req.body?.vote; // 'up' | 'down' | null
    if (![null, 'up', 'down'].includes(vote)) {
      return res.status(400).json({ error: 'vote must be up, down, or null' });
    }
    const votes = await readJson(VOTES_PATH, {});
    const k = voteKey(authorId, workId, Number(beatIndex), exId);
    if (!votes[k]) votes[k] = { up: [], down: [] };
    votes[k].up = votes[k].up.filter(u => u !== req.userKey);
    votes[k].down = votes[k].down.filter(u => u !== req.userKey);
    if (vote === 'up') votes[k].up.push(req.userKey);
    if (vote === 'down') votes[k].down.push(req.userKey);
    await writeAndSync(VOTES_PATH, votes);
    res.json({ success: true, votes: { up: votes[k].up.length, down: votes[k].down.length } });
  } catch (err) {
    console.error('extract vote failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Admin endpoints ----------
// Votes endpoint removed — extractive retrieval doesn't need moderation
// the same way synthesized intentions did. The quote is either verbatim
// and relevant, or it isn't; owner can regenerate if a bad extract slips.

// Set the curated URL list for a work.
router.post('/admin-sources/:authorId/:workId', requireAdmin, async (req, res) => {
  try {
    const { authorId, workId } = req.params;
    const urls = req.body?.sources;
    if (!Array.isArray(urls) || !urls.every(u => typeof u === 'string' && /^https?:\/\//.test(u))) {
      return res.status(400).json({ error: 'sources must be array of http(s) URLs' });
    }
    const sources = await readJson(SOURCES_PATH, {});
    sources[workKey(authorId, workId)] = urls;
    await writeAndSync(SOURCES_PATH, sources);
    res.json({ success: true, sources: urls });
  } catch (err) {
    console.error('admin-sources failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate WITHOUT saving — for prompt tuning.
router.post('/admin-preview/:authorId/:workId/:beatIndex', requireAdmin, async (req, res) => {
  try {
    const { authorId, workId, beatIndex } = req.params;
    const work = await loadWork(authorId, workId);
    if (!work) return res.status(404).json({ error: 'work not found' });
    const beat = (work.beats || [])[Number(beatIndex)];
    if (!beat) return res.status(404).json({ error: 'beat not found' });

    const sources = await readJson(SOURCES_PATH, {});
    const urls = sources[workKey(authorId, workId)] || [];
    if (!urls.length) return res.status(400).json({ error: 'no sources curated for this work' });

    const fetched = await Promise.all(urls.map(u => fetchSource(u)));
    const idx = Number(beatIndex);
    const prompt = buildPrompt({
      work, beat, beatIdx: idx,
      beatTextStr: beatText(work, beat),
      fullText: fullSoliloquyText(work),
      sources: fetched
    });
    const raw = await callGroq(prompt);
    const parsed = parseGroqResponse(raw);
    res.json({
      preview: parsed,
      raw,
      fetchStatus: fetched.map(s => ({ url: s.url, ok: s.ok, error: s.error, bytes: s.text?.length || 0 }))
    });
  } catch (err) {
    console.error('admin-preview failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate and save. If beatIndex omitted, generates for all beats sequentially.
router.post('/admin-generate/:authorId/:workId/:beatIndex?', requireAdmin, async (req, res) => {
  try {
    const { authorId, workId } = req.params;
    const single = req.params.beatIndex != null ? Number(req.params.beatIndex) : null;
    const work = await loadWork(authorId, workId);
    if (!work) return res.status(404).json({ error: 'work not found' });

    const sources = await readJson(SOURCES_PATH, {});
    const urls = sources[workKey(authorId, workId)] || [];
    if (!urls.length) return res.status(400).json({ error: 'no sources curated for this work' });

    const fetched = await Promise.all(urls.map(u => fetchSource(u)));
    const canonical = await readJson(CANONICAL_PATH, {});
    const results = [];
    const beatIndices = single != null ? [single] : (work.beats || []).map((_, i) => i);

    const fullText = fullSoliloquyText(work);
    for (const i of beatIndices) {
      const beat = (work.beats || [])[i];
      if (!beat) { results.push({ beatIndex: i, error: 'beat not found' }); continue; }
      try {
        const prompt = buildPrompt({
          work, beat, beatIdx: i,
          beatTextStr: beatText(work, beat),
          fullText,
          sources: fetched
        });
        const raw = await callGroq(prompt);
        const parsed = parseGroqResponse(raw);
        if (parsed.extracts.length > 0) {
          canonical[beatKey(authorId, workId, i)] = {
            extracts: parsed.extracts,
            generatedAt: new Date().toISOString(),
            version: 2
          };
          results.push({ beatIndex: i, extracts: parsed.extracts });
        } else {
          results.push({ beatIndex: i, skipped: 'no relevant extracts found in sources' });
        }
      } catch (err) {
        results.push({ beatIndex: i, error: err.message });
      }
    }
    await writeAndSync(CANONICAL_PATH, canonical);
    res.json({
      success: true,
      generated: results.filter(r => r.extracts).length,
      skipped: results.filter(r => r.skipped).length,
      errors: results.filter(r => r.error).length,
      results
    });
  } catch (err) {
    console.error('admin-generate failed:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
