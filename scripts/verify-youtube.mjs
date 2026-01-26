#!/usr/bin/env node
// YouTube URL verifier - checks if videos exist and retrieves actual titles

const VIDEOS = [
  // To be or not to be - Hamlet
  { youtubeId: 'SjuZq-8PUw0', expected: "Kenneth Branagh - To be or not to be" },
  { youtubeId: 'xYZHb2xo0OI', expected: "David Tennant - To be or not to be" },
  // Tomorrow - Macbeth
  { youtubeId: '4LDdyafsR7g', expected: "Ian McKellen - Tomorrow performance" },
  { youtubeId: 'zGbZCgHQ9m8', expected: "Ian McKellen - Tomorrow analysis" },
  // Richard III
  { youtubeId: 'cDxnXgYPnKg', expected: "Laurence Olivier - Richard III" },
  // Henry V
  { youtubeId: 'A-yZNMWFqvM', expected: "Kenneth Branagh - Henry V" },
  // Julius Caesar
  { youtubeId: '7X9C55TkUP8', expected: "Marlon Brando - Julius Caesar" },
];

async function checkVideo(videoId) {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  try {
    const response = await fetch(url);
    if (!response.ok) return { exists: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return { exists: true, title: data.title, author: data.author_name };
  } catch (e) {
    return { exists: false, error: e.message };
  }
}

async function main() {
  console.log('YouTube Video Verification\n' + '='.repeat(70));
  let allGood = true;

  for (const video of VIDEOS) {
    const result = await checkVideo(video.youtubeId);
    const status = result.exists ? '✓' : '✗';
    const color = result.exists ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`\n${color}${status}${reset} ${video.youtubeId}`);
    console.log(`  Expected: ${video.expected}`);
    if (result.exists) {
      console.log(`  Actual:   ${result.title}`);
      console.log(`  Channel:  ${result.author}`);
    } else {
      console.log(`  Error:    ${result.error}`);
      allGood = false;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(allGood ? '\n✓ All videos verified!' : '\n✗ Some videos are broken');
}

main();
