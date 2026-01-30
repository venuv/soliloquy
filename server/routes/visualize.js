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

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_MODEL_FAST = 'llama-3.1-8b-instant'; // Faster for simple tasks

// Middleware to validate user key
async function validateKey(req, res, next) {
  const key = req.headers['x-user-key'];
  if (!key) {
    return res.status(401).json({ error: 'No key provided' });
  }

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

// Helper: Get first letter of each sentence (not each word)
const getFirstLettersOfSentences = (text) => {
  // Split by sentence-ending punctuation, including semicolons and colons for Shakespeare
  const sentences = text.split(/[.!?;:]+/).filter(s => s.trim());

  return sentences.map(sentence => {
    const trimmed = sentence.trim();
    // Get first alphabetic character
    const match = trimmed.match(/[a-zA-Z]/);
    return match ? match[0].toUpperCase() : '';
  }).filter(l => l).join('');
};

// Helper: Get full text from chunks
const getFullText = (chunks) => {
  return chunks.map(c => `${c.front} ${c.back}`).join(' ');
};

// Helper: Load work data
const loadWork = (authorId, workId) => {
  const dataPath = path.join(AUTHORS_DIR, `${authorId}.json`);
  const author = JSON.parse(readFileSync(dataPath, 'utf-8'));
  const work = author.works.find(w => w.id === workId);
  return work;
};

// Build the LLM prompt for initial word pictures generation
const buildWordPicturesPrompt = (work) => {
  const chunksText = work.chunks.map((chunk, idx) =>
    `Chunk ${idx}: "${chunk.front} ${chunk.back}"`
  ).join('\n');

  return `You are a memory coach creating PHONETIC MNEMONICS for Shakespeare memorization.

CRITICAL RULES:
1. SOUND-BASED HOOKS: Each key word must link to a similar-sounding image
   - "whether" → WEATHER vane
   - "'tis" → TISSUE paper
   - "suffer" → SURFING
   - "slings" → SLINGSHOT
   - "arrows" → actual ARROWS

2. ECONOMY OF SYMBOLS: Use 2-4 vivid images MAX per chunk. Every symbol must earn its place.

3. WORD LIMIT: Each mnemonic must be 15-25 words. No longer!

4. CHAIN THE SOUNDS: Images should connect in sequence matching word order

5. ONE BIZARRE ELEMENT: Include ONE absurd/impossible detail to make it stick

BAD EXAMPLE (too conceptual, no sound links):
"You stand on a tightrope over chocolate pudding wondering about existence"

GOOD EXAMPLE for "Whether 'tis nobler in the mind to suffer":
"A WEATHER vane made of TISSUE spins on a NOBLE knight's helmet. Inside his glass skull, he's SURFING on brain waves."
(weather='whether, tissue='tis, noble=nobler, skull=mind, surfing=suffer)

Soliloquy: "${work.title}" from ${work.source}
Character: ${work.character}

${chunksText}

Respond ONLY with valid JSON:
{
  "0": ["option1 (15-25 words)", "option2", "option3", "option4"],
  "1": ["option1 (15-25 words)", "option2", "option3", "option4"]
}

Create PHONETIC, ECONOMICAL mnemonics for all ${work.chunks.length} chunks.`;
};

// Build the reflection/improvement prompt
const buildReflectionPrompt = (work, initialPictures) => {
  const qualityRubric = `
MNEMONIC QUALITY CHECKLIST:
1. PHONETIC LINKS: Does each key word have a sound-alike image? (e.g., "suffer"→"surfing")
2. ECONOMY: Only 2-4 images total? No unnecessary clutter?
3. WORD COUNT: Between 15-25 words? (Not too long, not too short)
4. SEQUENCE: Do images chain in the same order as the text?
5. ONE ABSURDITY: Exactly one impossible/bizarre element? (Not zero, not five)
6. CONCRETE: All images are specific objects you can visualize?

FAIL if: No phonetic links, too many images, over 25 words, purely conceptual`;

  const picturesForReview = Object.entries(initialPictures).map(([idx, options]) => {
    const chunk = work.chunks[idx];
    return `Chunk ${idx}: "${chunk.front} ${chunk.back}"
Options:
  A: ${options[0]}
  B: ${options[1]}
  C: ${options[2]}
  D: ${options[3]}`;
  }).join('\n\n');

  return `You are a memory expert reviewing PHONETIC MNEMONICS for Shakespeare.

${qualityRubric}

TASK: Review each mnemonic. For ANY that fail the checklist:
- Add missing SOUND-ALIKE links for key words
- Cut excess images (keep only 2-4)
- Trim to 15-25 words
- Ensure ONE bizarre element (not more, not less)

GOOD MNEMONIC PATTERN:
"[Sound-alike 1] + [Sound-alike 2] + [ONE absurd connection] + [Sound-alike 3]"

SOLILOQUY: "${work.title}" from ${work.source}

MNEMONICS TO REVIEW:
${picturesForReview}

Respond with valid JSON. Fix weak ones, keep good ones:
{
  "0": ["fixed_A (15-25 words)", "fixed_B", "fixed_C", "fixed_D"],
  "1": ["fixed_A (15-25 words)", "fixed_B", "fixed_C", "fixed_D"]
}

Remember: PHONETIC HOOKS are mandatory. Every key word needs a sound-alike image. Economy over excess.`;
};

// Call Groq API helper
const callGroqAPI = async (prompt, apiKey, fast = false) => {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: fast ? GROQ_MODEL_FAST : GROQ_MODEL,
      messages: [{
        role: 'user',
        content: prompt
      }],
      temperature: fast ? 0.7 : 0.8,
      max_tokens: fast ? 256 : 8192,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Groq API error:', errorText);
    throw new Error(`Groq API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in Groq response');
  }

  return JSON.parse(content);
};

// GET /word-pictures/:authorId/:workId - Get work analysis and existing word pictures
router.get('/word-pictures/:authorId/:workId', validateKey, async (req, res) => {
  try {
    const { authorId, workId } = req.params;
    const work = loadWork(authorId, workId);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    const fullText = getFullText(work.chunks);
    const firstLetters = getFirstLettersOfSentences(fullText);

    // Load existing word pictures from analytics
    const content = await fs.readFile(req.analyticsPath, 'utf-8');
    const analytics = JSON.parse(content);
    const workKey = `${authorId}/${workId}`;
    const existingWordPictures = analytics.progress?.[workKey]?.wordPictures || null;

    res.json({
      work: {
        id: work.id,
        title: work.title,
        source: work.source,
        character: work.character,
        act: work.act
      },
      chunks: work.chunks.map((chunk, idx) => ({
        index: idx,
        front: chunk.front,
        back: chunk.back
      })),
      firstLetters,
      wordPictures: existingWordPictures
    });
  } catch (err) {
    console.error('Error loading word pictures:', err);
    res.status(500).json({ error: 'Failed to load word pictures' });
  }
});

// POST /generate/:authorId/:workId - Generate word pictures via Groq API (2-call: generate + reflect)
router.post('/generate/:authorId/:workId', validateKey, async (req, res) => {
  try {
    const { authorId, workId } = req.params;
    const work = loadWork(authorId, workId);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    }

    // STEP 1: Generate initial word pictures
    console.log(`[${workId}] Step 1: Generating initial word pictures...`);
    const initialPrompt = buildWordPicturesPrompt(work);
    let initialPictures;
    try {
      initialPictures = await callGroqAPI(initialPrompt, apiKey);
    } catch (err) {
      console.error('Step 1 failed:', err);
      return res.status(500).json({ error: `Generation failed: ${err.message}` });
    }

    // STEP 2: Reflect and improve for memorability
    console.log(`[${workId}] Step 2: Reflecting and improving for memorability...`);
    const reflectionPrompt = buildReflectionPrompt(work, initialPictures);
    let improvedPictures;
    try {
      improvedPictures = await callGroqAPI(reflectionPrompt, apiKey);
    } catch (err) {
      console.error('Step 2 failed, using initial pictures:', err);
      // Fall back to initial pictures if reflection fails
      improvedPictures = initialPictures;
    }

    // Save generated word pictures to analytics
    const analyticsContent = await fs.readFile(req.analyticsPath, 'utf-8');
    const analytics = JSON.parse(analyticsContent);
    const workKey = `${authorId}/${workId}`;

    if (!analytics.progress[workKey]) {
      analytics.progress[workKey] = { mastered: [], attempts: [] };
    }

    analytics.progress[workKey].wordPictures = {
      ...analytics.progress[workKey].wordPictures,
      generated: improvedPictures,
      generatedAt: new Date().toISOString()
    };

    await fs.writeFile(req.analyticsPath, JSON.stringify(analytics, null, 2));

    console.log(`[${workId}] Word pictures generated and improved successfully`);

    res.json({
      success: true,
      wordPictures: improvedPictures
    });
  } catch (err) {
    console.error('Error generating word pictures:', err);
    res.status(500).json({ error: err.message || 'Failed to generate word pictures' });
  }
});

// Build prompt for single chunk generation - BRIEF thumbnails
const buildSingleChunkPrompt = (work, chunkIndex, chunk) => {
  return `Create 3 brief mnemonic thumbnails (5-10 words each) for memorizing this Shakespeare line.

Use sound-alike images: "whether"→WEATHER, "slings"→SLINGSHOT, "suffer"→SURFING

Line: "${chunk.front} ${chunk.back}"

JSON only:
{"options":["thumb1","thumb2","thumb3"]}`;
};

// POST /generate-chunk/:authorId/:workId/:chunkIndex - Generate word picture for single chunk
router.post('/generate-chunk/:authorId/:workId/:chunkIndex', validateKey, async (req, res) => {
  try {
    const { authorId, workId, chunkIndex } = req.params;
    const idx = parseInt(chunkIndex, 10);
    const work = loadWork(authorId, workId);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    if (idx < 0 || idx >= work.chunks.length) {
      return res.status(400).json({ error: 'Invalid chunk index' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    }

    const chunk = work.chunks[idx];
    console.log(`[${workId}] Generating word picture for chunk ${idx}...`);

    const prompt = buildSingleChunkPrompt(work, idx, chunk);
    const result = await callGroqAPI(prompt, apiKey, true); // Use fast model

    // Save to analytics
    const analyticsContent = await fs.readFile(req.analyticsPath, 'utf-8');
    const analytics = JSON.parse(analyticsContent);
    const workKey = `${authorId}/${workId}`;

    if (!analytics.progress[workKey]) {
      analytics.progress[workKey] = { mastered: [], attempts: [] };
    }
    if (!analytics.progress[workKey].wordPictures) {
      analytics.progress[workKey].wordPictures = { generated: {}, selected: {} };
    }
    if (!analytics.progress[workKey].wordPictures.generated) {
      analytics.progress[workKey].wordPictures.generated = {};
    }

    analytics.progress[workKey].wordPictures.generated[idx] = result.options;
    await fs.writeFile(req.analyticsPath, JSON.stringify(analytics, null, 2));

    console.log(`[${workId}] Chunk ${idx} word picture generated`);

    res.json({
      success: true,
      chunkIndex: idx,
      options: result.options
    });
  } catch (err) {
    console.error('Error generating chunk word picture:', err);
    res.status(500).json({ error: err.message || 'Failed to generate word picture' });
  }
});

// POST /save-chunk - Save single chunk's selected word picture
router.post('/save-chunk', validateKey, async (req, res) => {
  try {
    const { authorId, workId, chunkIndex, selected, room } = req.body;
    const workKey = `${authorId}/${workId}`;

    const content = await fs.readFile(req.analyticsPath, 'utf-8');
    const analytics = JSON.parse(content);

    if (!analytics.progress[workKey]) {
      analytics.progress[workKey] = { mastered: [], attempts: [] };
    }
    if (!analytics.progress[workKey].wordPictures) {
      analytics.progress[workKey].wordPictures = { generated: {}, selected: {}, rooms: {} };
    }
    if (!analytics.progress[workKey].wordPictures.selected) {
      analytics.progress[workKey].wordPictures.selected = {};
    }
    if (!analytics.progress[workKey].wordPictures.rooms) {
      analytics.progress[workKey].wordPictures.rooms = {};
    }

    analytics.progress[workKey].wordPictures.selected[chunkIndex] = selected;
    if (room) {
      analytics.progress[workKey].wordPictures.rooms[chunkIndex] = room;
    }
    analytics.progress[workKey].wordPictures.lastEdited = new Date().toISOString();

    await fs.writeFile(req.analyticsPath, JSON.stringify(analytics, null, 2));

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving chunk word picture:', err);
    res.status(500).json({ error: 'Failed to save word picture' });
  }
});

// POST /save - Save user's selected/edited word pictures
router.post('/save', validateKey, async (req, res) => {
  try {
    const { authorId, workId, selected } = req.body;
    const workKey = `${authorId}/${workId}`;

    const content = await fs.readFile(req.analyticsPath, 'utf-8');
    const analytics = JSON.parse(content);

    if (!analytics.progress[workKey]) {
      analytics.progress[workKey] = { mastered: [], attempts: [] };
    }

    if (!analytics.progress[workKey].wordPictures) {
      analytics.progress[workKey].wordPictures = {};
    }

    analytics.progress[workKey].wordPictures.selected = selected;
    analytics.progress[workKey].wordPictures.lastEdited = new Date().toISOString();

    await fs.writeFile(req.analyticsPath, JSON.stringify(analytics, null, 2));

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving word pictures:', err);
    res.status(500).json({ error: 'Failed to save word pictures' });
  }
});

// Keep legacy analyze endpoint for backwards compatibility during transition
router.get('/analyze/:authorId/:workId', (req, res) => {
  try {
    const { authorId, workId } = req.params;
    const work = loadWork(authorId, workId);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    const fullText = getFullText(work.chunks);

    res.json({
      work: {
        id: work.id,
        title: work.title,
        source: work.source,
        character: work.character,
        act: work.act
      },
      soliloquy: {
        firstLetters: getFirstLettersOfSentences(fullText),
        wordCount: fullText.trim().split(/\s+/).length,
        chunkCount: work.chunks.length
      },
      chunks: work.chunks.map((chunk, idx) => ({
        index: idx,
        front: chunk.front,
        back: chunk.back,
        firstLetters: getFirstLettersOfSentences(`${chunk.front} ${chunk.back}`),
        wordCount: `${chunk.front} ${chunk.back}`.trim().split(/\s+/).length
      })),
      fullText
    });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

export default router;
