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

// Multer: memory storage, 25MB limit (Whisper max), audio only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) cb(null, true);
    else cb(new Error('Only audio files accepted'), false);
  }
});

// Middleware to validate user key (same pattern as analytics.js)
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

// --- Build expected word list with position metadata ---
function buildExpectedWords(chunks) {
  const words = [];
  chunks.forEach((chunk, chunkIdx) => {
    const text = `${chunk.front} ${chunk.back}`;
    const rawWords = text.match(/[a-zA-Z'']+/g) || [];
    rawWords.forEach((word, wordInChunk) => {
      words.push({
        word,
        normalized: word.toLowerCase().replace(/['']/g, "'"),
        chunkIdx,
        wordInChunk
      });
    });
  });
  return words;
}

// --- Levenshtein distance ---
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// --- Fuzzy word match ---
function fuzzyMatch(a, b) {
  if (a === b) return 'exact';
  const threshold = Math.max(1, Math.floor(Math.max(a.length, b.length) / 3));
  if (levenshtein(a, b) <= threshold) return 'fuzzy';
  if (a.length > 2 && b.length > 2 && (a.includes(b) || b.includes(a))) return 'fuzzy';
  return null;
}

// --- Greedy forward alignment with lookahead ---
function alignTranscript(expectedWords, whisperWords) {
  const LOOKAHEAD = 5;
  const aligned = [];
  let wi = 0;

  for (let ei = 0; ei < expectedWords.length; ei++) {
    const exp = expectedWords[ei];
    let matched = false;

    for (let look = 0; look < LOOKAHEAD && wi + look < whisperWords.length; look++) {
      const wh = whisperWords[wi + look];
      const matchType = fuzzyMatch(exp.normalized, wh.normalized);
      if (matchType) {
        aligned.push({ type: matchType, expected: exp, whisper: wh });
        wi = wi + look + 1;
        matched = true;
        break;
      }
    }

    if (!matched) {
      aligned.push({ type: 'missed', expected: exp });
    }
  }

  return aligned;
}

// --- Detect STOPS: time gaps > threshold between aligned whisper words ---
function detectStops(aligned, gapThreshold = 2.0) {
  const stops = [];
  let prevEntry = null;

  for (const entry of aligned) {
    if (entry.whisper && prevEntry?.whisper) {
      const gap = entry.whisper.start - prevEntry.whisper.end;
      if (gap > gapThreshold && entry.expected) {
        stops.push({
          type: 'stop',
          chunkIdx: entry.expected.chunkIdx,
          wordInChunk: entry.expected.wordInChunk,
          gapSeconds: Math.round(gap * 100) / 100,
          beforeWord: entry.expected.word
        });
      }
    }
    if (entry.whisper) prevEntry = entry;
  }

  return stops;
}

// --- Detect STRUGGLES: missed or fuzzy-matched words ---
function detectStruggles(aligned) {
  return aligned
    .filter(a => a.type === 'missed' || a.type === 'fuzzy')
    .filter(a => a.expected)
    .map(a => ({
      type: 'struggle',
      chunkIdx: a.expected.chunkIdx,
      wordInChunk: a.expected.wordInChunk,
      expected: a.expected.word,
      heard: a.whisper?.word || null,
      matchQuality: a.type
    }));
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
          word: spot.beforeWord || spot.expected || '',
          count: 0,
          types: []
        };
      }
      spotMap[key].count++;
      spotMap[key].types.push(spot.type);
    });
  });

  const totalAttempts = recent.length;
  return Object.values(spotMap).map(spot => ({
    ...spot,
    severity: spot.count / totalAttempts,
    dominantType: spot.types.filter(t => t === 'stop').length >=
                  spot.types.filter(t => t === 'struggle').length
                  ? 'stop' : 'struggle'
  }));
}

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

// POST /transcribe/:authorId/:workId
// Accepts audio, transcribes via Whisper, aligns, detects trouble spots
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

    // 2. Build expected words with position metadata
    const expectedWords = buildExpectedWords(work.chunks);

    // 3. Normalize whisper words
    const whisperWords = (whisperResult.words || []).map(w => ({
      word: w.word,
      normalized: w.word.toLowerCase().replace(/['']/g, "'"),
      start: w.start,
      end: w.end
    }));

    // 4. Align transcript against expected text
    const aligned = alignTranscript(expectedWords, whisperWords);

    // 5. Detect trouble spots
    const stops = detectStops(aligned);
    const struggles = detectStruggles(aligned);
    const troubleSpots = [...stops, ...struggles];

    // 6. Build stats
    const stats = {
      totalExpected: expectedWords.length,
      matched: aligned.filter(a => a.type === 'exact').length,
      fuzzy: aligned.filter(a => a.type === 'fuzzy').length,
      missed: aligned.filter(a => a.type === 'missed').length,
      stops: stops.length,
      struggles: struggles.length
    };

    // 7. Store in analytics
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
      stats
    };

    analytics.progress[workKey].recitations.push(recitationRecord);

    // Keep last 10 recitations
    if (analytics.progress[workKey].recitations.length > 10) {
      analytics.progress[workKey].recitations =
        analytics.progress[workKey].recitations.slice(-10);
    }

    await fs.writeFile(req.analyticsPath, JSON.stringify(analytics, null, 2));
    console.log(`[recite] Stored recitation for ${workId}: ${stats.matched}/${stats.totalExpected} matched, ${stops.length} stops, ${struggles.length} struggles`);

    res.json({
      success: true,
      transcript: whisperResult.text,
      duration: whisperResult.duration,
      troubleSpots,
      stats
    });
  } catch (err) {
    console.error('Recitation transcribe error:', err);
    res.status(500).json({ error: err.message || 'Transcription failed' });
  }
});

// GET /trouble-spots/:authorId/:workId
// Returns aggregated trouble spots from last 3 recitations
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
