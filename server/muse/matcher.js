/**
 * Morning Muse - Quote Matcher
 *
 * Matches user emotions/themes to Shakespeare quotes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load quotes database
const QUOTES_FILE = path.join(__dirname, '../crab/shakespeare-master.json');

let quotesCache = null;
let moodBuckets = null; // Map<emotion, quote[]> built once at startup

/**
 * Load quotes from file (cached) and build mood index
 */
export function loadQuotes() {
  if (quotesCache) return quotesCache;

  if (!fs.existsSync(QUOTES_FILE)) {
    console.warn('Warning: shakespeare-master.json not found, using empty quotes');
    quotesCache = [];
    return quotesCache;
  }

  quotesCache = JSON.parse(fs.readFileSync(QUOTES_FILE, 'utf8'));
  quotesCache = quotesCache.filter(q => q.character_situation);

  // Build mood bucket index — O(1) lookup per emotion at query time
  moodBuckets = new Map();
  for (const quote of quotesCache) {
    for (const emotion of (quote.emotions || [])) {
      const key = emotion.toLowerCase();
      if (!moodBuckets.has(key)) moodBuckets.set(key, []);
      moodBuckets.get(key).push(quote);
    }
  }

  console.log(`Loaded ${quotesCache.length} enriched quotes, ${moodBuckets.size} mood buckets`);
  return quotesCache;
}

/**
 * Get mood buckets (ensures loaded)
 */
export function getMoodBuckets() {
  if (!moodBuckets) loadQuotes();
  return moodBuckets;
}

/**
 * Wisdom types and when to use them
 */
export const WISDOM_TYPES = {
  validation: 'Acknowledge and validate the feeling - "you are not alone"',
  challenge: 'Gently push toward action or courage',
  perspective: 'Offer a broader view on life/situation',
  comfort: 'Soothe and provide warmth',
  reflection: 'Encourage sitting with the feeling, understanding it',
  warning: 'Show where this path might lead (from tragedies)'
};

/**
 * Map user emotions to quote emotions (handles synonyms)
 * User parsing may output nuanced emotions; quotes have broader categories
 */
const EMOTION_MAP = {
  // Direct matches
  sadness: ['sadness', 'weariness'],
  melancholy: ['sadness', 'weariness'],
  anxiety: ['anxiety', 'fear'],
  fear: ['fear', 'anxiety'],
  anger: ['anger'],
  joy: ['joy', 'hope'],
  hope: ['hope', 'joy'],
  love: ['love'],
  // Nuanced emotions -> quote emotions
  aimlessness: ['weariness', 'doubt', 'sadness'],
  searching: ['hope', 'doubt', 'anxiety'],
  restlessness: ['anxiety', 'anger', 'weariness'],
  weariness: ['weariness', 'sadness'],
  frustration: ['anger', 'weariness'],
  contentment: ['joy', 'hope'],
  gratitude: ['joy', 'love', 'hope']
};

/**
 * Fortune's Wheel voices — the 5 moods the Muse can speak in.
 * The user doesn't choose; Fortune does.
 */
export const VOICES = {
  straight: {
    name: 'Straight with me',
    description: 'Direct, no sugar. Name the real thing. Say what needs saying in plain language. Like a friend who respects you too much to be gentle.',
    example: "You're not stuck. You're avoiding a decision. There's a difference."
  },
  laugh: {
    name: 'Make me laugh',
    description: 'Find the absurdity. Deflate the drama with humor, then land the truth sideways. Warm, not cruel. Like a wise friend at a bar.',
    example: "Oh you're stuck. Like a cart in mud. Except you built the cart, drove it into the mud, and now you're writing poetry about mud."
  },
  deep: {
    name: 'Go deep',
    description: 'Sit with the feeling. Don\'t rush to fix it. Ask what this moment is really about. Contemplative, unhurried. Like a therapist who reads Shakespeare.',
    example: "Stillness isn't always stuckness. What if the nothing-moving is you gathering?"
  },
  challenge: {
    name: 'Challenge me',
    description: 'Push back on the user\'s framing. Reframe the struggle as raw material. No self-pity allowed. Like a coach who came from the same struggle. Jay-Z energy.',
    example: "Henry was a drunk kid nobody believed in. Night before the biggest battle, outnumbered — he said 'we happy few.' He didn't wait for the odds to change."
  },
  listen: {
    name: 'Just listen',
    description: 'Reflect back what the user said. Don\'t fix, don\'t advise. Help them hear themselves. Mirror energy. Ask one gentle question at the end.',
    example: "You said three things — tired, nothing moving, stuck. But those aren't the same. Which one is it really?"
  }
};

