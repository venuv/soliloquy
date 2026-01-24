#!/usr/bin/env node
/**
 * Crab Enrich - Add LLM metadata to Shakespeare speeches
 *
 * Processes speeches-for-enrichment.json and adds:
 * - character_situation: What dilemma/context the character faces
 * - emotions: Primary emotions expressed (joy, love, hope, fear, sadness, anger, anxiety, weariness)
 * - themes: Key themes (mortality, love, betrayal, ambition, etc.)
 * - outcome: How character deals with situation (overcame, succumbed, lived_with, transformed)
 * - wisdom_types: What kind of wisdom it offers (validation, challenge, perspective, comfort)
 * - tone: Overall tone (contemplative, defiant, mournful, hopeful, bitter, etc.)
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const INPUT_FILE = path.join(__dirname, 'speeches-for-enrichment.json');
const OUTPUT_FILE = path.join(__dirname, 'shakespeare-master.json');
const PROGRESS_FILE = path.join(__dirname, 'enrichment-progress.json');

// Configuration
const BATCH_SIZE = 10; // Process 10 speeches per LLM call
const DELAY_BETWEEN_BATCHES = 1000; // 1 second between batches

/**
 * Sleep for ms milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Build the prompt for enriching a batch of speeches
 */
function buildEnrichmentPrompt(speeches) {
  const speechList = speeches.map((s, i) => `
### Speech ${i + 1}
- **ID**: ${s.id}
- **Character**: ${s.character}
- **Play**: ${s.play} (${s.play_type})
- **Lines**: ${s.line_count}
- **Text**:
${s.full_text}
`).join('\n---\n');

  return `You are a Shakespeare scholar. Analyze these speeches and provide metadata for each.

For each speech, provide:
1. **character_situation**: 1-2 sentences describing what the character is facing/feeling in this moment
2. **emotions**: Array of 1-3 primary emotions from: [joy, love, hope, fear, sadness, anger, anxiety, weariness]
3. **themes**: Array of 2-4 themes from: [mortality, love, betrayal, ambition, power, jealousy, revenge, fate, honor, duty, madness, appearance_vs_reality, nature, time, forgiveness, justice, family, war, identity, transformation]
4. **outcome**: One of: [overcame, succumbed, lived_with, transformed, unresolved]
5. **wisdom_types**: Array of 1-2 from: [validation, challenge, perspective, comfort, warning, inspiration]
6. **tone**: One of: [contemplative, defiant, mournful, hopeful, bitter, passionate, resigned, desperate, playful, menacing, tender, wrathful]

${speechList}

Respond with a JSON array containing objects with the speech ID and metadata:
\`\`\`json
[
  {
    "id": "speech-id-here",
    "character_situation": "...",
    "emotions": ["...", "..."],
    "themes": ["...", "...", "..."],
    "outcome": "...",
    "wisdom_types": ["...", "..."],
    "tone": "..."
  }
]
\`\`\``;
}

/**
 * Parse LLM response to extract metadata
 */
function parseEnrichmentResponse(response) {
  // Extract JSON from response
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error('Failed to parse JSON from response:', e.message);
      return null;
    }
  }

  // Try parsing the whole response as JSON
  try {
    return JSON.parse(response);
  } catch (e) {
    console.error('Failed to parse response as JSON:', e.message);
    return null;
  }
}

/**
 * Enrich a batch of speeches using Claude
 */
async function enrichBatch(client, speeches) {
  const prompt = buildEnrichmentPrompt(speeches);

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const responseText = message.content[0].text;
    const enrichments = parseEnrichmentResponse(responseText);

    if (!enrichments) {
      console.error('Failed to parse enrichments for batch');
      return speeches; // Return original speeches without enrichment
    }

    // Merge enrichments with original speeches
    const enrichedSpeeches = speeches.map(speech => {
      const enrichment = enrichments.find(e => e.id === speech.id);
      if (enrichment) {
        return {
          ...speech,
          character_situation: enrichment.character_situation,
          emotions: enrichment.emotions,
          themes: enrichment.themes,
          outcome: enrichment.outcome,
          wisdom_types: enrichment.wisdom_types,
          tone: enrichment.tone
        };
      }
      return speech;
    });

    return enrichedSpeeches;
  } catch (error) {
    console.error('API error:', error.message);
    return speeches; // Return original speeches without enrichment
  }
}

/**
 * Load progress from checkpoint file
 */
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    } catch (e) {
      return { processedIds: [], enriched: [] };
    }
  }
  return { processedIds: [], enriched: [] };
}

/**
 * Save progress to checkpoint file
 */
function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

/**
 * Main enrichment process
 */
async function main() {
  const args = process.argv.slice(2);

  console.log('╔════════════════════════════════════════╗');
  console.log('║  🐕 CRAB ENRICH - LLM Metadata Adder   ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set');
    console.log('\nSet it with:');
    console.log('  export ANTHROPIC_API_KEY=your-key-here');
    process.exit(1);
  }

  // Load speeches
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Error: ${INPUT_FILE} not found. Run crab.js first.`);
    process.exit(1);
  }

  const allSpeeches = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`Loaded ${allSpeeches.length} speeches\n`);

  // Load progress for resumable processing
  let progress = loadProgress();
  const processedSet = new Set(progress.processedIds);

  // Filter out already processed speeches
  const remaining = allSpeeches.filter(s => !processedSet.has(s.id));
  console.log(`Already processed: ${progress.processedIds.length}`);
  console.log(`Remaining: ${remaining.length}\n`);

  if (remaining.length === 0) {
    console.log('All speeches already enriched!');
    console.log(`Output file: ${OUTPUT_FILE}`);
    return;
  }

  // Limit for testing
  const limit = args.includes('--limit')
    ? parseInt(args[args.indexOf('--limit') + 1])
    : remaining.length;
  const toProcess = remaining.slice(0, limit);

  console.log(`Processing ${toProcess.length} speeches in batches of ${BATCH_SIZE}...\n`);

  // Initialize Anthropic client
  const client = new Anthropic();

  // Process in batches
  const batches = [];
  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    batches.push(toProcess.slice(i, i + BATCH_SIZE));
  }

  let enriched = [...progress.enriched];
  let batchNum = 0;

  for (const batch of batches) {
    batchNum++;
    process.stdout.write(`Batch ${batchNum}/${batches.length} (${batch.length} speeches)... `);

    try {
      const enrichedBatch = await enrichBatch(client, batch);
      enriched.push(...enrichedBatch);

      // Update progress
      batch.forEach(s => processedSet.add(s.id));
      progress.processedIds = Array.from(processedSet);
      progress.enriched = enriched;
      saveProgress(progress);

      console.log('✓');
    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
    }

    // Rate limiting
    if (batchNum < batches.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  // Merge with any speeches that weren't processed (combine enriched + original unprocessed)
  const enrichedIds = new Set(enriched.map(s => s.id));
  const final = [
    ...enriched,
    ...allSpeeches.filter(s => !enrichedIds.has(s.id))
  ];

  // Save final output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(final, null, 2));
  console.log(`\n✓ Saved ${final.length} speeches to ${OUTPUT_FILE}`);

  // Stats
  const withMetadata = final.filter(s => s.character_situation).length;
  console.log(`  With metadata: ${withMetadata}`);
  console.log(`  Without metadata: ${final.length - withMetadata}`);

  console.log('\n🐕 Crab has finished enriching.\n');
}

main().catch(console.error);
