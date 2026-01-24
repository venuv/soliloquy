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

/**
 * Load quotes from file (cached)
 */
export function loadQuotes() {
  if (quotesCache) return quotesCache;

  if (!fs.existsSync(QUOTES_FILE)) {
    console.warn('Warning: shakespeare-master.json not found, using empty quotes');
    quotesCache = [];
    return quotesCache;
  }

  quotesCache = JSON.parse(fs.readFileSync(QUOTES_FILE, 'utf8'));

  // Filter to only enriched quotes (have metadata)
  quotesCache = quotesCache.filter(q => q.character_situation);

  console.log(`Loaded ${quotesCache.length} enriched quotes`);
  return quotesCache;
}

/**
 * Wisdom types and when to use them
 */
export const WISDOM_TYPES = {
  validation: 'Acknowledge and validate the feeling - "you are not alone"',
  challenge: 'Gently push toward action or courage',
  perspective: 'Offer a broader view on life/situation',
  comfort: 'Soothe and provide warmth',
  warning: 'Show where this path might lead (from tragedies)'
};

/**
 * Communication styles
 */
export const STYLES = {
  shakespearean: {
    name: 'Shakespearean Hauteur',
    description: 'Elevated, theatrical, uses thee/thou',
    example: 'Thou art beset by the selfsame demons that plagued the melancholy Dane...'
  },
  victorian: {
    name: 'Victorian Pomp',
    description: 'Formal, ornate, dignified',
    example: 'One finds oneself in a most familiar predicament, not unlike...'
  },
  redneck: {
    name: 'Redneck Chic',
    description: 'Folksy, plain-spoken, Billy Bob Thornton style',
    example: "Yeah, you're all twisted up inside. Hamlet got like that too..."
  },
  modern: {
    name: 'Straight Modern',
    description: 'Clear, contemporary, accessible',
    example: "That feeling of paralysis? Hamlet knew it well..."
  }
};

/**
 * Score how well a quote matches the user's state
 */
function scoreMatch(quote, userState) {
  let score = 0;

  // Emotion match (highest weight)
  if (quote.emotions && userState.emotions) {
    const emotionOverlap = quote.emotions.filter(e =>
      userState.emotions.includes(e)
    ).length;
    score += emotionOverlap * 30;
  }

  // Theme match
  if (quote.themes && userState.themes) {
    const themeOverlap = quote.themes.filter(t =>
      userState.themes.includes(t)
    ).length;
    score += themeOverlap * 20;
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
 * Find best matching quotes for user state
 */
export function matchQuotes(userState, limit = 5) {
  const quotes = loadQuotes();

  if (quotes.length === 0) {
    return [];
  }

  // Score all quotes
  const scored = quotes.map(quote => ({
    quote,
    score: scoreMatch(quote, userState)
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return top matches
  return scored.slice(0, limit).map(s => s.quote);
}

/**
 * Pick a wisdom type based on user state and rotation
 * Can incorporate user history to avoid repetition
 */
export function pickWisdomType(userState, recentTypes = []) {
  const types = Object.keys(WISDOM_TYPES);

  // Filter out recently used types
  let available = types.filter(t => !recentTypes.includes(t));
  if (available.length === 0) available = types;

  // Weight based on user's emotional valence
  const negativeEmotions = ['fear', 'sadness', 'anger', 'anxiety', 'weariness'];
  const isNegative = userState.emotions?.some(e => negativeEmotions.includes(e));

  if (isNegative) {
    // For negative states, prefer validation/comfort, occasionally challenge
    const weights = {
      validation: 0.35,
      comfort: 0.30,
      perspective: 0.20,
      challenge: 0.10,
      warning: 0.05
    };
    return weightedRandom(available, weights);
  } else {
    // For positive/neutral, more variety
    const weights = {
      perspective: 0.30,
      challenge: 0.25,
      validation: 0.20,
      comfort: 0.15,
      warning: 0.10
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
 * Pick a random communication style
 */
export function pickStyle(preferredStyle = null) {
  if (preferredStyle && STYLES[preferredStyle]) {
    return preferredStyle;
  }

  const styles = Object.keys(STYLES);
  return styles[Math.floor(Math.random() * styles.length)];
}
