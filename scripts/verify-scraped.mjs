#!/usr/bin/env node
// Verify scraped YouTube IDs

const FOUND = [
  { id: 'Fje1acYFQg4', speech: 'O what a rogue' },
  { id: '8205kJSig4A', speech: 'What a piece of work' },
  { id: 'pusU90ov8pQ', speech: 'Is this a dagger' },
  { id: '9dgbbtUbgcM', speech: 'Out damned spot (Dench)' },
  { id: 'H3De429jdIE', speech: 'Othello - Iago villain' },
  { id: 'zn955417swY', speech: 'Blow winds (Allam)' },
  { id: 'S0qao2xINsE', speech: 'Romeo balcony' },
  { id: '9P8hogkNdu8', speech: 'St Crispins Day' },
  { id: 'hQQyyMyTHa0', speech: 'Sceptred isle' },
  { id: 'wmmBT_4dmI0', speech: 'Quality of mercy' },
  { id: 'GWLBwkj07OY', speech: 'Hath not a Jew eyes (Suchet)' },
  { id: 'rOHhUUWeKN8', speech: 'Seven ages of man' },
  { id: 'KFNTAsC8qQ0', speech: 'Our revels (Threlfall)' },
  { id: 'SJcCLr19tIs', speech: 'If music be the food' },
  { id: 'JAQhxXB56U4', speech: 'Course of true love' },
  { id: 'MrAPDOT3xMM', speech: 'Coriolanus' },
];

async function verify(id) {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function main() {
  console.log('Verifying scraped videos...\n');
  let good = 0;

  for (const v of FOUND) {
    const result = await verify(v.id);
    if (result) {
      console.log(`✓ ${v.id} - ${v.speech}`);
      console.log(`  "${result.title}"`);
      good++;
    } else {
      console.log(`✗ ${v.id} - ${v.speech} - BROKEN`);
    }
  }

  console.log(`\n${good}/${FOUND.length} verified`);
}

main();
