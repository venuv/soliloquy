import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeAndSync } from '../persist.js';
import { syncToTigris, tigrisKeyFromPath } from '../tigris.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const DATA_DIR = path.join(__dirname, '../data');
const ANALYTICS_DIR = path.join(__dirname, '../data/analytics');
const KEYS_FILE = path.join(__dirname, '../data/keys.json');
const EVENTS_PATH = path.join(ANALYTICS_DIR, 'events.jsonl');
const EVENTS_ARCHIVE_DIR = path.join(ANALYTICS_DIR, 'archive');

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
      
      await writeAndSync(KEYS_FILE, keysData);
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

// ---------- Events log (append-only funnel events) ----------

async function readEventsFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content
      .split('\n')
      .filter(Boolean)
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

// Stream the current events log as NDJSON
router.get('/events', requireAdmin, async (req, res) => {
  try {
    const content = await fs.readFile(EVENTS_PATH, 'utf-8').catch(err => {
      if (err.code === 'ENOENT') return '';
      throw err;
    });
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Content-Disposition',
      `attachment; filename=events-${new Date().toISOString().split('T')[0]}.jsonl`);
    res.send(content);
  } catch (err) {
    console.error('Events dump error:', err);
    res.status(500).json({ error: 'Failed to dump events' });
  }
});

