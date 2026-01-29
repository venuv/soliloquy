import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const NEWS_DATA_FILE = path.join(__dirname, '../data/shakespeare-news.json');
const NEWS_CACHE_FILE = path.join(__dirname, '../data/news-cache.json');

// Cache duration: 6 hours
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000;

/**
 * Load news data from JSON file
 */
async function loadNewsData() {
  try {
    const content = await fs.readFile(NEWS_DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to load news data:', error);
    return { onThisDay: [], festivals: [], notablePerformances: [] };
  }
}

/**
 * Load cached news (for external sources)
 */
async function loadNewsCache() {
  try {
    const content = await fs.readFile(NEWS_CACHE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { currentNews: [], lastFetched: null };
  }
}

/**
 * Save news cache
 */
async function saveNewsCache(cache) {
  await fs.writeFile(NEWS_CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Get "On This Day" events for today's date
 */
function getOnThisDay(newsData) {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const events = newsData.onThisDay.filter(
    e => e.month === month && e.day === day
  );

  // If no events today, get closest upcoming events
  if (events.length === 0) {
    const allEvents = newsData.onThisDay
      .map(e => {
        const eventDate = new Date(today.getFullYear(), e.month - 1, e.day);
        if (eventDate < today) {
          eventDate.setFullYear(eventDate.getFullYear() + 1);
        }
        return { ...e, daysUntil: Math.floor((eventDate - today) / (1000 * 60 * 60 * 24)) };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 3);

    return {
      today: [],
      upcoming: allEvents,
      message: 'No events on this day, showing upcoming events'
    };
  }

  return {
    today: events,
    upcoming: [],
    message: null
  };
}

/**
 * Get a random notable performance
 */
function getRandomPerformance(newsData) {
  const performances = newsData.notablePerformances || [];
  if (performances.length === 0) return null;

  // Use date-based seed for daily consistency
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const index = seed % performances.length;

  return performances[index];
}

/**
 * Get current festival season info
 */
function getCurrentFestivals(newsData) {
  const today = new Date();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonth = monthNames[today.getMonth()];

  const festivals = (newsData.festivals || []).map(festival => {
    // Simple season parsing
    const season = festival.season.toLowerCase();
    let isActive = false;

    if (season.includes('year-round')) {
      isActive = true;
    } else {
      // Check month ranges like "April - October"
      const monthMatch = season.match(/(\w+)\s*-\s*(\w+)/);
      if (monthMatch) {
        const startMonth = monthNames.findIndex(m => m.toLowerCase().startsWith(monthMatch[1].slice(0, 3)));
        const endMonth = monthNames.findIndex(m => m.toLowerCase().startsWith(monthMatch[2].slice(0, 3)));
        const currentMonthIndex = today.getMonth();

        if (startMonth <= endMonth) {
          isActive = currentMonthIndex >= startMonth && currentMonthIndex <= endMonth;
        } else {
          // Wraps around year
          isActive = currentMonthIndex >= startMonth || currentMonthIndex <= endMonth;
        }
      }
    }

    return { ...festival, isActive };
  });

  return {
    active: festivals.filter(f => f.isActive),
    upcoming: festivals.filter(f => !f.isActive).slice(0, 3)
  };
}

/**
 * Fetch current news from external sources (placeholder for future implementation)
 * In production, this would scrape/API call news sources
 */
async function fetchCurrentNews() {
  // For now, return curated recent news items
  // In future: scrape from Shakespeare-related news sources
  return [
    {
      id: 'globe-2026-season',
      title: "Shakespeare's Globe announces 2026 season",
      summary: "The reconstructed Globe Theatre reveals its 2026 summer program featuring fresh interpretations of the classics.",
      source: "Shakespeare's Globe",
      date: "2026-01-15",
      category: "theater",
      url: "https://www.shakespearesglobe.com"
    },
    {
      id: 'rsc-hamlet-tour',
      title: "RSC's Hamlet embarks on UK tour",
      summary: "The Royal Shakespeare Company brings its acclaimed production of Hamlet to venues across Britain.",
      source: "Royal Shakespeare Company",
      date: "2026-01-20",
      category: "theater",
      url: "https://www.rsc.org.uk"
    },
    {
      id: 'folger-exhibition',
      title: "New Folger exhibition explores Shakespeare's sources",
      summary: "The Folger Shakespeare Library opens 'Before the Bard: Shakespeare's Source Texts' featuring rare manuscripts.",
      source: "Folger Shakespeare Library",
      date: "2026-01-10",
      category: "exhibition",
      url: "https://www.folger.edu"
    }
  ];
}

/**
 * GET /api/news
 * Main endpoint - returns daily Shakespeare news digest
 */
router.get('/', async (req, res) => {
  try {
    const newsData = await loadNewsData();
    const cache = await loadNewsCache();

    // Check if we need to refresh current news
    let currentNews = cache.currentNews || [];
    const cacheAge = cache.lastFetched ? Date.now() - new Date(cache.lastFetched).getTime() : Infinity;

    if (cacheAge > CACHE_DURATION_MS || currentNews.length === 0) {
      try {
        currentNews = await fetchCurrentNews();
        await saveNewsCache({
          currentNews,
          lastFetched: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to fetch current news:', error);
        // Fall back to cached news
      }
    }

    const onThisDay = getOnThisDay(newsData);
    const featuredPerformance = getRandomPerformance(newsData);
    const festivals = getCurrentFestivals(newsData);

    res.json({
      date: new Date().toISOString().split('T')[0],
      onThisDay,
      currentNews,
      featuredPerformance,
      festivals,
      meta: {
        lastUpdated: newsData.lastUpdated,
        totalHistoricalEvents: newsData.onThisDay?.length || 0,
        totalFestivals: newsData.festivals?.length || 0
      }
    });
  } catch (error) {
    console.error('News error:', error);
    res.status(500).json({ error: 'Failed to load news', message: error.message });
  }
});

/**
 * GET /api/news/on-this-day
 * Get only "On This Day" events
 */
router.get('/on-this-day', async (req, res) => {
  try {
    const newsData = await loadNewsData();
    const onThisDay = getOnThisDay(newsData);
    res.json(onThisDay);
  } catch (error) {
    console.error('On This Day error:', error);
    res.status(500).json({ error: 'Failed to load historical events' });
  }
});

/**
 * GET /api/news/on-this-day/:month/:day
 * Get events for a specific date
 */
router.get('/on-this-day/:month/:day', async (req, res) => {
  try {
    const month = parseInt(req.params.month, 10);
    const day = parseInt(req.params.day, 10);

    if (isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid month (1-12)' });
    }
    if (isNaN(day) || day < 1 || day > 31) {
      return res.status(400).json({ error: 'Invalid day (1-31)' });
    }

    const newsData = await loadNewsData();
    const events = newsData.onThisDay.filter(
      e => e.month === month && e.day === day
    );

    res.json({
      date: `${month}/${day}`,
      events,
      count: events.length
    });
  } catch (error) {
    console.error('Date lookup error:', error);
    res.status(500).json({ error: 'Failed to load events for date' });
  }
});

/**
 * GET /api/news/festivals
 * Get all festivals with current status
 */
router.get('/festivals', async (req, res) => {
  try {
    const newsData = await loadNewsData();
    const festivals = getCurrentFestivals(newsData);
    res.json(festivals);
  } catch (error) {
    console.error('Festivals error:', error);
    res.status(500).json({ error: 'Failed to load festivals' });
  }
});

/**
 * GET /api/news/performances
 * Get notable performances
 */
router.get('/performances', async (req, res) => {
  try {
    const newsData = await loadNewsData();
    res.json({
      performances: newsData.notablePerformances || [],
      featured: getRandomPerformance(newsData)
    });
  } catch (error) {
    console.error('Performances error:', error);
    res.status(500).json({ error: 'Failed to load performances' });
  }
});

export default router;
