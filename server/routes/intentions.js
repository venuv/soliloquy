import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeAndSync } from '../persist.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const DATA_DIR = path.join(__dirname, '../data');
const ANALYTICS_DIR = path.join(DATA_DIR, 'analytics');
const SOURCES_PATH = path.join(ANALYTICS_DIR, 'intention-sources.json');
const CANONICAL_PATH = path.join(ANALYTICS_DIR, 'canonical-intentions.json');
const VOTES_PATH = path.join(ANALYTICS_DIR, 'intention-votes.json');

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
function workKey(authorId, workId) {
  return `${authorId}/${workId}`;
}

async function loadWork(authorId, workId) {
  const authorPath = path.join(DATA_DIR, 'authors', `${authorId}.json`);
  const data = JSON.parse(await fs.readFile(authorPath, 'utf-8'));
  return (data.works || []).find(w => w.id === workId) || null;
}

// Extract the text of a beat by concatenating its chunk range.
function beatText(work, beat) {
  const chunks = work.chunks || [];
  const start = beat.startChunk ?? 0;
  const end = beat.endChunk ?? chunks.length - 1;
  return chunks.slice(start, end + 1).map(c => (typeof c === 'string' ? c : c.text || '')).join(' ');
}

function fullSoliloquyText(work) {
  return (work.chunks || []).map(c => (typeof c === 'string' ? c : c.text || '')).join(' ');
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

async function callGroq(prompt, { maxTokens = 400, temperature = 0.3 } = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      reasoning_effort: 'low',
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

function buildPrompt({ work, beat, beatIdx, beatTextStr, fullText, sources }) {
  const sourceBlocks = sources
    .filter(s => s.ok)
    .map(s => `--- ${s.url} ---\n${s.text}`)
    .join('\n\n');
  return `You are annotating a Shakespeare soliloquy for a memorization app. Write ONE Stanislavsky-style "verb + object" intention for the SPECIFIC BEAT below, grounded in the retrieved passages.

Rules:
- Format: "to [verb] [object]" (lowercase 'to'), one sentence, under 25 words
- Must be grounded in the retrieved passages — do not invent psychology absent from the sources
- Cite which source URL(s) most directly supported your reading
- Speak in the character's voice-of-want, not in scholarly voice
- If the retrieved passages do not clearly support any intention for THIS beat, respond with INTENTION: null

WORK: ${work.source} (character: ${work.character})
FULL SOLILOQUY (context only, do not summarize this — focus on the beat):
${fullText}

CURRENT BEAT (beat ${beatIdx}${beat.label ? `, "${beat.label}"` : ''}):
${beatTextStr}

RETRIEVED PASSAGES:
${sourceBlocks || '(no sources retrieved successfully)'}

Respond EXACTLY in this format, nothing else:
INTENTION: <one-sentence intention or the word null>
SOURCES: <comma-separated URLs you drew from, or none>`;
}

function parseGroqResponse(text) {
  const intMatch = text.match(/INTENTION:\s*(.+?)(?:\n|$)/i);
  const srcMatch = text.match(/SOURCES:\s*(.+?)(?:\n|$)/i);
  let intention = intMatch ? intMatch[1].trim() : null;
  if (intention && /^null$/i.test(intention)) intention = null;
  const sources = srcMatch
    ? srcMatch[1].split(',').map(s => s.trim()).filter(s => s && !/^none$/i.test(s))
    : [];
  return { intention, sources };
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

// Return all beats for a work with either the canonical (generated) intention
// or the baseline (from shakespeare.json) as fallback. Includes vote tallies
// for canonical intentions and the caller's own vote if any.
router.get('/:authorId/:workId', async (req, res) => {
  try {
    const { authorId, workId } = req.params;
    const userKey = req.headers['x-user-key'] || null;
    const work = await loadWork(authorId, workId);
    if (!work) return res.status(404).json({ error: 'work not found' });

    const canonical = await readJson(CANONICAL_PATH, {});
    const votes = await readJson(VOTES_PATH, {});
    const sources = await readJson(SOURCES_PATH, {});

    const beats = (work.beats || []).map((b, i) => {
      const k = beatKey(authorId, workId, i);
      const gen = canonical[k];
      const v = votes[k] || { up: [], down: [] };
      const myVote = userKey
        ? (v.up?.includes(userKey) ? 'up' : (v.down?.includes(userKey) ? 'down' : null))
        : null;
      return {
        beatIndex: i,
        label: b.label || null,
        // Prefer generated (sourced) intention if present; fall back to baseline.
        intention: gen?.intention || b.intention || null,
        isSourced: !!gen,
        sources: gen?.sources || [],
        generatedAt: gen?.generatedAt || null,
        votes: { up: v.up?.length || 0, down: v.down?.length || 0 },
        myVote
      };
    });

    res.json({
      workId,
      authorId,
      sourceUrls: sources[workKey(authorId, workId)] || [],
      beats
    });
  } catch (err) {
    console.error('GET intentions failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Cast or clear a vote.
router.post('/:authorId/:workId/:beatIndex/vote', validateUserKey, async (req, res) => {
  try {
    const { authorId, workId, beatIndex } = req.params;
    const vote = req.body?.vote; // 'up' | 'down' | null
    if (![null, 'up', 'down'].includes(vote)) {
      return res.status(400).json({ error: 'vote must be up, down, or null' });
    }
    const votes = await readJson(VOTES_PATH, {});
    const k = beatKey(authorId, workId, Number(beatIndex));
    if (!votes[k]) votes[k] = { up: [], down: [] };
    // Remove any prior vote from this user, then add the new one.
    votes[k].up = votes[k].up.filter(u => u !== req.userKey);
    votes[k].down = votes[k].down.filter(u => u !== req.userKey);
    if (vote === 'up') votes[k].up.push(req.userKey);
    if (vote === 'down') votes[k].down.push(req.userKey);
    await writeAndSync(VOTES_PATH, votes);
    res.json({ success: true, votes: { up: votes[k].up.length, down: votes[k].down.length } });
  } catch (err) {
    console.error('vote failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Admin endpoints ----------

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
    const prompt = buildPrompt({
      work, beat, beatIdx: Number(beatIndex),
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
        if (parsed.intention) {
          canonical[beatKey(authorId, workId, i)] = {
            intention: parsed.intention,
            sources: parsed.sources,
            generatedAt: new Date().toISOString(),
            version: 1
          };
          results.push({ beatIndex: i, intention: parsed.intention, sources: parsed.sources });
        } else {
          results.push({ beatIndex: i, skipped: 'insufficient source coverage' });
        }
      } catch (err) {
        results.push({ beatIndex: i, error: err.message });
      }
    }
    await writeAndSync(CANONICAL_PATH, canonical);
    res.json({
      success: true,
      generated: results.filter(r => r.intention).length,
      skipped: results.filter(r => r.skipped).length,
      errors: results.filter(r => r.error).length,
      results
    });
  } catch (err) {
    console.error('admin-generate failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Return current beats flagged by voting: ≥ 3 downvotes AND downvote ratio > 50%.
router.get('/admin-flagged', requireAdmin, async (req, res) => {
  try {
    const votes = await readJson(VOTES_PATH, {});
    const canonical = await readJson(CANONICAL_PATH, {});
    const flagged = [];
    for (const [k, v] of Object.entries(votes)) {
      const down = v.down?.length || 0;
      const up = v.up?.length || 0;
      const total = down + up;
      if (down >= 3 && total > 0 && down / total > 0.5) {
        flagged.push({
          beatKey: k,
          up, down,
          intention: canonical[k]?.intention || null,
          sources: canonical[k]?.sources || []
        });
      }
    }
    res.json({ flagged });
  } catch (err) {
    console.error('admin-flagged failed:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