// Archive current events.jsonl to a timestamped file, upload it to Tigris,
// and start a fresh empty log. Safe to call any time; no-op if log is empty.
router.post('/events/rotate', requireAdmin, async (req, res) => {
  try {
    await fs.mkdir(EVENTS_ARCHIVE_DIR, { recursive: true });
    let bytes = 0;
    let events = 0;
    let archivePath = null;
    try {
      const stat = await fs.stat(EVENTS_PATH);
      bytes = stat.size;
      if (bytes > 0) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        archivePath = path.join(EVENTS_ARCHIVE_DIR, `events-${stamp}.jsonl`);
        await fs.rename(EVENTS_PATH, archivePath);
        const content = await fs.readFile(archivePath, 'utf-8');
        events = content.split('\n').filter(Boolean).length;
        syncToTigris(archivePath, tigrisKeyFromPath(archivePath, DATA_DIR));
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    res.json({
      success: true,
      archivedTo: archivePath ? path.basename(archivePath) : null,
      bytes,
      events
    });
  } catch (err) {
    console.error('Events rotate error:', err);
    res.status(500).json({ error: 'Failed to rotate events' });
  }
});

// List archived event files
router.get('/events/archives', requireAdmin, async (req, res) => {
  try {
    await fs.mkdir(EVENTS_ARCHIVE_DIR, { recursive: true });
    const files = await fs.readdir(EVENTS_ARCHIVE_DIR);
    const archives = [];
    for (const f of files.sort()) {
      if (!f.endsWith('.jsonl')) continue;
      const stat = await fs.stat(path.join(EVENTS_ARCHIVE_DIR, f));
      archives.push({ file: f, bytes: stat.size, modified: stat.mtime });
    }
    res.json({ archives });
  } catch (err) {
    console.error('Archive list error:', err);
    res.status(500).json({ error: 'Failed to list archives' });
  }
});

// ---------- Dashboard (HTML view of aggregate stats) ----------

router.get('/dashboard', async (req, res) => {
  // Accept admin key via query param so the HTML view is easy to hit from a browser
  const providedKey = req.query.key || req.headers['x-admin-key'];
  if (providedKey !== ADMIN_KEY) {
    return res.status(403).send('Forbidden');
  }

  try {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    // 1. Users from keys.json
    let keys = {};
    try {
      const keysData = JSON.parse(await fs.readFile(KEYS_FILE, 'utf-8'));
      keys = keysData.keys || {};
    } catch {}

    const users = Object.entries(keys).map(([id, k]) => ({
      id,
      createdAt: k.createdAt,
      lastSeen: k.lastSeen,
      devices: (k.fingerprints || []).length,
      flagged: !!k.flaggedForSharing
    }));
    const active = (windowDays) => users.filter(u =>
      u.lastSeen && (now - new Date(u.lastSeen).getTime()) < windowDays * DAY
    ).length;
    const newIn = (windowDays) => users.filter(u =>
      u.createdAt && (now - new Date(u.createdAt).getTime()) < windowDays * DAY
    ).length;

    // 2. Session/work stats from per-user analytics files
    const files = await fs.readdir(ANALYTICS_DIR);
    let totalSessions = 0, totalTests = 0, totalPractice = 0;
    const scores = [];
    const workOpens = {};
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const data = JSON.parse(await fs.readFile(path.join(ANALYTICS_DIR, f), 'utf-8'));
        for (const s of (data.sessions || [])) {
          totalSessions++;
          if (s.mode === 'test') { totalTests++; if (s.score != null) scores.push(s.score); }
          else totalPractice++;
          if (s.workId) {
            const wk = `${s.authorId}/${s.workId}`;
            workOpens[wk] = (workOpens[wk] || 0) + 1;
          }
        }
      } catch {}
    }
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    // 3. Funnel + recent activity from events.jsonl
    const events = await readEventsFile(EVENTS_PATH);
    const eventsWindow = (windowDays) => events.filter(e =>
      e.ts && (now - new Date(e.ts).getTime()) < windowDays * DAY
    );
    const funnel7 = (() => {
      const w = eventsWindow(7);
      const uniqUsers = (name) => new Set(w.filter(e => e.event === name).map(e => e.key)).size;
      return {
        loginFirst: uniqUsers('login-first'),
        loginReturn: uniqUsers('login-return'),
        home: uniqUsers('home'),
        catalog: uniqUsers('catalog'),
        practiceOpen: uniqUsers('practice-open'),
        sessionComplete: uniqUsers('session-complete'),
        testComplete: uniqUsers('test-complete')
      };
    })();
    const recent = events.slice(-50).reverse();

    // Top opened soliloquies from events (last 30d)
    const openCounts30 = {};
    for (const e of eventsWindow(30)) {
      if (e.event === 'practice-open' && e.workId) {
        const wk = `${e.authorId}/${e.workId}`;
        openCounts30[wk] = (openCounts30[wk] || 0) + 1;
      }
    }
    const topOpens = Object.entries(openCounts30).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topCompletions = Object.entries(workOpens).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const row = (label, value) =>
      `<tr><td>${esc(label)}</td><td style="text-align:right"><b>${esc(value)}</b></td></tr>`;

    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Soliloquy · Dashboard</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; color: #222; }
  h1 { font-weight: 300; border-bottom: 1px solid #ddd; padding-bottom: .3rem; }
  h2 { font-weight: 400; margin-top: 2rem; color: #555; }
  table { border-collapse: collapse; width: 100%; margin-top: .5rem; }
  td, th { padding: .35rem .6rem; border-bottom: 1px solid #eee; text-align: left; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
  code { background: #f5f5f5; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
  .muted { color: #888; font-size: 12px; }
  .funnel td:last-child { font-family: monospace; }
</style></head><body>
  <h1>Soliloquy Dashboard <span class="muted">${new Date().toISOString()}</span></h1>

  <div class="grid">
    <div>
      <h2>Users</h2>
      <table>
        ${row('Total keys', users.length)}
        ${row('New (last 24h)', newIn(1))}
        ${row('New (last 7d)', newIn(7))}
        ${row('New (last 30d)', newIn(30))}
        ${row('Active (last 24h)', active(1))}
        ${row('Active (last 7d)', active(7))}
        ${row('Active (last 30d)', active(30))}
      </table>
    </div>
    <div>
      <h2>Practice (all time)</h2>
      <table>
        ${row('Sessions', totalSessions)}
        ${row('· practice mode', totalPractice)}
        ${row('· test mode', totalTests)}
        ${row('Avg test score', avgScore == null ? '—' : avgScore + '%')}
        ${row('Events in current log', events.length)}
      </table>
    </div>
  </div>

  <h2>Funnel (unique users, last 7d)</h2>
  <table class="funnel">
    ${row('login-first', funnel7.loginFirst)}
    ${row('login-return', funnel7.loginReturn)}
    ${row('home (landing)', funnel7.home)}
    ${row('catalog (author page)', funnel7.catalog)}
    ${row('practice-open (opened a soliloquy)', funnel7.practiceOpen)}
    ${row('session-complete (finished a memorize)', funnel7.sessionComplete)}
    ${row('test-complete (finished a test)', funnel7.testComplete)}
  </table>

  <div class="grid">
    <div>
      <h2>Top soliloquies opened (30d)</h2>
      <table>
        ${topOpens.length ? topOpens.map(([wk, n]) => row(wk, n)).join('') : '<tr><td class="muted">no opens yet</td></tr>'}
      </table>
    </div>
    <div>
      <h2>Top by session count (all time)</h2>
      <table>
        ${topCompletions.length ? topCompletions.map(([wk, n]) => row(wk, n)).join('') : '<tr><td class="muted">no sessions yet</td></tr>'}
      </table>
    </div>
  </div>

  <h2>Recent events (last 50)</h2>
  <table>
    <tr><th>time</th><th>user</th><th>event</th><th>meta</th></tr>
    ${recent.map(e => `<tr>
      <td class="muted">${esc(e.ts)}</td>
      <td><code>${esc(e.key || '')}</code></td>
      <td>${esc(e.event)}</td>
      <td class="muted">${esc(JSON.stringify(Object.fromEntries(Object.entries(e).filter(([k]) => !['ts','key','event'].includes(k)))))}</td>
    </tr>`).join('') || '<tr><td colspan="4" class="muted">no events yet</td></tr>'}
  </table>

  <h2>Users detail</h2>
  <table>
    <tr><th>id</th><th>created</th><th>last seen</th><th>devices</th></tr>
    ${users.sort((a,b) => (b.lastSeen || '').localeCompare(a.lastSeen || '')).map(u => `<tr>
      <td><code>${esc(u.id)}</code>${u.flagged ? ' <span class="muted">(shared)</span>' : ''}</td>
      <td class="muted">${esc((u.createdAt || '').slice(0, 10))}</td>
      <td class="muted">${esc((u.lastSeen || '').slice(0, 16).replace('T', ' '))}</td>
      <td>${u.devices}</td>
    </tr>`).join('')}
  </table>

  <p class="muted" style="margin-top:2rem">
    Ops: <code>GET /api/admin/events</code> · <code>POST /api/admin/events/rotate</code> ·
    <code>GET /api/admin/events/archives</code> · <code>GET /api/admin/download</code>
  </p>
</body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).send('Dashboard failed: ' + err.message);
  }
});

export default router;
