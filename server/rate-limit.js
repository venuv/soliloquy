// In-memory sliding-window rate limiter, keyed by userKey (falls back to IP).
// Reset on cold-start is intentional and fine at this scale — the machine
// scales to zero when idle, so buckets naturally drain during quiet periods.
//
// Usage:
//   import { rateLimit } from '../rate-limit.js';
//   router.post('/generate', rateLimit({ name: 'viz-gen', capacity: 3, windowMs: 3600_000 }), handler);

import { appendEvent } from './routes/analytics.js';

const buckets = new Map(); // `${name}:${key}` -> array of request timestamps (ms)

export function rateLimit({ name, capacity, windowMs }) {
  return (req, res, next) => {
    const userKey = req.headers['x-user-key'];
    const identity = userKey || `ip:${req.ip}`;
    const bucketKey = `${name}:${identity}`;
    const now = Date.now();
    const cutoff = now - windowMs;
    const arr = (buckets.get(bucketKey) || []).filter(t => t > cutoff);

    if (arr.length >= capacity) {
      const retryAfterSec = Math.max(1, Math.ceil((arr[0] + windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      appendEvent({
        key: userKey || null,
        event: 'rate-limit-hit',
        endpoint: name,
        capacity,
        windowMs
      });
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `You've hit the hourly cap on this feature (${capacity}/hr). Try again in about ${Math.ceil(retryAfterSec / 60)} minute${retryAfterSec > 60 ? 's' : ''}.`,
        retryAfterSec
      });
    }

    arr.push(now);
    buckets.set(bucketKey, arr);
    next();
  };
}

// Periodic sweep so idle-user buckets don't leak memory. Cheap.
setInterval(() => {
  const now = Date.now();
  const oneHour = 3600_000;
  for (const [k, arr] of buckets) {
    const filtered = arr.filter(t => t > now - oneHour);
    if (filtered.length === 0) buckets.delete(k);
    else buckets.set(k, filtered);
  }
}, 5 * 60_000).unref();
