import express from 'express'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

const CLIPS_PATH = path.join(__dirname, '../data/video-clips.json')
const SEGMENTS_PATH = path.join(__dirname, '../data/segment-timestamps.json')

// Load clips with segment data merged
async function loadClipsWithSegments() {
  try {
    const clipsData = JSON.parse(await fs.readFile(CLIPS_PATH, 'utf-8'))
    let segments = { segments: [] }

    try {
      segments = JSON.parse(await fs.readFile(SEGMENTS_PATH, 'utf-8'))
    } catch {
      // Segments file may not exist yet
    }

    // Merge segment timestamps into clips
    const clips = clipsData.clips.map(clip => {
      const segment = segments.segments?.find(
        s => s.videoId === clip.videoId && s.soliloquyId === clip.soliloquyId
      )

      if (segment) {
        return {
          ...clip,
          startSeconds: segment.startSeconds,
          endSeconds: segment.endSeconds,
          segmentConfidence: segment.confidence,
          status: 'segmented'
        }
      }

      return clip
    })

    return { clips, sources: clipsData.sources }
  } catch (err) {
    console.error('Error loading clips:', err)
    return { clips: [], sources: {} }
  }
}

// GET /api/videos/clips - Get all clips
router.get('/clips', async (req, res) => {
  try {
    const data = await loadClipsWithSegments()
    res.json(data)
  } catch (err) {
    console.error('Error fetching clips:', err)
    res.status(500).json({ error: 'Failed to fetch clips' })
  }
})

// GET /api/videos/clips/:soliloquyId - Get clips for a specific soliloquy
router.get('/clips/:soliloquyId', async (req, res) => {
  try {
    const { soliloquyId } = req.params
    const data = await loadClipsWithSegments()

    const filteredClips = data.clips.filter(
      clip => clip.soliloquyId === soliloquyId
    )

    res.json({
      soliloquyId,
      clips: filteredClips,
      sources: data.sources
    })
  } catch (err) {
    console.error('Error fetching clips for soliloquy:', err)
    res.status(500).json({ error: 'Failed to fetch clips' })
  }
})

// GET /api/videos/stats - Get segment progress stats
router.get('/stats', async (req, res) => {
  try {
    const data = await loadClipsWithSegments()

    const total = data.clips.length
    const segmented = data.clips.filter(c => c.status === 'segmented').length
    const full = total - segmented

    // Group by soliloquy
    const bySoliloquy = {}
    data.clips.forEach(clip => {
      if (!bySoliloquy[clip.soliloquyId]) {
        bySoliloquy[clip.soliloquyId] = { total: 0, segmented: 0 }
      }
      bySoliloquy[clip.soliloquyId].total++
      if (clip.status === 'segmented') {
        bySoliloquy[clip.soliloquyId].segmented++
      }
    })

    res.json({
      total,
      segmented,
      full,
      percentComplete: total > 0 ? Math.round((segmented / total) * 100) : 0,
      bySoliloquy
    })
  } catch (err) {
    console.error('Error fetching stats:', err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// POST /api/videos/segment - Add a new segment timestamp (for Segmentor agent)
router.post('/segment', async (req, res) => {
  try {
    const { videoId, soliloquyId, startSeconds, endSeconds, confidence, source } = req.body

    if (!videoId || !soliloquyId || startSeconds == null) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    let segments = { segments: [] }
    try {
      segments = JSON.parse(await fs.readFile(SEGMENTS_PATH, 'utf-8'))
    } catch {
      // File doesn't exist yet
    }

    // Check for existing segment
    const existingIndex = segments.segments.findIndex(
      s => s.videoId === videoId && s.soliloquyId === soliloquyId
    )

    const newSegment = {
      videoId,
      soliloquyId,
      startSeconds,
      endSeconds,
      confidence: confidence || 'unknown',
      source: source || 'manual',
      updatedAt: new Date().toISOString()
    }

    if (existingIndex >= 0) {
      segments.segments[existingIndex] = newSegment
    } else {
      segments.segments.push(newSegment)
    }

    await fs.writeFile(SEGMENTS_PATH, JSON.stringify(segments, null, 2))

    res.json({ success: true, segment: newSegment })
  } catch (err) {
    console.error('Error saving segment:', err)
    res.status(500).json({ error: 'Failed to save segment' })
  }
})

export default router