// Backwards compat alias
export const STYLES = VOICES;

/**
 * Expand user emotions to quote-matchable emotions using the map
 */
function expandEmotions(userEmotions) {
  const expanded = new Set();
  for (const emotion of userEmotions) {
    const mapped = EMOTION_MAP[emotion.toLowerCase()];
    if (mapped) {
      mapped.forEach(e => expanded.add(e));
    } else {
      expanded.add(emotion.toLowerCase());
    }
  }
  return Array.from(expanded);
}

/**
 * Score how well a quote matches the user's state
 */
function scoreMatch(quote, userState) {
  let score = 0;

  // Expand user emotions to match quote vocabulary
  const expandedEmotions = expandEmotions(userState.emotions || []);

  // Emotion match (highest weight)
  if (quote.emotions && expandedEmotions.length > 0) {
    const emotionOverlap = quote.emotions.filter(e =>
      expandedEmotions.includes(e.toLowerCase())
    ).length;
    score += emotionOverlap * 30;
  }

  // Theme match
  if (quote.themes && userState.themes) {
    const themeOverlap = quote.themes.filter(t =>
      userState.themes.some(ut =>
        ut.toLowerCase() === t.toLowerCase() ||
        ut.replace('_', ' ') === t.replace('_', ' ')
      )
    ).length;
    score += themeOverlap * 25;
  }

  // Wisdom type match
  if (quote.wisdom_types && userState.wisdom_type) {
    if (quote.wisdom_types.includes(userState.wisdom_type)) {
      score += 25;
    }
  }

  // Tone match (if specified)
  if (quote.tone && userState.preferred_tone) {
    if (quote.tone === userState.preferred_tone) {
      score += 15;
    }
  }

  // Slight randomization to avoid always returning the same quote
  score += Math.random() * 10;

  return score;
}

/**
 * Fast bucket-based matching: pull from mood buckets, score only the pool.
 * Returns { candidates: quote[], confident: bool }
 * confident=true means top scores are spread out (no rerank needed)
 */
export function matchQuotes(userState, limit = 5) {
  const buckets = getMoodBuckets();
  const expandedEmotions = expandEmotions(userState.emotions || []);

  // Step 1: Union quotes from matching mood buckets (instant)
  const seen = new Set();
  let pool = [];
  for (const emotion of expandedEmotions) {
    const bucket = buckets.get(emotion);
    if (bucket) {
      for (const q of bucket) {
        if (!seen.has(q.id)) {
          seen.add(q.id);
          pool.push(q);
        }
      }
    }
  }

  // Fallback: if bucket lookup is too narrow (<20), use full corpus
  if (pool.length < 20) {
    pool = loadQuotes();
  }

  // Step 2: Score only the pool (not all 4120)
  const scored = pool.map(quote => ({
    quote,
    score: scoreMatch(quote, userState)
  }));
  scored.sort((a, b) => b.score - a.score);

  // Step 3: Take top 50, then sample `limit` for variety
  const top50 = scored.slice(0, 50);
  const topScore = top50[0]?.score || 0;
  const fifthScore = top50[Math.min(4, top50.length - 1)]?.score || 0;
  const confident = (topScore - fifthScore) > 15; // clear winner vs tight pack

  // Sample: 3 from top 15, 2 from remaining 35 (if available)
  const tier1 = top50.slice(0, Math.min(15, top50.length));
  const tier2 = top50.slice(15);
  const picks = [];

  // Shuffle-pick from tier1
  const t1shuffled = tier1.sort(() => Math.random() - 0.5);
  picks.push(...t1shuffled.slice(0, Math.min(3, limit)));

  // Shuffle-pick from tier2
  if (tier2.length > 0 && picks.length < limit) {
    const t2shuffled = tier2.sort(() => Math.random() - 0.5);
    picks.push(...t2shuffled.slice(0, limit - picks.length));
  }

  // Fill from tier1 if still short
  while (picks.length < limit && picks.length < top50.length) {
    const next = top50.find(s => !picks.includes(s));
    if (next) picks.push(next);
    else break;
  }

  return {
    candidates: picks.map(s => s.quote),
    confident,
    poolSize: pool.length
  };
}

