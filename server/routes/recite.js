import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const ANALYTICS_DIR = path.join(__dirname, '../data/analytics');
const AUTHORS_DIR = path.join(__dirname, '../data/authors');

const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_LLM_URL = 'https://api.groq.com/openai/v1/chat/completions';
const LLM_MODEL = 'llama-3.3-70b-versatile';

// Multer: memory storage, 25MB limit (Whisper max), audio only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) cb(null, true);
    else cb(new Error('Only audio files accepted'), false);
  }
});

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

// Load work helper
const loadWork = (authorId, workId) => {
  const dataPath = path.join(AUTHORS_DIR, `${authorId}.json`);
  const author = JSON.parse(readFileSync(dataPath, 'utf-8'));
  return author.works.find(w => w.id === workId);
};

// --- Call Groq Whisper API ---
async function transcribeAudio(audioBuffer, mimetype, apiKey) {
  const file = new File([audioBuffer], 'recitation.webm', { type: mimetype });
  const form = new FormData();
  form.append('file', file);
  form.append('model', 'whisper-large-v3');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('language', 'en');

  const response = await fetch(GROQ_WHISPER_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: form
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Whisper API error:', errText);
    throw new Error(`Whisper API error ${response.status}`);
  }

  return response.json();
}

// --- Format poem chunks with word numbering for LLM ---
function formatPoemForAnalysis(chunks) {
  return chunks.map((chunk, idx) => {
    const fullLine = `${chunk.front} ${chunk.back}`;
    const words = fullLine.split(/\s+/).filter(w => w);
    const numbered = words.map((w, i) => `${w}[${i + 1}]`).join(' ');
    return `Line ${idx + 1} (${words.length} words): ${numbered}`;
  }).join('\n');
}

// --- Format Whisper transcript with timestamps ---
function formatTranscriptForAnalysis(whisperResult) {
  const words = whisperResult.words || [];
  const timestamped = words.map(w =>
    `${w.start.toFixed(2)}s-${w.end.toFixed(2)}s: "${w.word}"`
  ).join('\n');
  return {
    fullText: whisperResult.text || '',
    wordTimestamps: timestamped,
    duration: whisperResult.duration || 0
  };
}

// --- Three analyst system prompts ---

const ACCURACY_PROMPT = `You are a textual accuracy analyst comparing a memorized recitation against the original poem.

Compare the reciter's transcript word-by-word against the original and identify:
- SUBSTITUTION: They said a different word than expected (e.g. "fortune" instead of "question")
- OMISSION: They skipped words or entire lines
- ADDITION: They inserted words not in the original

Important:
- The reciter may not have completed the full poem. Do NOT mark unrecited trailing lines as omissions.
- Compare against the full original only up to where the reciter stopped.
- Minor pronunciation differences captured by Whisper (e.g. "'tis" vs "tis") are NOT errors.
- Word numbers in brackets [n] refer to position within that line.

For each trouble spot provide: line (1-indexed), word (1-indexed position in that line), type, expected, heard (null for omissions), severity (0.0-1.0).

Respond with JSON only:
{
  "troubleSpots": [
    { "line": 1, "word": 9, "type": "substitution", "expected": "question", "heard": "fortune", "severity": 0.9 }
  ],
  "summary": "One sentence assessment of textual accuracy"
}`;

