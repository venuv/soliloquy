import express from 'express';
import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const ANALYTICS_DIR = path.join(__dirname, '../data/analytics');
const AUTHORS_DIR = path.join(__dirname, '../data/authors');

const GROQ_LLM_URL = 'https://api.groq.com/openai/v1/chat/completions';
const LLM_MODEL = 'llama-3.3-70b-versatile';

// Middleware to validate user key
async function validateKey(req, res, next) {
  const key = req.headers['x-user-key'];
  if (!key) return res.status(401).json({ error: 'No key provided' });

  const analyticsPath = path.join(ANALYTICS_DIR, `${key}.json`);
  try {
    await fs.access(analyticsPath);
    req.userKey = key;
    req.analyticsPath = analyticsPath;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid key' });
  }
}

// Load author data
function loadAuthor(authorId) {
  const dataPath = path.join(AUTHORS_DIR, `${authorId}.json`);
  return JSON.parse(readFileSync(dataPath, 'utf-8'));
}

// Save author data
async function saveAuthor(authorId, data) {
  const dataPath = path.join(AUTHORS_DIR, `${authorId}.json`);
  await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
}

// Call Groq LLM
async function callGroqLLM(systemPrompt, userPrompt, apiKey, temperature = 0.3) {
  const response = await fetch(GROQ_LLM_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Groq LLM error:', errText);
    throw new Error(`Groq LLM error ${response.status}`);
  }

  const result = await response.json();
  return JSON.parse(result.choices[0].message.content);
}

// Validate beats cover all chunks contiguously
function validateBeats(beats, chunkCount) {
  if (!Array.isArray(beats) || beats.length === 0) {
    return { valid: false, error: 'Beats array is empty' };
  }

  // Sort by startChunk
  const sorted = [...beats].sort((a, b) => a.startChunk - b.startChunk);

  // Check first beat starts at 0
  if (sorted[0].startChunk !== 0) {
    return { valid: false, error: `First beat starts at ${sorted[0].startChunk}, expected 0` };
  }

  // Check last beat ends at chunkCount - 1
  if (sorted[sorted.length - 1].endChunk !== chunkCount - 1) {
    return { valid: false, error: `Last beat ends at ${sorted[sorted.length - 1].endChunk}, expected ${chunkCount - 1}` };
  }

  // Check contiguity
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startChunk !== sorted[i - 1].endChunk + 1) {
      return { valid: false, error: `Gap or overlap between beat ${i - 1} and ${i}` };
    }
  }

  // Check each beat has required fields
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    if (!b.label || !b.intention) {
      return { valid: false, error: `Beat ${i} missing label or intention` };
    }
    if (b.startChunk > b.endChunk) {
      return { valid: false, error: `Beat ${i} has startChunk > endChunk` };
    }
  }

  return { valid: true, beats: sorted.map((b, i) => ({ ...b, id: i })) };
}

const GENERATOR_PROMPT = `You are an expert Shakespeare acting coach trained in Stanislavski's method of "bits and tasks" (beat analysis). Given a soliloquy, segment it into dramatic beats.

In Stanislavski's system, a BEAT is a unit of action defined by a single OBJECTIVE — what the character is actively trying to do. A new beat begins when the character's ACTIVE VERB changes:
- The character shifts tactic (e.g., from persuading to threatening)
- The character's objective changes (e.g., from questioning to resolving)
- A new line of argument or reasoning begins
- There is a rhetorical pivot signaling a change in direction

The active verb must be TRANSITIVE and PLAYABLE — something an actor can do moment to moment (e.g., "to convince himself that death is preferable", not "sadness" or "contemplation").

Rules:
- Every chunk must belong to exactly one beat
- Beats must be contiguous (no gaps or overlaps)
- Typically 3-7 beats per soliloquy
- Each beat label should be evocative (2-4 words)
- Each intention MUST be phrased as an active objective starting with "To..." (e.g., "To steel himself for action", "To catalogue life's injustices")

Respond with JSON only:
{
  "beats": [
    { "label": "short evocative name", "intention": "To [active verb] ...", "startChunk": 0, "endChunk": 4 }
  ]
}`;

const CRITIC_PROMPT = `You are a master acting teacher trained in Stanislavski's system of beat analysis and Declan Donnellan's approach to actioning. You are reviewing beat divisions for a Shakespeare soliloquy.

Apply these tests to each proposed beat:

ACTIONING TEST — Can each beat be played with a single active verb?
- The intention must be a transitive, playable action ("To persuade", "To warn", "To mock") — not a state ("Feeling sad") or theme ("Death imagery")
- If a beat contains two distinct playable actions, it should be split
- If two adjacent beats share the same playable action, they should be merged
- Intentions MUST start with "To..." and use a specific active verb

BOUNDARY TEST — Does the beat change where the text actually pivots?
- Look for rhetorical markers: "But", "Yet", "For", "O", "No", dashes, colons
- Look for shifts in who/what is being addressed (self, audience, God, absent person)
- Look for shifts in tense (past reflection vs present resolve vs future fear)
- A beat boundary mid-sentence is suspicious unless the sentence itself pivots

PROPORTION TEST — Are beats reasonably sized?
- A single-chunk beat is valid only if it's a genuine pivot point (e.g., "Ay, there's the rub")
- A beat spanning 10+ chunks likely contains multiple actions
- Short soliloquies (8-10 chunks) typically have 3-5 beats; longer ones (25-35) have 5-7

If the beats pass all three tests, return them unchanged. If corrections are needed, return corrected beats with notes explaining each change.

Respond with JSON only:
{
  "approved": true/false,
  "notes": "Brief explanation of any changes made",
  "beats": [...]
}`;

