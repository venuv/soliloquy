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

    // 2. Session/work stats from per-user analytics files — build a per-user
    // engagement map at the same time so we can rank users by real engagement
    // (distinct visit days + deep sessions + works touched) rather than just
    // "last seen."
    const files = await fs.readdir(ANALYTICS_DIR);
    let totalSessions = 0, totalTests = 0, totalPractice = 0;
    const scores = [];
    const workOpens = {};
    const perUser = {};  // userId -> engagement metrics

    // Seed perUser from keys.json so first-visit-only users show up too
    for (const [id, k] of Object.entries(keys)) {
      perUser[id] = {
        id,
        createdAt: k.createdAt,
        lastSeen: k.lastSeen,
        sessions: 0,
        testSessions: 0,
        totalPracticeSec: 0,
        longestSessionSec: 0,
        worksTouched: new Set(),
        topWork: null,
        topWorkSessions: 0
      };
    }

    // Session-duration buckets for the depth histogram
    const depthBuckets = { under30: 0, s30to2m: 0, m2to10: 0, m10to30: 0, m30plus: 0 };

    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const data = JSON.parse(await fs.readFile(path.join(ANALYTICS_DIR, f), 'utf-8'));
        const uid = f.replace(/\.json$/, '');
        if (!perUser[uid]) {
          // Orphan analytics file (user in keys.json got cleaned but file remains)
          perUser[uid] = {
            id: uid, createdAt: data.createdAt, lastSeen: null,
            sessions: 0, testSessions: 0, totalPracticeSec: 0, longestSessionSec: 0,
            worksTouched: new Set(), topWork: null, topWorkSessions: 0
          };
        }
        const workSessionCounts = {};
        for (const s of (data.sessions || [])) {
          totalSessions++;
          const dur = s.duration || 0;
          if (s.mode === 'test') {
            totalTests++;
            perUser[uid].testSessions++;
            if (s.score != null) scores.push(s.score);
          } else {
            totalPractice++;
          }
          perUser[uid].sessions++;
          perUser[uid].totalPracticeSec += dur;
          if (dur > perUser[uid].longestSessionSec) perUser[uid].longestSessionSec = dur;
          if (s.workId) {
            const wk = `${s.authorId}/${s.workId}`;
            workOpens[wk] = (workOpens[wk] || 0) + 1;
            perUser[uid].worksTouched.add(wk);
            workSessionCounts[wk] = (workSessionCounts[wk] || 0) + 1;
          }
          // Session-depth histogram
          if (dur < 30) depthBuckets.under30++;
          else if (dur < 120) depthBuckets.s30to2m++;
          else if (dur < 600) depthBuckets.m2to10++;
          else if (dur < 1800) depthBuckets.m10to30++;
          else depthBuckets.m30plus++;
        }
        // Pick their top work by session count
        for (const [wk, n] of Object.entries(workSessionCounts)) {
          if (n > perUser[uid].topWorkSessions) {
            perUser[uid].topWork = wk;
            perUser[uid].topWorkSessions = n;
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
        testComplete: uniqUsers('test-complete'),
        reflectVisit: uniqUsers('reflect-visit'),
        reflectResponse: uniqUsers('reflect-response'),
        reflectFeedback: uniqUsers('reflect-feedback')
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

    // 4. Enrich perUser from events log — distinct visit days, reflect activity.
    // "Visit days" is a much better repeat-visit signal than raw login-return
    // count (which includes same-session tab refreshes).
    for (const e of events) {
      const uid = e.key;
      if (!uid || !perUser[uid]) continue;
      if (!perUser[uid].visitDays) perUser[uid].visitDays = new Set();
      if (!perUser[uid].reflectVisits) perUser[uid].reflectVisits = 0;
      if (!perUser[uid].reflectResponses) perUser[uid].reflectResponses = 0;
      if (e.ts) {
        // Bucket by UTC day
        perUser[uid].visitDays.add(e.ts.slice(0, 10));
      }
      if (e.event === 'reflect-visit') perUser[uid].reflectVisits++;
      if (e.event === 'reflect-response') perUser[uid].reflectResponses++;
    }

    // 5. Engagement classification & top-engaged leaderboard
    const userList = Object.values(perUser).map(u => {
      const visitDays = u.visitDays ? u.visitDays.size : 0;
      const hasDeep = u.longestSessionSec >= 300; // ≥5min session
      // Evaluator = 2+ visit days but negligible actual practice (<60s total).
      // These are typically curators/teachers/reviewers checking whether the
      // app is worth sharing — not the target user themselves. Their impact
      // shows up later as new registrations (their audience), not their own
      // stats.
      const isEvaluator = visitDays >= 2 && u.totalPracticeSec < 60;
      const category =
        visitDays === 0 ? 'silent' :
        visitDays === 1 && !hasDeep ? 'one-timer' :
        visitDays === 1 && hasDeep ? 'one-timer-deep' :
        isEvaluator ? 'evaluator' :
        visitDays >= 3 && hasDeep ? 'engaged' :
        'returning';
      // Simple engagement score: visit-days weighted heavily, plus practice
      // minutes, plus works-touched breadth, plus reflect activity as a bonus.
      const score =
        visitDays * 20 +
        Math.min(u.totalPracticeSec / 60, 120) + // cap at 120 mins to prevent one marathon from dominating
        (u.worksTouched.size) * 3 +
        (u.testSessions || 0) * 10 +
        (u.reflectResponses || 0) * 5;
      return {
        ...u,
        visitDays,
        hasDeep,
        category,
        score,
        worksTouchedCount: u.worksTouched.size,
        practiceMin: Math.round(u.totalPracticeSec / 60),
        longestMin: Math.round(u.longestSessionSec / 60)
      };
    });

    const engagement = {
      total: userList.length,
      silent: userList.filter(u => u.category === 'silent').length,
      oneTimers: userList.filter(u => u.category === 'one-timer').length,
      oneTimerDeep: userList.filter(u => u.category === 'one-timer-deep').length,
      evaluator: userList.filter(u => u.category === 'evaluator').length,
      returning: userList.filter(u => u.category === 'returning').length,
      engaged: userList.filter(u => u.category === 'engaged').length
    };

    // 6. Cluster detector — 5+ new keys registered within any 2-hour window
    // (in the last 30 days). Likely signals a class, a shared link, or a
    // sub-community discovering the app together, rather than organic trickle.
    const CLUSTER_WINDOW_MS = 2 * 60 * 60 * 1000;
    const CLUSTER_MIN_KEYS = 5;
    const recentCreations = users
      .filter(u => u.createdAt && (now - new Date(u.createdAt).getTime()) < 30 * DAY)
      .map(u => ({ id: u.id, ts: new Date(u.createdAt).getTime() }))
      .sort((a, b) => a.ts - b.ts);
    const clusters = [];
    for (let i = 0; i < recentCreations.length; i++) {
      let j = i;
      while (j < recentCreations.length && recentCreations[j].ts - recentCreations[i].ts <= CLUSTER_WINDOW_MS) j++;
      const count = j - i;
      if (count >= CLUSTER_MIN_KEYS) {
        // Only record if this cluster starts a fresh window (dedupe overlaps)
        const last = clusters[clusters.length - 1];
        if (!last || recentCreations[i].ts > last.endTs) {
          clusters.push({
            startTs: recentCreations[i].ts,
            endTs: recentCreations[j - 1].ts,
            count,
            ids: recentCreations.slice(i, j).map(x => x.id)
          });
        }
      }
    }

    const topEngaged = userList
      .filter(u => u.visitDays > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

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

  <h2>Engagement (all time)</h2>
  <p class="muted" style="margin-top:-0.25rem">
    Categories: <b>silent</b> = registered but no event; <b>one-timer</b> = one visit day, no deep session;
    <b>one-timer (deep)</b> = one day but ≥5min session; <b>evaluator</b> = 2+ visit days but negligible practice
    (&lt;60s total) — typically curators / teachers reviewing to share; <b>returning</b> = 2+ days with some practice;
    <b>engaged</b> = 3+ visit days <em>and</em> at least one 5min+ session.
  </p>
  <div class="grid">
    <div>
      <table>
        ${row('Silent (registered, no event)', engagement.silent)}
        ${row('One-timer', engagement.oneTimers)}
        ${row('One-timer (deep — 5min+ session)', engagement.oneTimerDeep)}
        ${row('Evaluator (2+ days, <60s practice)', engagement.evaluator)}
        ${row('Returning (2+ visit days)', engagement.returning)}
        ${row('Engaged (3+ days + 5min+ session)', engagement.engaged)}
      </table>
    </div>
    <div>
      <h3 style="font-weight:400;color:#555;margin-top:0">Session depth (all time)</h3>
      <table>
        ${row('under 30s (drive-by)', depthBuckets.under30)}
        ${row('30s – 2 min', depthBuckets.s30to2m)}
        ${row('2 – 10 min (real learn pass)', depthBuckets.m2to10)}
        ${row('10 – 30 min (deep)', depthBuckets.m10to30)}
        ${row('30 min+ (marathon)', depthBuckets.m30plus)}
      </table>
    </div>
  </div>

  <h2>Registration clusters (5+ new keys in 2h, last 30d)</h2>
  <p class="muted" style="margin-top:-0.25rem">
    Likely signals: a class arriving via a teacher's shared link, a social-media wave, or a sub-community
    discovering the app together. Empty here = organic trickle only.
  </p>
  <table>
    ${clusters.length ? clusters.map(c => `<tr>
      <td class="muted">${esc(new Date(c.startTs).toISOString().slice(0, 16).replace('T', ' '))} → ${esc(new Date(c.endTs).toISOString().slice(0, 16).replace('T', ' '))} UTC</td>
      <td><b>${c.count}</b> keys</td>
      <td class="muted">${c.ids.map(id => `<code>${esc(id)}</code>`).join(' ')}</td>
    </tr>`).join('') : '<tr><td class="muted">no clusters yet — all registrations are spaced apart</td></tr>'}
  </table>

  <h2>Top engaged users</h2>
  <p class="muted" style="margin-top:-0.25rem">
    Ranked by engagement score = visit-days×20 + practice-min (capped at 120) + works-touched×3 + tests×10 + reflect-responses×5.
    Score is illustrative, not gospel — use it to eye-scan for the 3–4 users worth remembering by name.
  </p>
  <table>
    <tr><th>user</th><th>visit days</th><th>practice min</th><th>longest (min)</th><th>works</th><th>top work</th><th>tests</th><th>reflect responses</th><th>score</th></tr>
    ${topEngaged.length ? topEngaged.map(u => `<tr>
      <td><code>${esc(u.id)}</code></td>
      <td>${u.visitDays}</td>
      <td>${u.practiceMin}</td>
      <td>${u.longestMin}</td>
      <td>${u.worksTouchedCount}</td>
      <td class="muted">${esc(u.topWork || '')}</td>
      <td>${u.testSessions || 0}</td>
      <td>${u.reflectResponses || 0}</td>
      <td><b>${Math.round(u.score)}</b></td>
    </tr>`).join('') : '<tr><td colspan="9" class="muted">no engaged users yet</td></tr>'}
  </table>

  <h2>Funnel (unique users, last 7d)</h2>
  <table class="funnel">
    ${row('login-first', funnel7.loginFirst)}
    ${row('login-return', funnel7.loginReturn)}
    ${row('home (landing)', funnel7.home)}
    ${row('catalog (author page)', funnel7.catalog)}
    ${row('practice-open (opened a soliloquy)', funnel7.practiceOpen)}
    ${row('session-complete (finished a memorize)', funnel7.sessionComplete)}
    ${row('test-complete (finished a test)', funnel7.testComplete)}
    ${row('reflect-visit (opened Muse)', funnel7.reflectVisit)}
    ${row('reflect-response (got a response)', funnel7.reflectResponse)}
    ${row('reflect-feedback (voted on response)', funnel7.reflectFeedback)}
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