const FLUENCY_PROMPT = `You are a fluency analyst evaluating a memorized poem recitation for signs of uncertainty, using word-level timestamps.

Identify:
- HESITATION: Unnatural pauses suggesting the reciter forgot or was unsure.
  - A pause AFTER punctuation (comma, period, semicolon, colon, exclamation, question mark, dash) or at a line/stanza break is likely intentional — do NOT flag these.
  - A pause mid-phrase with no punctuation justification suggests memory difficulty — flag these.
  - Even after punctuation, a gap over 5 seconds likely indicates a memory lapse.
- STUMBLE: The reciter repeated words, self-corrected, backtracked, or showed verbal uncertainty.
- FILLER: "um", "uh", "er", or similar filler words indicating uncertainty.

Use the timestamps to measure gaps between words. Normal speech has ~0.1-0.4s gaps. Gaps >1.5s mid-phrase are suspicious. Gaps >3s mid-phrase are almost certainly memory lapses.

For each trouble spot: line, word (position of the word AFTER the gap or the stumbled word), type, expected, heard, gapSeconds (for hesitations), severity (0.0-1.0).

Respond with JSON only:
{
  "troubleSpots": [
    { "line": 3, "word": 1, "type": "hesitation", "expected": "Whether", "heard": "Whether", "gapSeconds": 3.2, "severity": 0.7 }
  ],
  "summary": "One sentence assessment of recitation fluency"
}`;

const DRAMA_COACH_PROMPT = `You are a drama coach evaluating a memorized Shakespeare recitation. You understand iambic pentameter, caesura, and dramatic pacing.

Your unique perspective: some pauses and emphases are GOOD performance choices, not errors. Evaluate:
- Which pauses are dramatically appropriate vs memory lapses?
- Where does pacing suggest confidence vs uncertainty?
- Are there substitutions that reveal the reciter doesn't understand the meaning?

Identify ONLY genuine trouble spots where the reciter struggles with MEMORY or COMPREHENSION:
- HESITATION: Memory-lapse pause (NOT a dramatic pause — consider punctuation, meter, and dramatic context)
- SUBSTITUTION: Wrong word that changes or obscures meaning
- OMISSION: Skipped content suggesting a memory gap
- STUMBLE: Self-correction or verbal fumbling

Do NOT flag: dramatic pauses at natural breaks, minor pronunciation variations, artistic interpretation choices.

Also note any praiseworthy dramatic pauses that show good instinct.

For each trouble spot: line, word, type, expected, heard, severity (0.0-1.0), note (brief coaching observation).

Respond with JSON only:
{
  "troubleSpots": [
    { "line": 5, "word": 3, "type": "hesitation", "expected": "slings", "heard": "slings", "severity": 0.6, "note": "Paused mid-line suggesting uncertainty about 'slings and arrows'" }
  ],
  "dramaticPauses": [
    { "line": 1, "afterWord": 6, "seconds": 2.1, "note": "Good caesura after 'to be,'" }
  ],
  "summary": "One sentence coaching assessment"
}`;

// --- Call Groq LLM ---
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
  try {
    return JSON.parse(result.choices[0].message.content);
  } catch (e) {
    console.error('Failed to parse LLM JSON:', result.choices[0].message.content);
    return { troubleSpots: [], summary: 'Analysis parse error' };
  }
}

// --- Run triple LLM analysis ---
async function runTripleAnalysis(chunks, whisperResult, apiKey) {
  const poemText = formatPoemForAnalysis(chunks);
  const { fullText, wordTimestamps, duration } = formatTranscriptForAnalysis(whisperResult);

  const userPrompt = `ORIGINAL POEM (word positions in brackets):
${poemText}

RECITER'S TRANSCRIPT:
"${fullText}"

WORD-LEVEL TIMESTAMPS:
${wordTimestamps}

TOTAL DURATION: ${duration.toFixed(1)} seconds

Analyze this recitation and identify trouble spots as JSON.`;

  // Three analysts in parallel with different temperatures
  const results = await Promise.allSettled([
    callGroqLLM(ACCURACY_PROMPT, userPrompt, apiKey, 0.2),
    callGroqLLM(FLUENCY_PROMPT, userPrompt, apiKey, 0.3),
    callGroqLLM(DRAMA_COACH_PROMPT, userPrompt, apiKey, 0.4)
  ]);

  const labels = ['accuracy', 'fluency', 'drama'];
  const analyses = [];
  const summaries = {};

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      analyses.push(result.value);
      summaries[labels[i]] = result.value.summary || '';
      console.log(`[recite] ${labels[i]}: ${result.value.troubleSpots?.length || 0} spots`);
    } else {
      console.error(`[recite] ${labels[i]} analyst failed:`, result.reason?.message);
      summaries[labels[i]] = 'Analysis failed';
    }
  });

  // Need at least 1 successful analysis
  if (analyses.length === 0) {
    throw new Error('All three analysts failed');
  }

  // Quorum threshold: 2 if we have 3, else 1 if we only have 1-2
  const quorum = analyses.length >= 3 ? 2 : 1;
  const consensus = buildConsensus(analyses, quorum);

  // Collect dramatic pauses from drama coach
  const dramaResult = results[2]?.status === 'fulfilled' ? results[2].value : null;
  const dramaticPauses = dramaResult?.dramaticPauses || [];

  return { consensus, summaries, dramaticPauses };
}

