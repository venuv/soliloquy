#!/usr/bin/env node
// Search for working YouTube videos for Shakespeare speeches

const CANDIDATES = [
  // All the world's a stage - As You Like It
  { youtubeId: 'pMvKyYDJuX0', expected: "All the world's a stage" },
  { youtubeId: 'PBHwMF_YLSU', expected: "All the world's a stage Kevin Kline" },
  { youtubeId: 'qRaEkT1s_gA', expected: "Seven ages of man" },

  // Is this a dagger - Macbeth
  { youtubeId: 'IwPPy4GN5pc', expected: "Is this a dagger - Macbeth" },
  { youtubeId: 'W53SL6rNaJ4', expected: "Is this a dagger - Patrick Stewart" },
  { youtubeId: 'qjNm5gIl3dQ', expected: "Is this a dagger - Fassbender" },

  // Quality of mercy - Merchant of Venice
  { youtubeId: 'T-XKqPT6tV4', expected: "Quality of mercy - Portia" },
  { youtubeId: 'eCLwR3-WSAY', expected: "Quality of mercy - Al Pacino" },

  // This sceptred isle - Richard II
  { youtubeId: 'OPPH1Y-4bUk', expected: "This sceptred isle - John of Gaunt" },
  { youtubeId: '8VNJe0NQWKQ', expected: "This sceptred isle - Ben Whishaw" },

  // Romeo and Juliet - Balcony
  { youtubeId: 'SEzskNtFnIY', expected: "But soft what light - DiCaprio" },
  { youtubeId: 'wSTvKpBqbIc', expected: "Balcony scene - Zeffirelli 1968" },

  // O what a rogue - Hamlet
  { youtubeId: 'O4F-Bq5FqDI', expected: "O what a rogue - Hamlet" },
  { youtubeId: 'dM8l9d-TB6c', expected: "O what a rogue - Branagh" },

  // St Crispin's Day - Henry V
  { youtubeId: 'DjJ5q6hS1wM', expected: "St Crispin's Day - Branagh" },
  { youtubeId: '680NlY4j_YE', expected: "Band of brothers speech" },

  // What a piece of work is man - Hamlet
  { youtubeId: 'DjFQ0vBv3Ss', expected: "What a piece of work is man" },

  // Othello - Put out the light
  { youtubeId: 'T5Pbqu8KtEI', expected: "Put out the light - Othello" },
  { youtubeId: 'rM66BvB5xxg', expected: "Othello - Laurence Fishburne" },

  // King Lear - Reason not the need
  { youtubeId: 'fE0jprKwQ6E', expected: "Reason not the need - Lear" },

  // Twelfth Night - If music be the food of love
  { youtubeId: 'I2FJK2gBgDE', expected: "If music be the food of love" },

  // Midsummer - Lord what fools
  { youtubeId: 'Y0PLMfwjwlI', expected: "Lord what fools these mortals be" },
];

async function checkVideo(videoId) {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  try {
    const response = await fetch(url);
    if (!response.ok) return { exists: false };
    const data = await response.json();
    return { exists: true, title: data.title, author: data.author_name };
  } catch (e) {
    return { exists: false };
  }
}

async function main() {
  console.log('Searching for working Shakespeare videos...\n');

  const working = [];
  for (const video of CANDIDATES) {
    const result = await checkVideo(video.youtubeId);
    if (result.exists) {
      console.log(`✓ ${video.youtubeId}: ${result.title}`);
      working.push({ ...video, ...result });
    }
  }

  console.log(`\n${working.length} working videos found`);
}

main();
