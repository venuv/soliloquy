#!/usr/bin/env node
/**
 * Generate dramatic beats for soliloquies using Groq LLM.
 *
 * Usage:
 *   node scripts/generate-beats.mjs <work-id>       # Single work
 *   node scripts/generate-beats.mjs --all            # All works without beats
 *   node scripts/generate-beats.mjs --all --dry-run  # Preview only
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHAKESPEARE_PATH = path.join(__dirname, '../server/data/authors/shakespeare.json');

const GROQ_LLM_URL = 'https://api.groq.com/openai/v1/chat/completions';
const LLM_MODEL = 'llama-3.3-70b-versatile';

async function callGroqLLM(systemPrompt, userPrompt, apiKey, temperature = 0.3) {
  const response = await fetch(GROQ_LLM_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq LLM error ${response.status}: ${errText}`);
  }

  const result = await response.json();
  return JSON.parse(result.choices[0].message.content);
}

function validateBeats(beats, chunkCount) {
  if (!Array.isArray(beats) || beats.length === 0) return null;

  const sorted = [...beats].sort((a, b) => a.startChunk - b.startChunk);

  if (sorted[0].startChunk !== 0) return null;
  if (sorted[sorted.length - 1].endChunk !== chunkCount - 1) return null;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startChunk !== sorted[i - 1].endChunk + 1) return null;
  }

  for (const b of sorted) {
    if (!b.label || !b.intention || b.startChunk > b.endChunk) return null;
  }

  return sorted.map((b, i) => ({ id: i, label: b.label, intention: b.intention, startChunk: b.startChunk, endChunk: b.endChunk }));
}

const GENERATOR_PROMPT = `You are an expert Shakespeare acting coach trained in Stanislavski's method of "bits and tasks" (beat analysis). Given a soliloquy, segment it into dramatic beats.

In Stanislavski's system, a BEAT is a unit of action defined by a single OBJECTIVE — what the character is actively trying to do. A new beat begins when the character's ACTIVE VERB changes:
- The character shifts tactic (e.g., from persuading to threatening)
- The character's objective changes (e.g., from questioning to resolving)
- A new line of argument or reasoning begins
- There is a rhetorical pivot signaling a change in direction

The active verb must be TRANSITIVE and PLAYABLE — something an actor can do moment to moment (e.g., "to convince himself that death is preferable", not "sadness" or "contemplation").

Rules:
- Every chunk must belong to exactly one beat
- Beats must be contiguous (no gaps or overlaps)
- Typically 3-7 beats per soliloquy
- Each beat label should be evocative (2-4 words)
- Each intention MUST be phrased as an active objective starting with "To..." (e.g., "To steel himself for action", "To catalogue life's injustices")

Respond with JSON only:
{
  "beats": [
    { "label": "short evocative name", "intention": "To [active verb] ...", "startChunk": 0, "endChunk": 4 }
  ]
}`;

const CRITIC_PROMPT = `You are a master acting teacher trained in Stanislavski's system of beat analysis and Declan Donnellan's approach to actioning. You are reviewing beat divisions for a Shakespeare soliloquy.

Apply these tests to each proposed beat:

ACTIONING TEST — Can each beat be played with a single active verb?
- The intention must be a transitive, playable action ("To persuade", "To warn", "To mock") — not a state ("Feeling sad") or theme ("Death imagery")
- If a beat contains two distinct playable actions, it should be split
- If two adjacent beats share the same playable action, they should be merged
- Intentions MUST start with "To..." and use a specific active verb

BOUNDARY TEST — Does the beat change where the text actually pivots?
- Look for rhetorical markers: "But", "Yet", "For", "O", "No", dashes, colons
- Look for shifts in who/what is being addressed (self, audience, God, absent person)
- Look for shifts in tense (past reflection vs present resolve vs future fear)
- A beat boundary mid-sentence is suspicious unless the sentence itself pivots

PROPORTION TEST — Are beats reasonably sized?
- A single-chunk beat is valid only if it's a genuine pivot point (e.g., "Ay, there's the rub")
- A beat spanning 10+ chunks likely contains multiple actions
- Short soliloquies (8-10 chunks) typically have 3-5 beats; longer ones (25-35) have 5-7

If the beats pass all three tests, return them unchanged. If corrections are needed, return corrected beats with notes explaining each change.

Respond with JSON only:
{
  "approved": true/false,
  "notes": "Brief explanation of any changes made",
  "beats": [...]
}`;

async function generateBeatsForWork(work, apiKey) {
  const fullText = work.chunks
    .map((c, i) => `[${i}] ${c.front} ${c.back}`)
    .join('\n');

  const chunkCount = work.chunks.length;

  const userPrompt = `Soliloquy: "${work.title}"
Character: ${work.character}, Play: ${work.source}, ${work.act}
Total chunks: ${chunkCount} (indices 0 to ${chunkCount - 1})

CRITICAL: The first beat MUST have startChunk: 0. The last beat MUST have endChunk: ${chunkCount - 1}. Beats must be contiguous with no gaps.

Full text with chunk indices:
${fullText}

Segment this into dramatic beats.`;

  // Pass 1: Generate (with retry)
  let genBeats = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const generated = await callGroqLLM(GENERATOR_PROMPT, userPrompt, apiKey, 0.3);
    genBeats = validateBeats(generated.beats, chunkCount);
    if (genBeats) break;
    if (attempt === 0) {
      process.stderr.write('(retry) ');
    }
  }

  if (!genBeats) {
    throw new Error('Generator produced invalid beats after 2 attempts');
  }

  // Pass 2: Critic
  const criticPrompt = `Soliloquy: "${work.title}"
Character: ${work.character}, Play: ${work.source}, ${work.act}
Total chunks: ${chunkCount}

Full text with chunk indices:
${fullText}

Proposed beats:
${JSON.stringify(genBeats, null, 2)}

Review these beat divisions.`;

  const criticized = await callGroqLLM(CRITIC_PROMPT, criticPrompt, apiKey, 0.2);
  const criticBeats = criticized.beats ? validateBeats(criticized.beats, chunkCount) : null;

  return criticBeats || genBeats;
}

// Rate limiting: wait between API calls
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const all = args.includes('--all');
  const workId = args.find(a => !a.startsWith('--'));

  if (!all && !workId) {
    console.error('Usage: node scripts/generate-beats.mjs <work-id>');
    console.error('       node scripts/generate-beats.mjs --all [--dry-run]');
    process.exit(1);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('Error: GROQ_API_KEY environment variable required');
    process.exit(1);
  }

  const content = await fs.readFile(SHAKESPEARE_PATH, 'utf-8');
  const shakespeare = JSON.parse(content);

  const works = all
    ? shakespeare.works.filter(w => !w.beats)
    : shakespeare.works.filter(w => w.id === workId);

  if (works.length === 0) {
    console.log(all ? 'All works already have beats.' : `Work "${workId}" not found or already has beats.`);
    process.exit(0);
  }

  console.log(`\nGenerating beats for ${works.length} work(s)${dryRun ? ' (DRY RUN)' : ''}:\n`);

  let success = 0;
  let failed = 0;

  for (const work of works) {
    try {
      process.stdout.write(`  "${work.title}" (${work.chunks.length} chunks)... `);
      const beats = await generateBeatsForWork(work, apiKey);

      console.log(`${beats.length} beats:`);
      for (const b of beats) {
        const chunkRange = b.startChunk === b.endChunk
          ? `chunk ${b.startChunk}`
          : `chunks ${b.startChunk}-${b.endChunk}`;
        console.log(`    [${b.id}] "${b.label}" (${chunkRange}) — ${b.intention}`);
      }

      if (!dryRun) {
        work.beats = beats;
      }
      success++;

      // Rate limit: 2 seconds between works
      if (works.indexOf(work) < works.length - 1) {
        await sleep(2000);
      }
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      failed++;
    }
  }

  if (!dryRun && success > 0) {
    await fs.writeFile(SHAKESPEARE_PATH, JSON.stringify(shakespeare, null, 2));
    console.log(`\nSaved ${success} work(s) with beats to shakespeare.json`);
  }

  console.log(`\nDone: ${success} succeeded, ${failed} failed`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
