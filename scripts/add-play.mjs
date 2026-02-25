#!/usr/bin/env node
/**
 * Pipeline script to add soliloquies from a Shakespeare play
 *
 * Usage: node scripts/add-play.mjs <play-name>
 *
 * This script:
 * 1. Reads play data from scripts/plays/<play-name>.json
 * 2. Adds soliloquies to server/data/authors/shakespeare.json
 * 3. Validates the data structure
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYS_DIR = path.join(__dirname, 'plays');
const SHAKESPEARE_PATH = path.join(__dirname, '../server/data/authors/shakespeare.json');

async function loadShakespeare() {
  const content = await fs.readFile(SHAKESPEARE_PATH, 'utf-8');
  return JSON.parse(content);
}

async function saveShakespeare(data) {
  await fs.writeFile(SHAKESPEARE_PATH, JSON.stringify(data, null, 2));
}

async function loadPlayData(playName) {
  const playPath = path.join(PLAYS_DIR, `${playName}.json`);
  try {
    const content = await fs.readFile(playPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`Play data not found: ${playPath}`);
      console.error(`\nCreate a file at scripts/plays/${playName}.json with structure:`);
      console.error(JSON.stringify({
        play: "Play Name",
        soliloquies: [{
          id: "speech-id",
          title: "First line or title",
          character: "Character Name",
          act: "Act X, Scene Y",
          chunks: [
            { front: "First part of line", back: "second part" }
          ]
        }]
      }, null, 2));
      process.exit(1);
    }
    throw err;
  }
}

function validateBeats(beats, chunkCount, solId) {
  if (!Array.isArray(beats) || beats.length === 0) {
    throw new Error(`Soliloquy '${solId}' beats array is empty`);
  }

  const sorted = [...beats].sort((a, b) => a.startChunk - b.startChunk);

  if (sorted[0].startChunk !== 0) {
    throw new Error(`Soliloquy '${solId}' first beat must start at chunk 0`);
  }
  if (sorted[sorted.length - 1].endChunk !== chunkCount - 1) {
    throw new Error(`Soliloquy '${solId}' last beat must end at chunk ${chunkCount - 1}`);
  }

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startChunk !== sorted[i - 1].endChunk + 1) {
      throw new Error(`Soliloquy '${solId}' beats have gap/overlap between beat ${i - 1} and ${i}`);
    }
  }

  for (const b of sorted) {
    if (!b.label || !b.intention) {
      throw new Error(`Soliloquy '${solId}' beat missing label or intention`);
    }
  }

  return sorted.map((b, i) => ({ id: i, label: b.label, intention: b.intention, startChunk: b.startChunk, endChunk: b.endChunk }));
}

function validateSoliloquy(sol, playName) {
  const required = ['id', 'title', 'character', 'act', 'chunks'];
  for (const field of required) {
    if (!sol[field]) {
      throw new Error(`Missing required field '${field}' in soliloquy: ${sol.id || 'unknown'}`);
    }
  }

  if (!Array.isArray(sol.chunks) || sol.chunks.length === 0) {
    throw new Error(`Soliloquy '${sol.id}' must have at least one chunk`);
  }

  for (const chunk of sol.chunks) {
    if (!chunk.front || !chunk.back) {
      throw new Error(`Invalid chunk in '${sol.id}': must have 'front' and 'back'`);
    }
  }

  const result = {
    id: sol.id,
    title: sol.title,
    source: playName,
    character: sol.character,
    act: sol.act,
    chunks: sol.chunks
  };

  // Validate and include beats if provided
  if (sol.beats) {
    result.beats = validateBeats(sol.beats, sol.chunks.length, sol.id);
    console.log(`    Beats: ${result.beats.length} (validated)`);
  }

  return result;
}

async function addPlay(playName) {
  console.log(`\nAdding soliloquies from: ${playName}\n`);

  // Load existing Shakespeare data
  const shakespeare = await loadShakespeare();
  const existingIds = new Set(shakespeare.works.map(w => w.id));

  // Load play data
  const playData = await loadPlayData(playName);

  let added = 0;
  let skipped = 0;

  for (const sol of playData.soliloquies) {
    if (existingIds.has(sol.id)) {
      console.log(`  SKIP: ${sol.id} (already exists)`);
      skipped++;
      continue;
    }

    const validated = validateSoliloquy(sol, playData.play);
    shakespeare.works.push(validated);
    console.log(`  ADD: "${validated.title}" (${validated.chunks.length} chunks)`);
    added++;
  }

  // Save updated data
  await saveShakespeare(shakespeare);

  console.log(`\nDone! Added ${added} soliloquies, skipped ${skipped}`);
  console.log(`Total works: ${shakespeare.works.length}`);
}

// Main
const playName = process.argv[2];
if (!playName) {
  console.error('Usage: node scripts/add-play.mjs <play-name>');
  console.error('\nAvailable plays:');
  try {
    const files = await fs.readdir(PLAYS_DIR);
    for (const f of files) {
      if (f.endsWith('.json')) {
        console.error(`  - ${f.replace('.json', '')}`);
      }
    }
  } catch {
    console.error('  (no plays directory yet)');
  }
  process.exit(1);
}

addPlay(playName).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
