#!/usr/bin/env node
// Broader search for Shakespeare video IDs

const CANDIDATES = [
  // Known working patterns from major productions
  // Branagh films
  { youtubeId: 'A-yZNMWFqvM', note: "Already have - Henry V breach" },
  { youtubeId: 'qxXnS0MKi6s', note: "Branagh St Crispin" },
  { youtubeId: 'hL0QoM6gKyA', note: "St Crispins Day" },

  // Olivier classics
  { youtubeId: 'rYvYjF4yb_M', note: "Olivier Hamlet" },
  { youtubeId: 'T6z6_bggBZ8', note: "Olivier As You Like It" },

  // Fassbender/Modern Macbeth
  { youtubeId: 'qCs8YaWzYe0', note: "Fassbender Macbeth trailer" },
  { youtubeId: 'jDrT-GjhjK8', note: "Fassbender dagger" },

  // Romeo and Juliet versions
  { youtubeId: 'rT5zCHn0tsg', note: "Romeo Juliet balcony 1968" },
  { youtubeId: 'nRSLSG5GnFo', note: "Zeffirelli R&J" },
  { youtubeId: '2F2i6EQsPZY', note: "DiCaprio R&J balcony" },

  // Merchant of Venice
  { youtubeId: '1zdZm15_LBE', note: "Merchant of Venice quality of mercy" },
  { youtubeId: 'hJkKy5JgkJI', note: "Pacino Merchant" },

  // Richard II
  { youtubeId: 'LrHBNOTkgKs', note: "Richard II sceptred isle" },
  { youtubeId: 'H9JKJk8f2Qs', note: "John of Gaunt speech" },

  // As You Like It - seven ages
  { youtubeId: 'pi8kecqRYGc', note: "All world stage" },
  { youtubeId: 'Gb1L6zTKp_0', note: "Seven ages of man" },

  // Othello
  { youtubeId: 'OwKmQFAH1y0', note: "Othello scenes" },
  { youtubeId: 'cFBkxG8k-Jg', note: "Fishburne Othello" },

  // Various Hamlet soliloquies
  { youtubeId: 'ck-x9YCDi68', note: "Hamlet soliloquy" },
  { youtubeId: 'qy5E7e4kH7M', note: "What a piece of work" },
];

async function checkVideo(videoId) {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return { title: data.title, author: data.author_name };
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('Searching for Shakespeare videos...\n');

  for (const video of CANDIDATES) {
    const result = await checkVideo(video.youtubeId);
    if (result) {
      console.log(`✓ ${video.youtubeId}`);
      console.log(`  ${result.title}`);
      console.log(`  Channel: ${result.author}\n`);
    }
  }
}

main();