// --- Build consensus from multiple analyses ---
function buildConsensus(analyses, quorum = 2) {
  const spotMap = {};

  analyses.forEach((analysis, analystIdx) => {
    (analysis.troubleSpots || []).forEach(spot => {
      // Convert 1-indexed to 0-indexed
      const chunkIdx = (spot.line || 1) - 1;
      const wordInChunk = (spot.word || 1) - 1;
      const key = `${chunkIdx}:${wordInChunk}`;

      if (!spotMap[key]) {
        spotMap[key] = {
          chunkIdx,
          wordInChunk,
          expected: spot.expected || '',
          heard: spot.heard || null,
          types: [],
          severities: [],
          notes: [],
          analysts: new Set(),
          gapSeconds: null
        };
      }

      spotMap[key].analysts.add(analystIdx);
      spotMap[key].types.push(spot.type);
      spotMap[key].severities.push(spot.severity || 0.5);
      if (spot.note) spotMap[key].notes.push(spot.note);
      if (spot.gapSeconds) spotMap[key].gapSeconds = spot.gapSeconds;
      // Prefer non-null heard values
      if (spot.heard && !spotMap[key].heard) spotMap[key].heard = spot.heard;
    });
  });

  // Keep spots meeting quorum
  return Object.values(spotMap)
    .filter(spot => spot.analysts.size >= quorum)
    .map(spot => ({
      chunkIdx: spot.chunkIdx,
      wordInChunk: spot.wordInChunk,
      type: mostCommon(spot.types),
      expected: spot.expected,
      heard: spot.heard,
      severity: Math.max(...spot.severities),
      confidence: spot.analysts.size / analyses.length,
      note: spot.notes[0] || undefined,
      gapSeconds: spot.gapSeconds || undefined
    }))
    .sort((a, b) => a.chunkIdx - b.chunkIdx || a.wordInChunk - b.wordInChunk);
}

