import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const ANALYTICS_DIR = path.join(__dirname, '../data/analytics');
const KEYS_FILE = path.join(__dirname, '../data/keys.json');

// Simple admin key check (set via env var or defaults to a random value)
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me-in-production';

function requireAdmin(req, res, next) {
  const providedKey = req.headers['x-admin-key'];
  if (providedKey !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// Bulk download all analytics data
router.get('/download', requireAdmin, async (req, res) => {
  try {
    const result = {
      exportedAt: new Date().toISOString(),
      users: {},
      aggregates: {
        totalUsers: 0,
        totalSessions: 0,
        totalTestSessions: 0,
        byAuthor: {},
        byWork: {}
      }
    };

    // Read keys file
    try {
      const keysData = JSON.parse(await fs.readFile(KEYS_FILE, 'utf-8'));
      result.users.keys = keysData;
      result.aggregates.totalUsers = Object.keys(keysData.keys || {}).length;
    } catch (err) {
      result.users.keys = null;
    }

    // Read all analytics files
    const files = await fs.readdir(ANALYTICS_DIR);
    result.users.analytics = {};

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(ANALYTICS_DIR, file), 'utf-8');
          const data = JSON.parse(content);
          const userId = file.replace('.json', '');
          result.users.analytics[userId] = data;

          // Aggregate stats
          result.aggregates.totalSessions += data.sessions?.length || 0;
          result.aggregates.totalTestSessions += data.sessions?.filter(s => s.mode === 'test').length || 0;

          // Aggregate by author/work
          for (const session of (data.sessions || [])) {
            const { authorId, workId, mode, score } = session;
            if (authorId) {
              if (!result.aggregates.byAuthor[authorId]) {
                result.aggregates.byAuthor[authorId] = { sessions: 0, tests: 0, scores: [] };
              }
              result.aggregates.byAuthor[authorId].sessions++;
              if (mode === 'test') {
                result.aggregates.byAuthor[authorId].tests++;
                if (score !== null && score !== undefined) {
                  result.aggregates.byAuthor[authorId].scores.push(score);
                }
              }
            }
            if (workId) {
              const workKey = `${authorId}/${workId}`;
              if (!result.aggregates.byWork[workKey]) {
                result.aggregates.byWork[workKey] = { sessions: 0, tests: 0, scores: [] };
              }
              result.aggregates.byWork[workKey].sessions++;
              if (mode === 'test') {
                result.aggregates.byWork[workKey].tests++;
                if (score !== null && score !== undefined) {
                  result.aggregates.byWork[workKey].scores.push(score);
                }
              }
            }
          }
        } catch (err) {
          console.error(`Error reading ${file}:`, err);
        }
      }
    }

    // Calculate averages
    for (const key of Object.keys(result.aggregates.byAuthor)) {
      const scores = result.aggregates.byAuthor[key].scores;
      result.aggregates.byAuthor[key].avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;
      delete result.aggregates.byAuthor[key].scores; // Remove raw scores to save space
    }
    for (const key of Object.keys(result.aggregates.byWork)) {
      const scores = result.aggregates.byWork[key].scores;
      result.aggregates.byWork[key].avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;
      delete result.aggregates.byWork[key].scores;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=soliloquy-analytics-${new Date().toISOString().split('T')[0]}.json`);
    res.json(result);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Failed to export analytics' });
  }
});

// Cleanup old analytics files
router.post('/cleanup', requireAdmin, async (req, res) => {
  try {
    const { maxAgeDays = 90 } = req.body;
    const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    
    const deleted = [];
    const kept = [];

    // Clean up analytics files for inactive users
    const files = await fs.readdir(ANALYTICS_DIR);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(ANALYTICS_DIR, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          
          // Check last session date
          const sessions = data.sessions || [];
          let lastActivity = new Date(data.createdAt).getTime();
          
          if (sessions.length > 0) {
            const lastSession = sessions[sessions.length - 1];
            lastActivity = new Date(lastSession.timestamp).getTime();
          }
          
          if (lastActivity < cutoff) {
            await fs.unlink(filePath);
            deleted.push({
              file,
              lastActivity: new Date(lastActivity).toISOString(),
              sessions: sessions.length
            });
          } else {
            kept.push(file);
          }
        } catch (err) {
          console.error(`Error processing ${file}:`, err);
        }
      }
    }

    // Also clean up corresponding keys
    try {
      const keysData = JSON.parse(await fs.readFile(KEYS_FILE, 'utf-8'));
      const deletedKeys = deleted.map(d => d.file.replace('.json', ''));
      
      for (const key of deletedKeys) {
        if (keysData.keys[key]) {
          delete keysData.keys[key];
        }
      }
      
      await fs.writeFile(KEYS_FILE, JSON.stringify(keysData, null, 2));
    } catch (err) {
      console.error('Error cleaning keys:', err);
    }

    res.json({
      success: true,
      maxAgeDays,
      cutoffDate: new Date(cutoff).toISOString(),
      deleted: deleted.length,
      kept: kept.length,
      deletedFiles: deleted
    });
  } catch (err) {
    console.error('Cleanup error:', err);
    res.status(500).json({ error: 'Failed to cleanup' });
  }
});

// Get storage stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const files = await fs.readdir(ANALYTICS_DIR);
    let totalSize = 0;
    let fileCount = 0;

    for (const file of files) {
      if (file.endsWith('.json')) {
        const stat = await fs.stat(path.join(ANALYTICS_DIR, file));
        totalSize += stat.size;
        fileCount++;
      }
    }

    // Keys file size
    try {
      const keysStat = await fs.stat(KEYS_FILE);
      totalSize += keysStat.size;
    } catch {}

    res.json({
      analyticsFiles: fileCount,
      totalSizeBytes: totalSize,
      totalSizeKB: Math.round(totalSize / 1024),
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
