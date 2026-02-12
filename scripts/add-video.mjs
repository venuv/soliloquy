#!/usr/bin/env node
/**
 * Add YouTube Video to Soliloquy Corpus
 *
 * Usage:
 *   node scripts/add-video.mjs <youtube-url>
 *   node scripts/add-video.mjs <youtube-url> --soliloquy=to-be-or-not-to-be --performer="Benedict Cumberbatch"
 *
 * This script:
 *   1. Extracts video ID from YouTube URL
 *   2. Prompts for soliloquy and performer info (or accepts via flags)
 *   3. Adds to video-clips.json, segment-timestamps.json, and GetInspired.jsx
 *   4. Optionally commits, pushes, and deploys via --ship flag
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// File paths
const VIDEO_CLIPS_PATH = path.join(ROOT, 'server/data/video-clips.json')
const SEGMENT_TIMESTAMPS_PATH = path.join(ROOT, 'server/data/segment-timestamps.json')
const GET_INSPIRED_PATH = path.join(ROOT, 'client/src/components/GetInspired.jsx')
const SHAKESPEARE_PATH = path.join(ROOT, 'server/data/authors/shakespeare.json')

// Parse command line args
function parseArgs() {
  const args = process.argv.slice(2)
  const result = { url: null, soliloquy: null, performer: null, title: null, duration: null, ship: false }

  for (const arg of args) {
    if (arg.startsWith('--soliloquy=')) result.soliloquy = arg.split('=')[1]
    else if (arg.startsWith('--performer=')) result.performer = arg.split('=')[1]
    else if (arg.startsWith('--title=')) result.title = arg.split('=')[1]
    else if (arg.startsWith('--duration=')) result.duration = arg.split('=')[1]
    else if (arg === '--ship') result.ship = true
    else if (!arg.startsWith('--') && !result.url) result.url = arg
  }

  return result
}

// Extract YouTube video ID from URL
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/  // Just the ID
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Get available soliloquies from shakespeare.json
function getAvailableSoliloquies() {
  const data = JSON.parse(fs.readFileSync(SHAKESPEARE_PATH, 'utf-8'))
  return data.works.map(w => ({
    id: w.id,
    title: w.title,
    source: w.source
  }))
}

// Readline interface for prompts
function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
}

async function ask(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()))
  })
}

// Load JSON file
function loadJson(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'))
}

// Save JSON file with pretty formatting
function saveJson(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n')
}

// Add to video-clips.json
function addToVideoClips(videoId, soliloquyId, performer, title, duration) {
  const data = loadJson(VIDEO_CLIPS_PATH)

  // Generate clip ID
  const playPrefix = soliloquyId.split('-').slice(0, 2).join('-')
  const performerSlug = performer.toLowerCase().split(' ').pop()
  const clipId = `${playPrefix}-${performerSlug}-yt`

  // Check if already exists
  if (data.clips.some(c => c.videoId === `youtube-${videoId}`)) {
    console.log(`  Already exists in video-clips.json`)
    return false
  }

  const newClip = {
    id: clipId,
    soliloquyId: soliloquyId,
    title: `${performer} - ${title}`,
    actor: performer,
    production: title,
    year: null,
    source: 'youtube',
    videoId: `youtube-${videoId}`,
    startSeconds: null,
    endSeconds: null,
    status: 'clip',
    notes: `YouTube performance: ${title}`
  }

  data.clips.push(newClip)
  saveJson(VIDEO_CLIPS_PATH, data)
  console.log(`  Added to video-clips.json`)
  return true
}

// Add to segment-timestamps.json
function addToSegmentTimestamps(videoId, soliloquyId, performer, title) {
  const data = loadJson(SEGMENT_TIMESTAMPS_PATH)

  // Check if already exists
  if (data.segments.some(s => s.videoId === `youtube-${videoId}`)) {
    console.log(`  Already exists in segment-timestamps.json`)
    return false
  }

  const soliloquies = getAvailableSoliloquies()
  const sol = soliloquies.find(s => s.id === soliloquyId)

  const newSegment = {
    videoId: `youtube-${videoId}`,
    soliloquyId: soliloquyId,
    title: sol?.title || soliloquyId,
    actor: performer,
    production: title,
    year: null,
    startSeconds: 0,
    endSeconds: null,
    confidence: 'verified',
    source: 'YouTube clip - standalone performance of the soliloquy.',
    notes: `${performer} performs ${sol?.title || soliloquyId} from ${sol?.source || 'Shakespeare'}.`
  }

  data.segments.push(newSegment)
  data.metadata.totalSegments = data.segments.length
  data.metadata.lastUpdated = new Date().toISOString().split('T')[0]

  saveJson(SEGMENT_TIMESTAMPS_PATH, data)
  console.log(`  Added to segment-timestamps.json`)
  return true
}

// Add to GetInspired.jsx PERFORMANCES array
function addToGetInspired(videoId, soliloquyId, performer, title, duration, description) {
  let content = fs.readFileSync(GET_INSPIRED_PATH, 'utf-8')

  // Check if video already exists
  if (content.includes(videoId)) {
    console.log(`  Already exists in GetInspired.jsx`)
    return false
  }

  // Find the soliloquy entry in PERFORMANCES
  const soliloquyPattern = new RegExp(`(\\{[\\s\\n]*id: '${soliloquyId}',[\\s\\S]*?videos: \\[)([\\s\\S]*?)(\\]\\s*\\})`, 'm')
  const match = content.match(soliloquyPattern)

  if (!match) {
    console.log(`  Warning: Soliloquy '${soliloquyId}' not found in GetInspired.jsx PERFORMANCES`)
    console.log(`  You may need to add it manually`)
    return false
  }

  // Build new video entry
  const newVideoEntry = `
      {
        youtubeId: '${videoId}',
        title: '${performer} - ${title.replace(/'/g, "\\'")}',
        performer: '${performer}',
        duration: '${duration || '3:00'}',
        description: "${description.replace(/"/g, '\\"')}"
      },`

  // Insert at the beginning of the videos array
  const updatedContent = content.replace(
    soliloquyPattern,
    `$1${newVideoEntry}$2$3`
  )

  fs.writeFileSync(GET_INSPIRED_PATH, updatedContent)
  console.log(`  Added to GetInspired.jsx`)
  return true
}

// Ship: commit, push, deploy
function ship(performer, soliloquyId) {
  console.log('\n Shipping changes...')

  try {
    // Git add
    execSync('git add server/data/video-clips.json server/data/segment-timestamps.json client/src/components/GetInspired.jsx', {
      cwd: ROOT,
      stdio: 'pipe'
    })

    // Git commit
    const commitMsg = `Add ${performer} video for ${soliloquyId}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`

    execSync(`git commit -m "${commitMsg}"`, {
      cwd: ROOT,
      stdio: 'pipe'
    })
    console.log('  Committed changes')

    // Git push
    execSync('git push origin main', {
      cwd: ROOT,
      stdio: 'pipe'
    })
    console.log('  Pushed to origin/main')

    // Fly deploy
    console.log('  Deploying to fly.io...')
    execSync('fly deploy --app soliloquy-master', {
      cwd: ROOT,
      stdio: 'inherit'
    })

    console.log('\n Shipped successfully!')
  } catch (err) {
    console.error('\n Ship failed:', err.message)
    process.exit(1)
  }
}

// Main
async function main() {
  const args = parseArgs()

  // Show usage if no URL
  if (!args.url) {
    console.log(`
Add YouTube Video to Soliloquy Corpus

Usage:
  node scripts/add-video.mjs <youtube-url> [options]

Options:
  --soliloquy=ID      Soliloquy ID (e.g., to-be-or-not-to-be)
  --performer=NAME    Performer name (e.g., "Benedict Cumberbatch")
  --title=TITLE       Video/production title
  --duration=TIME     Duration (e.g., "3:30")
  --ship              Commit, push, and deploy after adding

Examples:
  node scripts/add-video.mjs https://youtube.com/watch?v=abc123
  node scripts/add-video.mjs abc123 --soliloquy=to-be-or-not-to-be --performer="Kenneth Branagh" --ship

Available soliloquies:
`)
    const soliloquies = getAvailableSoliloquies()
    soliloquies.forEach(s => console.log(`  ${s.id.padEnd(30)} (${s.source})`))
    process.exit(0)
  }

  // Extract video ID
  const videoId = extractVideoId(args.url)
  if (!videoId) {
    console.error('Could not extract YouTube video ID from:', args.url)
    process.exit(1)
  }

  console.log(`\n Adding YouTube video: ${videoId}`)
  console.log(`  URL: https://youtube.com/watch?v=${videoId}\n`)

  const rl = createPrompt()
  const soliloquies = getAvailableSoliloquies()

  // Get soliloquy ID
  let soliloquyId = args.soliloquy
  if (!soliloquyId) {
    console.log('Available soliloquies:')
    soliloquies.forEach((s, i) => console.log(`  ${(i+1).toString().padStart(2)}. ${s.id} (${s.source})`))
    console.log('')

    const choice = await ask(rl, 'Enter soliloquy ID or number: ')
    const num = parseInt(choice)
    if (num > 0 && num <= soliloquies.length) {
      soliloquyId = soliloquies[num - 1].id
    } else {
      soliloquyId = choice
    }
  }

  // Validate soliloquy
  const soliloquy = soliloquies.find(s => s.id === soliloquyId)
  if (!soliloquy) {
    console.error(`Unknown soliloquy: ${soliloquyId}`)
    rl.close()
    process.exit(1)
  }
  console.log(`  Soliloquy: ${soliloquy.title} (${soliloquy.source})`)

  // Get performer
  let performer = args.performer
  if (!performer) {
    performer = await ask(rl, 'Performer name: ')
  }
  console.log(`  Performer: ${performer}`)

  // Get title
  let title = args.title
  if (!title) {
    title = await ask(rl, `Production/video title [${soliloquy.title}]: `) || soliloquy.title
  }
  console.log(`  Title: ${title}`)

  // Get duration
  let duration = args.duration
  if (!duration) {
    duration = await ask(rl, 'Duration (e.g., 3:30) [3:00]: ') || '3:00'
  }
  console.log(`  Duration: ${duration}`)

  // Get description
  const description = `${performer}'s performance of ${soliloquy.title} from ${soliloquy.source}.`

  rl.close()

  // Add to all files
  console.log('\n Adding to corpus...')
  addToVideoClips(videoId, soliloquyId, performer, title, duration)
  addToSegmentTimestamps(videoId, soliloquyId, performer, title)
  addToGetInspired(videoId, soliloquyId, performer, title, duration, description)

  console.log('\n Done!')
  console.log(`  Video ID: youtube-${videoId}`)
  console.log(`  View at: https://soliloquy-master.fly.dev/explore/${soliloquyId}`)

  // Ship if requested
  if (args.ship) {
    ship(performer, soliloquyId)
  } else {
    console.log('\n  Run with --ship to commit, push, and deploy')
  }
}

main().catch(console.error)
