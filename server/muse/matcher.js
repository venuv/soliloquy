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
 * Pick a random communication style
 */
export function pickStyle(preferredStyle = null) {
  if (preferredStyle && STYLES[preferredStyle]) {
    return preferredStyle;
  }

  const styles = Object.keys(STYLES);
  return styles[Math.floor(Math.random() * styles.length)];
}
