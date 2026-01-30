#!/usr/bin/env node
/**
 * Re-chunk soliloquies by verse line (one line = one card)
 *
 * Usage:
 *   node scripts/rechunk-by-verse.mjs <workId>           # Re-chunk specific work
 *   node scripts/rechunk-by-verse.mjs --all              # Re-chunk all works
 *   node scripts/rechunk-by-verse.mjs --preview <workId> # Preview without saving
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHAKESPEARE_PATH = path.join(__dirname, '../server/data/authors/shakespeare.json');

// Verse line sources - proper line breaks for each soliloquy
// Key: work ID, Value: array of verse lines
const VERSE_SOURCES = {
  'to-be-or-not-to-be': [
    "To be, or not to be, that is the question:",
    "Whether 'tis nobler in the mind to suffer",
    "The slings and arrows of outrageous fortune,",
    "Or to take arms against a sea of troubles",
    "And by opposing end them. To die—to sleep,",
    "No more; and by a sleep to say we end",
    "The heart-ache and the thousand natural shocks",
    "That flesh is heir to: 'tis a consummation",
    "Devoutly to be wish'd. To die, to sleep;",
    "To sleep, perchance to dream—ay, there's the rub:",
    "For in that sleep of death what dreams may come,",
    "When we have shuffled off this mortal coil,",
    "Must give us pause—there's the respect",
    "That makes calamity of so long life.",
    "For who would bear the whips and scorns of time,",
    "Th'oppressor's wrong, the proud man's contumely,",
    "The pangs of dispriz'd love, the law's delay,",
    "The insolence of office, and the spurns",
    "That patient merit of th'unworthy takes,",
    "When he himself might his quietus make",
    "With a bare bodkin? Who would fardels bear,",
    "To grunt and sweat under a weary life,",
    "But that the dread of something after death,",
    "The undiscovere'd country, from whose bourn",
    "No traveller returns, puzzles the will,",
    "And makes us rather bear those ills we have",
    "Than fly to others that we know not of?",
    "Thus conscience does make cowards of us all,",
    "And thus the native hue of resolution",
    "Is sicklied o'er with the pale cast of thought,",
    "And enterprises of great pitch and moment",
    "With this regard their currents turn awry",
    "And lose the name of action."
  ],
  'coriolanus-banishment': [
    "You common cry of curs! whose breath I hate",
    "As reek o' the rotten fens, whose loves I prize",
    "As the dead carcasses of unburied men",
    "That do corrupt my air, I banish you!",
    "And here remain with your uncertainty!",
    "Let every feeble rumour shake your hearts!",
    "Your enemies, with nodding of their plumes,",
    "Fan you into despair! Have the power still",
    "To banish your defenders; till at length",
    "Your ignorance, which finds not till it feels,",
    "Making not reservation of yourselves,",
    "Still your own foes, deliver you as most",
    "Abated captives to some nation",
    "That won you without blows! Despising,",
    "For you, the city, thus I turn my back:",
    "There is a world elsewhere."
  ],
  'tomorrow-and-tomorrow': [
    "Tomorrow, and tomorrow, and tomorrow,",
    "Creeps in this petty pace from day to day,",
    "To the last syllable of recorded time;",
    "And all our yesterdays have lighted fools",
    "The way to dusty death. Out, out, brief candle!",
    "Life's but a walking shadow, a poor player,",
    "That struts and frets his hour upon the stage,",
    "And then is heard no more. It is a tale",
    "Told by an idiot, full of sound and fury,",
    "Signifying nothing."
  ]
};

// Convert verse line to chunk format (front/back split at midpoint for card flip)
function lineToChunk(line) {
  const words = line.split(/\s+/);
  const midpoint = Math.ceil(words.length / 2);
  return {
    front: words.slice(0, midpoint).join(' '),
    back: words.slice(midpoint).join(' ')
  };
}

async function loadShakespeare() {
  const content = await fs.readFile(SHAKESPEARE_PATH, 'utf-8');
  return JSON.parse(content);
}

async function saveShakespeare(data) {
  await fs.writeFile(SHAKESPEARE_PATH, JSON.stringify(data, null, 2));
}

async function rechunkWork(workId, preview = false) {
  const shakespeare = await loadShakespeare();
  const work = shakespeare.works.find(w => w.id === workId);

  if (!work) {
    console.error(`Work not found: ${workId}`);
    return false;
  }

  const verseLines = VERSE_SOURCES[workId];
  if (!verseLines) {
    console.error(`No verse source defined for: ${workId}`);
    console.log('Available:', Object.keys(VERSE_SOURCES).join(', '));
    return false;
  }

  const newChunks = verseLines.map(lineToChunk);

  console.log(`\n=== ${work.title} ===`);
  console.log(`Old chunks: ${work.chunks.length}`);
  console.log(`New chunks: ${newChunks.length}`);
  console.log('\nNew chunking:');
  newChunks.forEach((c, i) => {
    console.log(`  ${i + 1}. "${c.front}" | "${c.back}"`);
  });

  if (preview) {
    console.log('\n[Preview mode - not saved]');
    return true;
  }

  work.chunks = newChunks;
  await saveShakespeare(shakespeare);
  console.log('\n✓ Saved');
  return true;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/rechunk-by-verse.mjs <workId>');
    console.log('  node scripts/rechunk-by-verse.mjs --preview <workId>');
    console.log('  node scripts/rechunk-by-verse.mjs --list');
    console.log('\nAvailable works with verse sources:');
    Object.keys(VERSE_SOURCES).forEach(id => console.log(`  - ${id}`));
    return;
  }

  if (args[0] === '--list') {
    const shakespeare = await loadShakespeare();
    console.log('All works:');
    shakespeare.works.forEach(w => {
      const hasSource = VERSE_SOURCES[w.id] ? '✓' : ' ';
      console.log(`  ${hasSource} ${w.id} (${w.chunks.length} chunks) - "${w.title}"`);
    });
    return;
  }

  const preview = args[0] === '--preview';
  const workId = preview ? args[1] : args[0];

  if (!workId) {
    console.error('Please specify a work ID');
    return;
  }

  await rechunkWork(workId, preview);
}

main().catch(console.error);
