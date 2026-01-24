import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { matchQuotes, pickWisdomType, pickStyle, STYLES, loadQuotes } from '../muse/matcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const MUSE_ANALYTICS_FILE = path.join(__dirname, '../data/muse-analytics.json');

// Initialize Anthropic client
let anthropic = null;
function getClient() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic();
  }
  return anthropic;
}

// Preload quotes on startup
loadQuotes();

/**
 * Parse user input to extract emotions and themes
 */
async function parseUserInput(client, userInput) {
  const prompt = `Analyze this morning reflection and extract the emotional state.

User says: "${userInput}"

Respond with JSON only:
{
  "emotions": ["..."],  // 1-3 from: joy, love, hope, fear, sadness, anger, anxiety, weariness
  "themes": ["..."],    // 2-4 from: mortality, love, betrayal, ambition, power, jealousy, revenge, fate, honor, duty, madness, identity, transformation, decision, loss, time, family, change
  "intensity": "...",   // low, medium, high
  "valence": "..."      // positive, negative, mixed
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = message.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Failed to parse user input analysis');
}

/**
 * Generate styled response with quote
 */
async function generateResponse(client, quote, userInput, userState, style) {
  const styleConfig = STYLES[style];

  const prompt = `You are the Morning Muse, offering Shakespearean wisdom to start the day.

USER'S MORNING STATE:
"${userInput}"
Emotions: ${userState.emotions?.join(', ')}
Themes: ${userState.themes?.join(', ')}

MATCHED SHAKESPEARE QUOTE:
Character: ${quote.character}
Play: ${quote.play}
Situation: ${quote.character_situation}
Quote:
"${quote.full_text?.split('\n').slice(0, 8).join('\n')}"

COMMUNICATION STYLE: ${styleConfig.name}
${styleConfig.description}
Example tone: "${styleConfig.example}"

Write a response that:
1. Acknowledges the user's feeling (1 sentence)
2. Connects it to the character's situation (1-2 sentences)
3. Presents 2-4 key lines from the quote
4. Offers a brief insight or comfort (1 sentence)

Keep it concise - under 150 words total. Use the specified communication style throughout.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }]
  });

  return message.content[0].text;
}

/**
 * Load or initialize muse analytics
 */
async function loadMuseAnalytics() {
  try {
    const content = await fs.readFile(MUSE_ANALYTICS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { responses: [], feedback: [] };
  }
}

/**
 * Save muse analytics
 */
async function saveMuseAnalytics(analytics) {
  await fs.writeFile(MUSE_ANALYTICS_FILE, JSON.stringify(analytics, null, 2));
}

/**
 * POST /api/muse
 * Main endpoint - takes user input, returns Shakespeare wisdom
 */
router.post('/', async (req, res) => {
  const client = getClient();
  if (!client) {
    return res.status(503).json({
      error: 'Muse unavailable',
      message: 'ANTHROPIC_API_KEY not configured'
    });
  }

  const { input, style: preferredStyle } = req.body;

  if (!input || input.trim().length < 5) {
    return res.status(400).json({ error: 'Please share how you are feeling (at least a few words)' });
  }

  try {
    // Step 1: Parse user input
    const userState = await parseUserInput(client, input);

    // Step 2: Pick wisdom type (system varies)
    const wisdomType = pickWisdomType(userState);
    userState.wisdom_type = wisdomType;

    // Step 3: Match quotes
    const matches = matchQuotes(userState, 3);
    if (matches.length === 0) {
      return res.status(503).json({
        error: 'No quotes available',
        message: 'Quote database not loaded. Run crab-enrich.js first.'
      });
    }

    // Pick best match (first one, already sorted by score)
    const quote = matches[0];

    // Step 4: Pick style
    const style = pickStyle(preferredStyle);

    // Step 5: Generate response
    const response = await generateResponse(client, quote, input, userState, style);

    // Record for analytics
    const analytics = await loadMuseAnalytics();
    const responseId = `muse-${Date.now()}`;
    analytics.responses.push({
      id: responseId,
      timestamp: new Date().toISOString(),
      userInput: input.substring(0, 500),
      userState,
      quoteId: quote.id,
      quoteSummary: quote.quote,
      character: quote.character,
      play: quote.play,
      wisdomType,
      style
    });

    // Keep last 1000 responses
    if (analytics.responses.length > 1000) {
      analytics.responses = analytics.responses.slice(-1000);
    }
    await saveMuseAnalytics(analytics);

    res.json({
      id: responseId,
      response,
      quote: {
        text: quote.full_text?.split('\n').slice(0, 8).join('\n'),
        character: quote.character,
        play: quote.play,
        situation: quote.character_situation
      },
      meta: {
        emotions: userState.emotions,
        wisdomType,
        style: STYLES[style].name
      }
    });
  } catch (error) {
    console.error('Muse error:', error);
    res.status(500).json({ error: 'The muse is momentarily silent', message: error.message });
  }
});

/**
 * POST /api/muse/feedback
 * Record like/dislike for a response
 */
router.post('/feedback', async (req, res) => {
  const { responseId, liked, comment } = req.body;

  if (!responseId || typeof liked !== 'boolean') {
    return res.status(400).json({ error: 'responseId and liked (boolean) required' });
  }

  try {
    const analytics = await loadMuseAnalytics();

    analytics.feedback.push({
      responseId,
      liked,
      comment: comment?.substring(0, 500),
      timestamp: new Date().toISOString()
    });

    // Keep last 1000 feedback entries
    if (analytics.feedback.length > 1000) {
      analytics.feedback = analytics.feedback.slice(-1000);
    }

    await saveMuseAnalytics(analytics);

    res.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

/**
 * GET /api/muse/stats
 * Get muse usage statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const analytics = await loadMuseAnalytics();

    const totalResponses = analytics.responses.length;
    const totalFeedback = analytics.feedback.length;
    const likes = analytics.feedback.filter(f => f.liked).length;
    const dislikes = totalFeedback - likes;

    // Emotion distribution
    const emotions = {};
    analytics.responses.forEach(r => {
      r.userState?.emotions?.forEach(e => {
        emotions[e] = (emotions[e] || 0) + 1;
      });
    });

    // Style distribution
    const styles = {};
    analytics.responses.forEach(r => {
      styles[r.style] = (styles[r.style] || 0) + 1;
    });

    // Top plays
    const plays = {};
    analytics.responses.forEach(r => {
      plays[r.play] = (plays[r.play] || 0) + 1;
    });

    res.json({
      totalResponses,
      totalFeedback,
      likes,
      dislikes,
      approvalRate: totalFeedback > 0 ? Math.round((likes / totalFeedback) * 100) : null,
      emotionDistribution: emotions,
      styleDistribution: styles,
      topPlays: Object.entries(plays)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([play, count]) => ({ play, count }))
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/muse/quotes/count
 * Get count of available quotes
 */
router.get('/quotes/count', (req, res) => {
  const quotes = loadQuotes();
  res.json({ count: quotes.length });
});

export default router;
