#!/usr/bin/env node
/**
 * Crab - The sourest-natured fetcher that lives
 *
 * Fetches and processes the MIT Shakespeare corpus,
 * extracting soliloquies and notable speeches for Morning Muse.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MIT Shakespeare repository
const REPO_BASE = 'https://raw.githubusercontent.com/TheMITTech/shakespeare/master';

// All plays to fetch
const PLAYS = [
  { id: 'hamlet', title: 'Hamlet', type: 'tragedy' },
  { id: 'macbeth', title: 'Macbeth', type: 'tragedy' },
  { id: 'othello', title: 'Othello', type: 'tragedy' },
  { id: 'lear', title: 'King Lear', type: 'tragedy' },
  { id: 'romeo_juliet', title: 'Romeo and Juliet', type: 'tragedy' },
  { id: 'julius_caesar', title: 'Julius Caesar', type: 'tragedy' },
  { id: 'cleopatra', title: 'Antony and Cleopatra', type: 'tragedy' },
  { id: 'coriolanus', title: 'Coriolanus', type: 'tragedy' },
  { id: 'timon', title: 'Timon of Athens', type: 'tragedy' },
  { id: 'titus', title: 'Titus Andronicus', type: 'tragedy' },
  { id: 'troilus_cressida', title: 'Troilus and Cressida', type: 'tragedy' },
  { id: 'cymbeline', title: 'Cymbeline', type: 'tragedy' },
  { id: 'asyoulikeit', title: 'As You Like It', type: 'comedy' },
  { id: 'comedy_errors', title: 'The Comedy of Errors', type: 'comedy' },
  { id: 'merchant', title: 'The Merchant of Venice', type: 'comedy' },
  { id: 'merry_wives', title: 'The Merry Wives of Windsor', type: 'comedy' },
  { id: 'midsummer', title: "A Midsummer Night's Dream", type: 'comedy' },
  { id: 'much_ado', title: 'Much Ado About Nothing', type: 'comedy' },
  { id: 'taming_shrew', title: 'The Taming of the Shrew', type: 'comedy' },
  { id: 'twelfth_night', title: 'Twelfth Night', type: 'comedy' },
  { id: 'two_gentlemen', title: 'The Two Gentlemen of Verona', type: 'comedy' },
  { id: 'winters_tale', title: "The Winter's Tale", type: 'comedy' },
  { id: 'measure', title: 'Measure for Measure', type: 'comedy' },
  { id: 'allswell', title: "All's Well That Ends Well", type: 'comedy' },
  { id: 'tempest', title: 'The Tempest', type: 'comedy' },
  { id: 'pericles', title: 'Pericles', type: 'comedy' },
  { id: 'lll', title: "Love's Labour's Lost", type: 'comedy' },
  { id: 'henryv', title: 'Henry V', type: 'history' },
  { id: '1henryiv', title: 'Henry IV Part 1', type: 'history' },
  { id: '2henryiv', title: 'Henry IV Part 2', type: 'history' },
  { id: '1henryvi', title: 'Henry VI Part 1', type: 'history' },
  { id: '2henryvi', title: 'Henry VI Part 2', type: 'history' },
  { id: '3henryvi', title: 'Henry VI Part 3', type: 'history' },
  { id: 'henryviii', title: 'Henry VIII', type: 'history' },
  { id: 'richardii', title: 'Richard II', type: 'history' },
  { id: 'richardiii', title: 'Richard III', type: 'history' },
  { id: 'john', title: 'King John', type: 'history' },
];

// Output paths
const RAW_DIR = path.join(__dirname, 'raw');
const OUTPUT_FILE = path.join(__dirname, 'shakespeare-speeches.json');
const MASTER_FILE = path.join(__dirname, 'shakespeare-master.json');

/**
 * Fetch a URL and return content as string
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Sleep for ms milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse HTML to extract speeches
 */
function parseSpeeches(html, playInfo) {
  const speeches = [];

  // Pattern to match speeches: character name in bold, followed by blockquote
  // <A NAME=speech#><b>CHARACTER</b></a>\n<blockquote>...lines...</blockquote>
  const speechPattern = /<A NAME=speech(\d+)><b>([^<]+)<\/b><\/a>\s*<blockquote>([\s\S]*?)<\/blockquote>/gi;

  let match;
  while ((match = speechPattern.exec(html)) !== null) {
    const speechNum = match[1];
    const character = match[2].trim();
    const blockContent = match[3];

    // Extract lines from the blockquote
    // Lines are in format: <A NAME=#>text</A><br>
    const linePattern = /<A NAME=\d+>([^<]*)<\/A>/gi;
    const lines = [];
    let lineMatch;
    while ((lineMatch = linePattern.exec(blockContent)) !== null) {
      const line = lineMatch[1].trim();
      if (line) lines.push(line);
    }

    if (lines.length > 0) {
      speeches.push({
        speechNum: parseInt(speechNum),
        character: cleanCharacterName(character),
        lines: lines,
        lineCount: lines.length,
        text: lines.join('\n'),
        play: playInfo.title,
        playId: playInfo.id,
        playType: playInfo.type
      });
    }
  }

  return speeches;
}

/**
 * Clean character name (remove stage directions, normalize)
 */
function cleanCharacterName(name) {
  return name
    .replace(/\s*\[.*?\]\s*/g, '')  // Remove bracketed text
    .replace(/\s+/g, ' ')            // Normalize whitespace
    .trim()
    .toUpperCase();
}

/**
 * Identify soliloquies and notable speeches
 * Soliloquy: 8+ lines, typically alone on stage or aside
 */
