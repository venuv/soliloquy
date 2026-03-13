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

// Helper: Build 2D grid of word initials from chunks
// Each row = one chunk (front + back). Each cell = first letter + trailing punctuation.
const getWordInitialGrid = (chunks) => {
  return chunks.map(chunk => {
    const fullLine = `${chunk.front} ${chunk.back}`;
    // Split on whitespace, then extract first alpha char + trailing punctuation per token
    const tokens = fullLine.split(/\s+/).filter(t => t);
    return tokens.map(token => {
      const alphaMatch = token.match(/[a-zA-Z]/);
      if (!alphaMatch) return token; // pure punctuation like em-dashes
      const idx = alphaMatch.index;
      const firstChar = alphaMatch[0];
      const leadingPunct = token.slice(0, idx); // e.g. opening quote '
      const trailingPunct = token.slice(idx + 1).replace(/[a-zA-Z'']/g, ''); // strip remaining letters, keep punct
      return leadingPunct + firstChar + trailingPunct;
    });
  });
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

// Helper: Find the beat containing a given chunk index
const findBeatForChunk = (work, chunkIndex) => {
  if (!work.beats) return null;
  return work.beats.find(b => chunkIndex >= b.startChunk && chunkIndex <= b.endChunk) || null;
};

// Build prompt to generate dramatic context for the whole soliloquy
const buildDramaticContextPrompt = (work) => {
  const fullText = work.chunks.map(c => `${c.front} ${c.back}`).join('\n');

  return `You are a Shakespeare dramaturg. Provide the dramatic context for this soliloquy using Stanislavski's system.

Play: ${work.source}
Character: ${work.character}
Act/Scene: ${work.act}
Soliloquy: "${work.title}"

Full text:
${fullText}

Respond with valid JSON:
{
  "given_circumstances": "What has just happened? What event or conversation triggers this speech? (2-3 sentences)",
  "super_objective": "What does ${work.character} desperately WANT across the whole soliloquy? State as an active verb: 'To...' (1 sentence)",
  "who_am_i_speaking_to": "Who is the character addressing — themselves, God, the audience, an absent person? (1 sentence)",
  "stakes": "What happens if the character fails to resolve this? What is at risk? (1 sentence)",
  "emotional_arc": "How does the emotional state shift from beginning to end? (1 sentence)"
}`;
};

// Build the Stanislavski mnemonic prompt for all chunks
const buildWordPicturesPrompt = (work, dramaticContext) => {
  const chunksText = work.chunks.map((chunk, idx) => {
    const beat = findBeatForChunk(work, idx);
    const beatInfo = beat ? ` [Beat: "${beat.label}" — ${beat.intention}]` : '';
    return `Chunk ${idx}: "${chunk.front} ${chunk.back}"${beatInfo}`;
  }).join('\n');

  return `You are an acting coach helping an actor MEMORIZE Shakespeare using Stanislavski's method.

THE PRINCIPLE: Each line exists because the character NEEDS something. When you feel what the character feels, the words become inevitable. Create a vivid, physically felt image that captures the EMOTIONAL INTENTION of each line, anchored to 2-3 KEY WORDS from the text.

DRAMATIC CONTEXT:
- Given circumstances: ${dramaticContext.given_circumstances}
- Super-objective: ${dramaticContext.super_objective}
- Speaking to: ${dramaticContext.who_am_i_speaking_to}
- Stakes: ${dramaticContext.stakes}
- Emotional arc: ${dramaticContext.emotional_arc}

RULES:
1. FEEL FIRST: What does ${work.character} physically FEEL saying this line? Gut-clench, chest-tightness, jaw-set, hands-shaking?
2. ANCHOR TO KEY WORDS: Pick 2-3 words from the line. Build your image around them.
3. SENSORY & VISCERAL: Taste, smell, temperature, muscle tension. Not abstract concepts.
4. EXAGGERATE: Amplify the emotion 10x. If there's fear, make it terror. If there's resolve, make it volcanic.
5. 15-25 WORDS per mnemonic. Tight, vivid, physical.

BAD (too abstract, no body):
"Hamlet contemplates the philosophical question of existence versus non-existence"

GOOD for "Whether 'tis nobler in the mind to suffer":
"Jaw clenched, holding a red-hot coal in each fist — do I SUFFER the burning or hurl them into the dark?"

GOOD for "The slings and arrows of outrageous fortune":
"Arrows thud into your back, one after another. You stagger but won't kneel. Fortune laughs from above, reloading."

Soliloquy: "${work.title}" from ${work.source}
Character: ${work.character}

${chunksText}

Respond ONLY with valid JSON:
{
  "0": ["option1 (15-25 words)", "option2", "option3"],
  "1": ["option1 (15-25 words)", "option2", "option3"]
}

Create VISCERAL, EMOTIONALLY-ANCHORED mnemonics for all ${work.chunks.length} chunks.`;
};

// Build the reflection/improvement prompt
const buildReflectionPrompt = (work, initialPictures, dramaticContext) => {
  const picturesForReview = Object.entries(initialPictures).map(([idx, options]) => {
    const chunk = work.chunks[idx];
    const beat = findBeatForChunk(work, parseInt(idx));
    const beatInfo = beat ? ` [Intention: ${beat.intention}]` : '';
    return `Chunk ${idx}: "${chunk.front} ${chunk.back}"${beatInfo}
Options:
  A: ${options[0]}
  B: ${options[1]}
  C: ${options[2]}`;
  }).join('\n\n');

  return `You are a Stanislavski-trained acting coach reviewing mnemonics for Shakespeare memorization.

QUALITY CHECKLIST:
1. PHYSICAL SENSATION: Does the mnemonic make you FEEL something in your body? (gut, chest, hands, jaw)
2. KEY WORD ANCHORS: Are 2-3 actual words from the line woven into the image?
3. EMOTIONAL TRUTH: Does it capture what ${work.character} WANTS in this moment?
4. SPECIFICITY: Concrete sensory details, not abstract ideas?
5. BREVITY: 15-25 words? Tight and vivid?

FAIL if: Purely intellectual, no physical sensation, no key words from the text, over 25 words.

Character's super-objective: ${dramaticContext.super_objective}
Stakes: ${dramaticContext.stakes}

MNEMONICS TO REVIEW:
${picturesForReview}

For any that fail: rewrite with more BODY, more FEELING, more SPECIFICITY.
Keep ones that already work.

Respond with valid JSON:
{
  "0": ["fixed_A (15-25 words)", "fixed_B", "fixed_C"],
  "1": ["fixed_A (15-25 words)", "fixed_B", "fixed_C"]
}`;
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

// Helper: Get or generate dramatic context for a work (cached in analytics)
const getOrGenerateDramaticContext = async (work, analyticsPath, workKey, apiKey) => {
  const content = await fs.readFile(analyticsPath, 'utf-8');
  const analytics = JSON.parse(content);

  // Check cache
  const cached = analytics.progress?.[workKey]?.dramaticContext;
  if (cached) return cached;

  // Generate via LLM
  console.log(`[${work.id}] Generating dramatic context...`);
  const prompt = buildDramaticContextPrompt(work);
  const context = await callGroqAPI(prompt, apiKey);

  // Cache it
  if (!analytics.progress[workKey]) {
    analytics.progress[workKey] = { mastered: [], attempts: [] };
  }
  analytics.progress[workKey].dramaticContext = context;
  await fs.writeFile(analyticsPath, JSON.stringify(analytics, null, 2));

  return context;
};

// GET /word-pictures/:authorId/:workId - Get work analysis and existing word pictures
router.get('/word-pictures/:authorId/:workId', validateKey, async (req, res) => {
  try {
    const { authorId, workId } = req.params;
    const work = loadWork(authorId, workId);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    const wordInitialGrid = getWordInitialGrid(work.chunks);

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
      wordInitialGrid,
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

    // STEP 0: Get or generate dramatic context
    const workKey = `${authorId}/${workId}`;
    let dramaticContext;
    try {
      dramaticContext = await getOrGenerateDramaticContext(work, req.analyticsPath, workKey, apiKey);
    } catch (err) {
      console.error('Dramatic context generation failed:', err);
      dramaticContext = { given_circumstances: '', super_objective: '', who_am_i_speaking_to: '', stakes: '', emotional_arc: '' };
    }

    // STEP 1: Generate initial word pictures with Stanislavski method
    console.log(`[${workId}] Step 1: Generating Stanislavski mnemonics...`);
    const initialPrompt = buildWordPicturesPrompt(work, dramaticContext);
    let initialPictures;
    try {
      initialPictures = await callGroqAPI(initialPrompt, apiKey);
    } catch (err) {
      console.error('Step 1 failed:', err);
      return res.status(500).json({ error: `Generation failed: ${err.message}` });
    }

    // STEP 2: Reflect and improve for emotional truth
    console.log(`[${workId}] Step 2: Reflecting and improving...`);
    const reflectionPrompt = buildReflectionPrompt(work, initialPictures, dramaticContext);
    let improvedPictures;
    try {
      improvedPictures = await callGroqAPI(reflectionPrompt, apiKey);
    } catch (err) {
      console.error('Step 2 failed, using initial pictures:', err);
      improvedPictures = initialPictures;
    }

    // Save generated word pictures to analytics
    const analyticsContent = await fs.readFile(req.analyticsPath, 'utf-8');
    const analytics = JSON.parse(analyticsContent);

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

// Build prompt for single chunk generation - Stanislavski method
const buildSingleChunkPrompt = (work, chunkIndex, chunk, dramaticContext) => {
  const beat = findBeatForChunk(work, chunkIndex);
  const beatInfo = beat ? `\nBeat: "${beat.label}" — ${beat.intention}` : '';
  const contextInfo = dramaticContext
    ? `\nGiven circumstances: ${dramaticContext.given_circumstances}\n${work.character}'s super-objective: ${dramaticContext.super_objective}\nStakes: ${dramaticContext.stakes}\nSpeaking to: ${dramaticContext.who_am_i_speaking_to}`
    : '';

  // Get surrounding chunks for sequence context
  const prevChunk = chunkIndex > 0 ? work.chunks[chunkIndex - 1] : null;
  const nextChunk = chunkIndex < work.chunks.length - 1 ? work.chunks[chunkIndex + 1] : null;
  const prevLine = prevChunk ? `Previous line: "${prevChunk.front} ${prevChunk.back}"` : 'This is the FIRST line of the speech.';
  const nextLine = nextChunk ? `Next line: "${nextChunk.front} ${nextChunk.back}"` : 'This is the LAST line of the speech.';

  return `You are a Stanislavski-trained acting coach helping someone MEMORIZE this Shakespeare line. You use Stanislavski's system: an actor remembers lines not by rote, but by understanding what the character NEEDS, FEELS, and DOES at each moment. The words become the only possible thing to say.

DRAMATIC CONTEXT:
${contextInfo}${beatInfo}

${prevLine}
THIS LINE: "${chunk.front} ${chunk.back}"
${nextLine}

Provide two things:

1. ACTION: What is ${work.character} DOING with this specific line? Not what it means — what is the character's immediate physical/emotional action? Use an active verb. Write it as a direction to the performer: "You are [doing X]." One to two sentences, visceral and specific. Include WHY this line follows the previous one — what inner need drives the character from that thought to this one.

2. ANCHORS: Pick 2-3 KEY WORDS from the line that carry the most weight. For each, describe what ${work.character} physically FEELS when saying that word — not a dictionary definition, but the sensory/emotional charge the word carries IN THIS MOMENT for this character. Use Stanislavski's sense memory: temperature, texture, muscle tension, taste, pressure.

JSON only:
{
  "action": "You are [doing what]... [why this follows the previous line]",
  "anchors": [
    {"word": "keyword1", "sense": "what the character physically feels saying this word (10-15 words)"},
    {"word": "keyword2", "sense": "physical/sensory charge of this word (10-15 words)"}
  ]
}`;
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
    const workKey = `${authorId}/${workId}`;
    console.log(`[${workId}] Generating Stanislavski mnemonic for chunk ${idx}...`);

    // Get dramatic context (cached)
    let dramaticContext = null;
    try {
      dramaticContext = await getOrGenerateDramaticContext(work, req.analyticsPath, workKey, apiKey);
    } catch (err) {
      console.error('Dramatic context failed, proceeding without:', err);
    }

    const prompt = buildSingleChunkPrompt(work, idx, chunk, dramaticContext);
    const result = await callGroqAPI(prompt, apiKey); // Use full model for quality

    // Save to analytics
    const analyticsContent = await fs.readFile(req.analyticsPath, 'utf-8');
    const analytics = JSON.parse(analyticsContent);

    if (!analytics.progress[workKey]) {
      analytics.progress[workKey] = { mastered: [], attempts: [] };
    }
    if (!analytics.progress[workKey].wordPictures) {
      analytics.progress[workKey].wordPictures = { generated: {}, selected: {} };
    }
    if (!analytics.progress[workKey].wordPictures.generated) {
      analytics.progress[workKey].wordPictures.generated = {};
    }

    // Store the Stanislavski action note (new format: {action, anchors})
    analytics.progress[workKey].wordPictures.generated[idx] = result;
    await fs.writeFile(req.analyticsPath, JSON.stringify(analytics, null, 2));

    console.log(`[${workId}] Chunk ${idx} Stanislavski action note generated`);

    res.json({
      success: true,
      chunkIndex: idx,
      actionNote: result
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
        wordInitialGrid: getWordInitialGrid(work.chunks),
        wordCount: fullText.trim().split(/\s+/).length,
        chunkCount: work.chunks.length
      },
      chunks: work.chunks.map((chunk, idx) => ({
        index: idx,
        front: chunk.front,
        back: chunk.back,
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
