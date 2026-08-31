import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { appendEvent } from './analytics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const ANALYTICS_DIR = path.join(__dirname, '../data/analytics');
const REQUESTS_PATH = path.join(ANALYTICS_DIR, 'requests.jsonl');

// Middleware: validate user key exists in the analytics dir
async function validateKey(req, res, next) {
  const key = req.headers['x-user-key'];
  if (!key) return res.status(401).json({ error: 'No key provided' });
  const analyticsPath = path.join(ANALYTICS_DIR, `${key}.json`);
  try {
    await fs.access(analyticsPath);
    req.userKey = key;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid key' });
  }
}

// POST /api/requests — append a content request to the persistent log.
// Fire-and-forget append (no read of any existing file). Also emits an
// events-log record so the funnel shows the submission alongside other
// user activity.
router.post('/', validateKey, async (req, res) => {
  const { request, context, source } = req.body || {};
  const text = (request || '').trim();
  if (text.length < 3) {
    return res.status(400).json({ error: 'Please describe what you would like added' });
  }
  const record = {
    ts: new Date().toISOString(),
    key: req.userKey,
    request: text.slice(0, 2000),
    context: (context || '').slice(0, 2000),
    source: source || 'unknown'
  };
  try {
    await fs.appendFile(REQUESTS_PATH, JSON.stringify(record) + '\n');
    appendEvent({
      key: req.userKey,
      event: 'request-submitted',
      source: record.source,
      requestLen: record.request.length,
      hasContext: record.context.length > 0
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Request submit error:', err);
    res.status(500).json({ error: 'Failed to save request' });
  }
});

export default router;
