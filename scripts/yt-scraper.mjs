#!/usr/bin/env node
/**
 * YouTube Shakespeare Soliloquy Scraper
 * Uses youtube-sr library for search
 */

import pkg from 'youtube-sr';
const YouTube = pkg.default || pkg;
import fs from 'fs';

// Shakespeare speeches to search for
const SPEECHES = [
  // Already have these - skip
  // { play: 'Hamlet', speech: 'To be or not to be' },
  // { play: 'Macbeth', speech: 'Tomorrow and tomorrow' },
  // { play: 'Richard III', speech: 'Now is the winter' },
  // { play: 'Henry V', speech: 'Once more unto the breach' },
  // { play: 'Julius Caesar', speech: 'Friends Romans countrymen' },

  // Need these
  { play: 'Hamlet', speech: 'O what a rogue', search: 'Hamlet "rogue and peasant slave" soliloquy' },
  { play: 'Hamlet', speech: 'What a piece of work is man', search: 'Hamlet "what a piece of work is man"' },
  { play: 'Macbeth', speech: 'Is this a dagger', search: 'Macbeth "is this a dagger" soliloquy film' },
  { play: 'Macbeth', speech: 'Out damned spot', search: 'Lady Macbeth "out damned spot"' },
  { play: 'Othello', speech: 'Put out the light', search: 'Othello "put out the light" final scene' },
  { play: 'King Lear', speech: 'Blow winds', search: 'King Lear storm scene "blow winds"' },
  { play: 'Romeo and Juliet', speech: 'But soft what light', search: 'Romeo balcony scene "but soft what light"' },
  { play: 'Henry V', speech: 'St Crispins Day', search: 'Henry V "St Crispins Day" "band of brothers"' },
  { play: 'Richard II', speech: 'This sceptred isle', search: 'Richard II "sceptred isle" John of Gaunt' },
  { play: 'Merchant of Venice', speech: 'Quality of mercy', search: 'Portia "quality of mercy" Merchant Venice' },
  { play: 'Merchant of Venice', speech: 'Hath not a Jew eyes', search: 'Shylock "hath not a Jew eyes"' },
  { play: 'As You Like It', speech: 'All the worlds a stage', search: '"all the world\'s a stage" seven ages' },
  { play: 'The Tempest', speech: 'Our revels now are ended', search: 'Prospero "our revels now are ended"' },
  { play: 'Twelfth Night', speech: 'If music be the food of love', search: 'Twelfth Night "if music be the food of love"' },
  { play: 'Midsummer Nights Dream', speech: 'The course of true love', search: 'Midsummer "course of true love never did run smooth"' },
  { play: 'Antony and Cleopatra', speech: 'Age cannot wither her', search: '"age cannot wither her" Cleopatra Enobarbus' },
  { play: 'Coriolanus', speech: 'You common cry of curs', search: 'Coriolanus banishment "common cry of curs"' },
  { play: 'Pericles', speech: 'Marina scene', search: 'Pericles Marina recognition scene Shakespeare' },
];

const MIN_VIEWS = 5000;

async function searchSpeech(item) {
  try {
    const results = await YouTube.search(item.search, { limit: 8, type: 'video' });

    const videos = results
      .filter(v => v.views >= MIN_VIEWS)
      .map(v => ({
        id: v.id,
        title: v.title,
        channel: v.channel?.name || 'Unknown',
        views: v.views,
        viewsFormatted: v.views?.toLocaleString() || '0',
        duration: v.durationFormatted,
        thumbnail: v.thumbnail?.url,
      }))
      .sort((a, b) => b.views - a.views);

    return {
      play: item.play,
      speech: item.speech,
      query: item.search,
      videos: videos.slice(0, 3),
    };
  } catch (err) {
    console.error(`  Error: ${err.message}`);
    return { play: item.play, speech: item.speech, videos: [], error: err.message };
  }
}

async function main() {
  console.log('YouTube Shakespeare Soliloquy Scraper');
  console.log('=====================================');
  console.log(`Min views: ${MIN_VIEWS.toLocaleString()}\n`);

  const results = [];

  for (const item of SPEECHES) {
    process.stdout.write(`🔍 ${item.play} - "${item.speech}"... `);

    const result = await searchSpeech(item);
    results.push(result);

    if (result.videos.length > 0) {
      const best = result.videos[0];
      console.log(`✓ ${result.videos.length} found`);
      console.log(`   Best: ${best.id} | ${best.viewsFormatted} views | ${best.channel}`);
      console.log(`   "${best.title.substring(0, 60)}..."`);
    } else {
      console.log('✗ None found');
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 1500));
  }

  // Save results
  const outPath = '/Volumes/SSD/soliloquy-master/tmp/yt-results.json';
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

  // Summary
  console.log('\n\n========== RESULTS FOR GetInspired.jsx ==========\n');

  const found = results.filter(r => r.videos.length > 0);
  console.log(`Found videos for ${found.length}/${SPEECHES.length} speeches\n`);

  for (const r of found) {
    const v = r.videos[0];
    console.log(`// ${r.play} - ${r.speech}`);
    console.log(`{ youtubeId: '${v.id}', title: '${v.title.replace(/'/g, "\\'")}', performer: '${v.channel}', duration: '${v.duration}', views: ${v.views} },`);
    console.log('');
  }

  console.log(`\nFull results: ${outPath}`);
}

main().catch(console.error);