/**
 * Pick a wisdom type based on user state
 * Prioritizes the parsed "needs" field from empathetic listening
 */
export function pickWisdomType(userState, recentTypes = []) {
  const types = Object.keys(WISDOM_TYPES);

  // If LLM parsing identified what the user needs, trust it (with high probability)
  // The empathetic listening step has already done the hard work
  if (userState.needs && types.includes(userState.needs)) {
    // 80% chance to use the parsed need, 20% chance to offer variety
    if (Math.random() < 0.8) {
      return userState.needs;
    }
  }

  // Filter out recently used types for variety
  let available = types.filter(t => !recentTypes.includes(t));
  if (available.length === 0) available = types;

  // Also filter out the parsed need if we decided to vary
  if (userState.needs) {
    available = available.filter(t => t !== userState.needs);
    if (available.length === 0) available = types.filter(t => !recentTypes.includes(t));
  }

  // Weight based on user's emotional valence and intensity
  const negativeEmotions = ['fear', 'sadness', 'anger', 'anxiety', 'weariness', 'aimlessness', 'frustration', 'melancholy'];
  const isNegative = userState.valence === 'negative' ||
    userState.emotions?.some(e => negativeEmotions.includes(e.toLowerCase()));
  const isHighIntensity = userState.intensity === 'high';

  if (isNegative) {
    // For negative states, prefer validation/comfort
    // High intensity = more comfort, lower intensity = more perspective
    const weights = isHighIntensity ? {
      validation: 0.40,
      comfort: 0.35,
      reflection: 0.15,
      perspective: 0.08,
      challenge: 0.02,
      warning: 0.00
    } : {
      validation: 0.30,
      comfort: 0.25,
      perspective: 0.25,
      reflection: 0.15,
      challenge: 0.05,
      warning: 0.00
    };
    return weightedRandom(available, weights);
  } else {
    // For positive/neutral/mixed, offer more variety
    const weights = {
      perspective: 0.30,
      challenge: 0.25,
      validation: 0.20,
      reflection: 0.15,
      comfort: 0.10,
      warning: 0.00
    };
    return weightedRandom(available, weights);
  }
}

/**
 * Weighted random selection
 */
function weightedRandom(items, weights) {
  const totalWeight = items.reduce((sum, item) => sum + (weights[item] || 0.1), 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= weights[item] || 0.1;
    if (random <= 0) return item;
  }

  return items[0];
}

/**
 * Pick a voice — Fortune's Wheel chooses randomly, or user can override.
 */
export function pickVoice(preferredVoice = null) {
  if (preferredVoice && VOICES[preferredVoice]) {
    return preferredVoice;
  }
  const voices = Object.keys(VOICES);
  return voices[Math.floor(Math.random() * voices.length)];
}

// Backwards compat
export const pickStyle = pickVoice;