// Generate beats for a work using two-pass LLM pipeline
async function generateBeatsForWork(work, apiKey) {
  const fullText = work.chunks
    .map((c, i) => `[${i}] ${c.front} ${c.back}`)
    .join('\n');

  const chunkCount = work.chunks.length;

  // Pass 1: Generate
  const userPrompt = `Soliloquy: "${work.title}"
Character: ${work.character}, Play: ${work.source}, ${work.act}
Total chunks: ${chunkCount} (indices 0 to ${chunkCount - 1})

CRITICAL: The first beat MUST have startChunk: 0. The last beat MUST have endChunk: ${chunkCount - 1}. Beats must be contiguous with no gaps.

Full text with chunk indices:
${fullText}

Segment this into dramatic beats. Each beat is a range of chunk indices [startChunk, endChunk] (inclusive).`;

  console.log(`[beats] Generating beats for "${work.title}" (${chunkCount} chunks)...`);

  // Generate with retry
  let genValidation = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const generated = await callGroqLLM(GENERATOR_PROMPT, userPrompt, apiKey, 0.3);
    if (!generated.beats) continue;
    genValidation = validateBeats(generated.beats, chunkCount);
    if (genValidation.valid) break;
    console.warn(`[beats] Attempt ${attempt + 1} invalid: ${genValidation.error}`);
    genValidation = null;
  }

  if (!genValidation || !genValidation.valid) {
    throw new Error('Generator failed to produce valid beats after 2 attempts');
  }

  // Pass 2: Critic verification
  const criticPrompt = `Soliloquy: "${work.title}"
Character: ${work.character}, Play: ${work.source}, ${work.act}
Total chunks: ${chunkCount}

Full text with chunk indices:
${fullText}

Proposed beats:
${JSON.stringify(genValidation.beats, null, 2)}

Review these beat divisions. Return corrected beats if needed, or approve them.`;

  console.log(`[beats] Running critic verification...`);
  const criticized = await callGroqLLM(CRITIC_PROMPT, criticPrompt, apiKey, 0.2);

  const finalBeats = criticized.beats || genValidation.beats;
  const finalValidation = validateBeats(finalBeats, chunkCount);

  if (!finalValidation.valid) {
    console.warn(`[beats] Critic produced invalid beats: ${finalValidation.error}, using generator output`);
    return { beats: genValidation.beats, notes: 'Critic validation failed, using generator output' };
  }

  return {
    beats: finalValidation.beats,
    notes: criticized.notes || (criticized.approved ? 'Approved without changes' : 'Modified by critic')
  };
}

// POST /generate/:authorId/:workId — Generate beats and save to shared data
router.post('/generate/:authorId/:workId', validateKey, async (req, res) => {
  try {
    const { authorId, workId } = req.params;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

    const author = loadAuthor(authorId);
    const work = author.works.find(w => w.id === workId);
    if (!work) return res.status(404).json({ error: 'Work not found' });

    const result = await generateBeatsForWork(work, apiKey);

    // Save to shared data
    work.beats = result.beats;
    await saveAuthor(authorId, author);

    console.log(`[beats] Saved ${result.beats.length} beats for "${work.title}": ${result.notes}`);

    res.json({
      success: true,
      beats: result.beats,
      notes: result.notes
    });
  } catch (err) {
    console.error('Beat generation error:', err);
    res.status(500).json({ error: err.message || 'Beat generation failed' });
  }
});

// GET /:authorId/:workId — Get beats for a work (user overrides take priority)
router.get('/:authorId/:workId', validateKey, async (req, res) => {
  try {
    const { authorId, workId } = req.params;

    // Check for user overrides first
    const content = await fs.readFile(req.analyticsPath, 'utf-8');
    const analytics = JSON.parse(content);
    const workKey = `${authorId}/${workId}`;
    const overrides = analytics.progress?.[workKey]?.beatOverrides;

    if (overrides) {
      return res.json({ beats: overrides, source: 'user' });
    }

    // Fall back to shared data
    const author = loadAuthor(authorId);
    const work = author.works.find(w => w.id === workId);
    if (!work) return res.status(404).json({ error: 'Work not found' });

    if (!work.beats) {
      return res.json({ beats: null, source: 'none' });
    }

    res.json({ beats: work.beats, source: 'default' });
  } catch (err) {
    console.error('Beat fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch beats' });
  }
});

export { generateBeatsForWork, validateBeats };
export default router;