function identifyNotableSpeeches(speeches) {
  const notable = [];

  for (let i = 0; i < speeches.length; i++) {
    const speech = speeches[i];

    // Long speeches (potential soliloquies)
    if (speech.lineCount >= 8) {
      notable.push({
        ...speech,
        type: speech.lineCount >= 15 ? 'soliloquy' : 'speech',
        notable: true
      });
    }
    // Shorter but potentially quotable (4-7 lines)
    else if (speech.lineCount >= 4) {
      // Check for famous opening words or emotional content
      const firstLine = speech.lines[0].toLowerCase();
      const isNotable =
        firstLine.includes('to be') ||
        firstLine.includes('tomorrow') ||
        firstLine.includes('now is') ||
        firstLine.includes('friends, romans') ||
        firstLine.includes('o, ') ||
        firstLine.includes('alas') ||
        firstLine.includes('what') ||
        firstLine.includes('if ') ||
        firstLine.includes('out, ');

      if (isNotable) {
        notable.push({
          ...speech,
          type: 'snippet',
          notable: true
        });
      }
    }
  }

  return notable;
}

/**
 * Fetch all scenes for a play
 */
async function fetchPlay(playInfo) {
  console.log(`  Fetching ${playInfo.title}...`);

  const playDir = path.join(RAW_DIR, playInfo.id);
  if (!fs.existsSync(playDir)) {
    fs.mkdirSync(playDir, { recursive: true });
  }

  const allSpeeches = [];

  // Try to fetch full.html first
  try {
    const fullUrl = `${REPO_BASE}/${playInfo.id}/full.html`;
    const html = await fetchUrl(fullUrl);

    // Save raw HTML
    fs.writeFileSync(path.join(playDir, 'full.html'), html);

    // Parse speeches
    const speeches = parseSpeeches(html, playInfo);
    allSpeeches.push(...speeches);

    console.log(`    Found ${speeches.length} speeches`);
  } catch (err) {
    console.log(`    Warning: Could not fetch full.html for ${playInfo.id}: ${err.message}`);
  }

  await sleep(500); // Be nice to the server

  return allSpeeches;
}

/**
 * Main fetch phase - download all plays
 */
async function fetchAllPlays() {
  console.log('\n🐕 Crab is fetching Shakespeare...\n');

  if (!fs.existsSync(RAW_DIR)) {
    fs.mkdirSync(RAW_DIR, { recursive: true });
  }

  const allSpeeches = [];

  for (const play of PLAYS) {
    try {
      const speeches = await fetchPlay(play);
      allSpeeches.push(...speeches);
    } catch (err) {
      console.log(`  Error fetching ${play.title}: ${err.message}`);
    }

    await sleep(1000); // Rate limiting
  }

  console.log(`\n  Total speeches found: ${allSpeeches.length}`);

  // Identify notable speeches
  const notable = identifyNotableSpeeches(allSpeeches);
  console.log(`  Notable speeches/soliloquies: ${notable.length}`);

  // Save intermediate output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(notable, null, 2));
  console.log(`\n  Saved to ${OUTPUT_FILE}`);

  return notable;
}

/**
 * Generate a unique ID for a speech
 */
function generateId(speech) {
  const playSlug = speech.playId.replace(/_/g, '-');
  const charSlug = speech.character.toLowerCase().replace(/\s+/g, '-').slice(0, 20);
  const textSlug = speech.lines[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 30)
    .replace(/-+$/, '');
  return `${playSlug}-${charSlug}-${textSlug}`;
}

/**
 * Prepare speeches for LLM enrichment
 */
function prepareForEnrichment(speeches) {
  return speeches.map(speech => ({
    id: generateId(speech),
    quote: speech.lines.slice(0, 4).join(' / '),
    full_text: speech.text,
    character: speech.character,
    play: speech.play,
    play_type: speech.playType,
    line_count: speech.lineCount,
    type: speech.type,
    // These will be filled by LLM
    character_situation: null,
    emotions: [],
    themes: [],
    outcome: null,
    wisdom_types: [],
    tone: null
  }));
}

/**
 * Show statistics
 */
function showStats() {
  if (fs.existsSync(OUTPUT_FILE)) {
    const speeches = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));

    console.log('\n📊 Speech Statistics:\n');

    const byPlay = {};
    const byType = { tragedy: 0, comedy: 0, history: 0 };
    const byLength = { soliloquy: 0, speech: 0, snippet: 0 };

    speeches.forEach(s => {
      byPlay[s.play] = (byPlay[s.play] || 0) + 1;
      byType[s.playType]++;
      byLength[s.type]++;
    });

    console.log('By Play Type:');
    Object.entries(byType).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

    console.log('\nBy Speech Length:');
    Object.entries(byLength).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

    console.log('\nTop 10 Plays by Speech Count:');
    Object.entries(byPlay)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  } else {
    console.log('No speeches file found. Run --fetch-only first.');
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  console.log('╔════════════════════════════════════════╗');
  console.log('║  🐕 CRAB - Shakespeare Quote Fetcher   ║');
  console.log('║  "The sourest-natured fetcher"         ║');
  console.log('╚════════════════════════════════════════╝');

  if (args.includes('--stats')) {
    showStats();
  } else if (args.includes('--fetch-only') || args.length === 0) {
    const speeches = await fetchAllPlays();

    // Prepare for enrichment
    const prepared = prepareForEnrichment(speeches);
    fs.writeFileSync(
      path.join(__dirname, 'speeches-for-enrichment.json'),
      JSON.stringify(prepared, null, 2)
    );
    console.log(`\n  Prepared ${prepared.length} speeches for LLM enrichment`);
    console.log('  Run crab-enrich.js to add metadata via LLM');
  }

  console.log('\n🐕 Crab has finished scuttling.\n');
}

main().catch(console.error);