function mostCommon(arr) {
  const counts = {};
  arr.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// --- Aggregate trouble spots across recent recitations ---
function aggregateTroubleSpots(recitations, lastN = 3) {
  const recent = recitations.slice(-lastN);
  if (recent.length === 0) return [];

  const spotMap = {};
  recent.forEach(rec => {
    (rec.troubleSpots || []).forEach(spot => {
      const key = `${spot.chunkIdx}:${spot.wordInChunk}`;
      if (!spotMap[key]) {
        spotMap[key] = {
          chunkIdx: spot.chunkIdx,
          wordInChunk: spot.wordInChunk,
          word: spot.expected || spot.beforeWord || '',
          count: 0,
          types: [],
          notes: []
        };
      }
      spotMap[key].count++;
      spotMap[key].types.push(spot.type);
      if (spot.note) spotMap[key].notes.push(spot.note);
    });
  });

  const totalAttempts = recent.length;
  return Object.values(spotMap).map(spot => ({
    ...spot,
    severity: spot.count / totalAttempts,
    dominantType: mostCommon(spot.types)
  }));
}

// POST /transcribe/:authorId/:workId
router.post('/transcribe/:authorId/:workId', validateKey, upload.single('audio'), async (req, res) => {
  try {
    const { authorId, workId } = req.params;
    const work = loadWork(authorId, workId);
    if (!work) return res.status(404).json({ error: 'Work not found' });
    if (!req.file) return res.status(400).json({ error: 'No audio file' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

    // 1. Transcribe via Groq Whisper
    console.log(`[recite] Transcribing ${req.file.size} bytes for ${workId}...`);
    const whisperResult = await transcribeAudio(req.file.buffer, req.file.mimetype, apiKey);
    console.log(`[recite] Transcript: ${(whisperResult.text || '').slice(0, 80)}...`);

    // 2. Run triple LLM analysis (3 analysts in parallel)
    console.log(`[recite] Running triple analysis (accuracy, fluency, drama coach)...`);
    const analysis = await runTripleAnalysis(work.chunks, whisperResult, apiKey);

    // 3. Build stats
    const troubleSpots = analysis.consensus;
    const totalWords = work.chunks.reduce((sum, c) =>
      sum + `${c.front} ${c.back}`.split(/\s+/).filter(w => w).length, 0);

    const stats = {
      totalWords,
      troubleSpotCount: troubleSpots.length,
      substitutions: troubleSpots.filter(s => s.type === 'substitution').length,
      omissions: troubleSpots.filter(s => s.type === 'omission').length,
      hesitations: troubleSpots.filter(s => s.type === 'hesitation').length,
      stumbles: troubleSpots.filter(s => s.type === 'stumble' || s.type === 'filler').length,
      unanimousSpots: troubleSpots.filter(s => s.confidence >= 1).length
    };

    // 4. Store in analytics
    const content = await fs.readFile(req.analyticsPath, 'utf-8');
    const analytics = JSON.parse(content);
    const workKey = `${authorId}/${workId}`;

    if (!analytics.progress[workKey]) {
      analytics.progress[workKey] = { mastered: [], attempts: [] };
    }
    if (!analytics.progress[workKey].recitations) {
      analytics.progress[workKey].recitations = [];
    }

    const recitationRecord = {
      timestamp: new Date().toISOString(),
      duration: whisperResult.duration || 0,
      transcript: whisperResult.text || '',
      troubleSpots,
      stats,
      summaries: analysis.summaries
    };

    analytics.progress[workKey].recitations.push(recitationRecord);

    // Keep last 10
    if (analytics.progress[workKey].recitations.length > 10) {
      analytics.progress[workKey].recitations =
        analytics.progress[workKey].recitations.slice(-10);
    }

    await fs.writeFile(req.analyticsPath, JSON.stringify(analytics, null, 2));
    console.log(`[recite] Stored: ${troubleSpots.length} trouble spots (${stats.substitutions} sub, ${stats.omissions} omit, ${stats.hesitations} hesit, ${stats.stumbles} stumble)`);

    res.json({
      success: true,
      transcript: whisperResult.text,
      duration: whisperResult.duration,
      troubleSpots,
      stats,
      summaries: analysis.summaries,
      dramaticPauses: analysis.dramaticPauses
    });
  } catch (err) {
    console.error('Recitation transcribe error:', err);
    res.status(500).json({ error: err.message || 'Transcription failed' });
  }
});

// GET /trouble-spots/:authorId/:workId
router.get('/trouble-spots/:authorId/:workId', validateKey, async (req, res) => {
  try {
    const { authorId, workId } = req.params;
    const workKey = `${authorId}/${workId}`;

    const content = await fs.readFile(req.analyticsPath, 'utf-8');
    const analytics = JSON.parse(content);

    const recitations = analytics.progress?.[workKey]?.recitations || [];
    const aggregated = aggregateTroubleSpots(recitations, 3);

    res.json({
      totalRecitations: recitations.length,
      analyzedCount: Math.min(recitations.length, 3),
      troubleSpots: aggregated
    });
  } catch (err) {
    console.error('Trouble spots error:', err);
    res.status(500).json({ error: 'Failed to get trouble spots' });
  }
});

export default router;
