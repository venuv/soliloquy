import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const ANALYTICS_DIR = path.join(__dirname, '../data/analytics');

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

// Get user's progress/analytics
router.get('/progress', validateKey, async (req, res) => {
  try {
    const content = await fs.readFile(req.analyticsPath, 'utf-8');
    const analytics = JSON.parse(content);
    res.json(analytics);
  } catch (err) {
    console.error('Error fetching progress:', err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Record a practice session
router.post('/session', validateKey, async (req, res) => {
  try {
    const { authorId, workId, mode, duration, chunksReviewed, correct, total, practiceUnit } = req.body;

    const content = await fs.readFile(req.analyticsPath, 'utf-8');
    const analytics = JSON.parse(content);

    const session = {
      timestamp: new Date().toISOString(),
      authorId,
      workId,
      mode, // 'memorize' or 'test'
      practiceUnit: practiceUnit || 'lines', // 'lines' or 'beats'
      duration, // seconds
      chunksReviewed,
      correct,
      total,
      score: total > 0 ? Math.round((correct / total) * 100) : null
    };
    
    analytics.sessions.push(session);
    
    // Keep only last 1000 sessions
    if (analytics.sessions.length > 1000) {
      analytics.sessions = analytics.sessions.slice(-1000);
    }
    
    await fs.writeFile(req.analyticsPath, JSON.stringify(analytics, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('Error recording session:', err);
    res.status(500).json({ error: 'Failed to record session' });
  }
});

// Update mastered chunks for a work
router.post('/mastered', validateKey, async (req, res) => {
  try {
    const { authorId, workId, masteredChunks, masteredBeats } = req.body;
    const workKey = `${authorId}/${workId}`;

    const content = await fs.readFile(req.analyticsPath, 'utf-8');
    const analytics = JSON.parse(content);

    if (!analytics.progress[workKey]) {
      analytics.progress[workKey] = { mastered: [], attempts: [] };
    }

    if (masteredChunks !== undefined) {
      analytics.progress[workKey].mastered = masteredChunks;
    }
    if (masteredBeats !== undefined) {
      analytics.progress[workKey].masteredBeats = masteredBeats;
    }
    analytics.progress[workKey].lastUpdated = new Date().toISOString();
    
    await fs.writeFile(req.analyticsPath, JSON.stringify(analytics, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating mastered:', err);
    res.status(500).json({ error: 'Failed to update mastered' });
  }
});

// Record individual attempt (for detailed analytics)
router.post('/attempt', validateKey, async (req, res) => {
  try {
    const { authorId, workId, chunkIndex, beatIndex, correct, likert, userAnswer, expectedAnswer } = req.body;
    const workKey = `${authorId}/${workId}`;

    const content = await fs.readFile(req.analyticsPath, 'utf-8');
    const analytics = JSON.parse(content);

    if (!analytics.progress[workKey]) {
      analytics.progress[workKey] = { mastered: [], attempts: [] };
    }

    const attempt = {
      timestamp: new Date().toISOString(),
      correct,
      userAnswer: userAnswer?.substring(0, 500), // Beats need more space
      expectedAnswer: expectedAnswer?.substring(0, 500)
    };
    if (chunkIndex != null) attempt.chunkIndex = chunkIndex;
    if (beatIndex != null) attempt.beatIndex = beatIndex;
    if (likert != null) attempt.likert = likert;

    analytics.progress[workKey].attempts.push(attempt);
    
    // Keep only last 100 attempts per work
    if (analytics.progress[workKey].attempts.length > 100) {
      analytics.progress[workKey].attempts = analytics.progress[workKey].attempts.slice(-100);
    }
    
    await fs.writeFile(req.analyticsPath, JSON.stringify(analytics, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('Error recording attempt:', err);
    res.status(500).json({ error: 'Failed to record attempt' });
  }
});

// Save user's custom beat boundaries
router.post('/beat-overrides', validateKey, async (req, res) => {
  try {
    const { authorId, workId, beats } = req.body;
    const workKey = `${authorId}/${workId}`;

    const content = await fs.readFile(req.analyticsPath, 'utf-8');
    const analytics = JSON.parse(content);

    if (!analytics.progress[workKey]) {
      analytics.progress[workKey] = { mastered: [], attempts: [] };
    }

    analytics.progress[workKey].beatOverrides = beats;
    analytics.progress[workKey].lastUpdated = new Date().toISOString();

    await fs.writeFile(req.analyticsPath, JSON.stringify(analytics, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving beat overrides:', err);
    res.status(500).json({ error: 'Failed to save beat overrides' });
  }
});

// Get user preferences
router.get('/preferences', validateKey, async (req, res) => {
  try {
    const content = await fs.readFile(req.analyticsPath, 'utf-8');
    const analytics = JSON.parse(content);
    res.json(analytics.preferences || {});
  } catch (err) {
    console.error('Error fetching preferences:', err);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update user preferences
router.post('/preferences', validateKey, async (req, res) => {
  try {
    const { key, value } = req.body;

    const content = await fs.readFile(req.analyticsPath, 'utf-8');
    const analytics = JSON.parse(content);

    if (!analytics.preferences) {
      analytics.preferences = {};
    }

    // Support nested keys like "practiceUnit.shakespeare/to-be-or-not-to-be"
    const parts = key.split('.');
    let obj = analytics.preferences;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;

    await fs.writeFile(req.analyticsPath, JSON.stringify(analytics, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating preferences:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get summary stats
router.get('/summary', validateKey, async (req, res) => {
  try {
    const content = await fs.readFile(req.analyticsPath, 'utf-8');
    const analytics = JSON.parse(content);
    
    const totalSessions = analytics.sessions.length;
    const totalTime = analytics.sessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const testSessions = analytics.sessions.filter(s => s.mode === 'test');
    const avgScore = testSessions.length > 0 
      ? Math.round(testSessions.reduce((acc, s) => acc + (s.score || 0), 0) / testSessions.length)
      : null;
    
    const worksStarted = Object.keys(analytics.progress).length;
    const worksMastered = Object.values(analytics.progress).filter(p => {
      // Consider "mastered" if 80%+ chunks are in mastered array
      return p.mastered && p.mastered.length > 0;
    }).length;
    
    res.json({
      totalSessions,
      totalTimeMinutes: Math.round(totalTime / 60),
      testSessions: testSessions.length,
      avgScore,
      worksStarted,
      worksMastered,
      memberSince: analytics.createdAt
    });
  } catch (err) {
    console.error('Error fetching summary:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;
