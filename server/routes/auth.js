import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const DATA_DIR = path.join(__dirname, '../data');
const KEYS_FILE = path.join(DATA_DIR, 'keys.json');
const ANALYTICS_DIR = path.join(DATA_DIR, 'analytics');

const COOKIE_NAME = 'soliloquy_fp';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
};

// Generate a random 6-digit key
function generateKey() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate a fingerprint
function generateFingerprint() {
  return crypto.randomBytes(16).toString('hex');
}

// Ensure data directories exist
async function ensureDataDirs() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(ANALYTICS_DIR, { recursive: true });
  } catch (err) {
    // Ignore if already exists
  }
}

// Initialize or load keys file
async function loadKeys() {
  await ensureDataDirs();
  try {
    const content = await fs.readFile(KEYS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    // File doesn't exist, create empty
    const data = { keys: {} };
    await fs.writeFile(KEYS_FILE, JSON.stringify(data, null, 2));
    return data;
  }
}

// Save keys file
async function saveKeys(data) {
  await fs.writeFile(KEYS_FILE, JSON.stringify(data, null, 2));
}

// Generate a new user key
router.post('/register', async (req, res) => {
  try {
    const data = await loadKeys();
    
    // Get or create fingerprint from cookie
    let fingerprint = req.cookies[COOKIE_NAME];
    if (!fingerprint) {
      fingerprint = generateFingerprint();
      res.cookie(COOKIE_NAME, fingerprint, COOKIE_OPTIONS);
    }
    
    // Generate unique 6-digit key
    let newKey;
    let attempts = 0;
    do {
      newKey = generateKey();
      attempts++;
    } while (data.keys[newKey] && attempts < 100);
    
    if (attempts >= 100) {
      return res.status(500).json({ error: 'Could not generate unique key' });
    }
    
    data.keys[newKey] = {
      createdAt: new Date().toISOString(),
      fingerprints: [fingerprint],
      lastSeen: new Date().toISOString(),
      flaggedForSharing: false
    };
    
    await saveKeys(data);
    
    // Initialize analytics file for this user
    const analyticsPath = path.join(ANALYTICS_DIR, `${newKey}.json`);
    await fs.writeFile(analyticsPath, JSON.stringify({
      key: newKey,
      createdAt: new Date().toISOString(),
      sessions: [],
      progress: {}
    }, null, 2));
    
    console.log(`New user registered: ${newKey}`);
    res.json({ key: newKey });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register: ' + err.message });
  }
});

// Validate an existing key
router.post('/validate', async (req, res) => {
  try {
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({ valid: false, error: 'No key provided' });
    }
    
    const data = await loadKeys();
    
    if (!data.keys[key]) {
      return res.status(401).json({ valid: false, error: 'Invalid key' });
    }
    
    // Get or create fingerprint from cookie
    let fingerprint = req.cookies[COOKIE_NAME];
    if (!fingerprint) {
      fingerprint = generateFingerprint();
      res.cookie(COOKIE_NAME, fingerprint, COOKIE_OPTIONS);
    }
    
    // Update last seen
    data.keys[key].lastSeen = new Date().toISOString();
    
    // Track fingerprints for sharing detection
    if (!data.keys[key].fingerprints.includes(fingerprint)) {
      data.keys[key].fingerprints.push(fingerprint);
      
      // Flag if too many unique fingerprints (potential key sharing)
      if (data.keys[key].fingerprints.length > 5) {
        data.keys[key].flaggedForSharing = true;
      }
    }
    
    await saveKeys(data);
    
    // Ensure analytics file exists
    const analyticsPath = path.join(ANALYTICS_DIR, `${key}.json`);
    try {
      await fs.access(analyticsPath);
    } catch {
      await fs.writeFile(analyticsPath, JSON.stringify({
        key: key,
        createdAt: data.keys[key].createdAt,
        sessions: [],
        progress: {}
      }, null, 2));
    }
    
    console.log(`User validated: ${key}`);
    res.json({ 
      valid: true,
      flagged: data.keys[key].flaggedForSharing || false,
      uniqueDevices: data.keys[key].fingerprints.length
    });
  } catch (err) {
    console.error('Validation error:', err);
    res.status(500).json({ error: 'Failed to validate: ' + err.message });
  }
});

// Get key info (for display)
router.get('/info', async (req, res) => {
  try {
    const key = req.headers['x-user-key'];
    if (!key) {
      return res.status(401).json({ error: 'No key provided' });
    }
    
    const data = await loadKeys();
    
    if (!data.keys[key]) {
      return res.status(401).json({ error: 'Invalid key' });
    }
    
    res.json({
      key: key,
      createdAt: data.keys[key].createdAt,
      lastSeen: data.keys[key].lastSeen,
      uniqueDevices: data.keys[key].fingerprints.length,
      flagged: data.keys[key].flaggedForSharing || false
    });
  } catch (err) {
    console.error('Info error:', err);
    res.status(500).json({ error: 'Failed to get info' });
  }
});

export default router;
