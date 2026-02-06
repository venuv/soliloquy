import { useState, useEffect } from 'react'
import { Film, Scissors, RefreshCw } from 'lucide-react'
import VideoClip from './VideoClip'

/**
 * VideoClipList - displays all video clips for a given soliloquy
 *
 * Props:
 * - soliloquyId: the ID of the soliloquy to show videos for
 * - soliloquyTitle: display title
 *
 * Features:
 * - Shows segmented clips first (gold), then full videos (muted)
 * - Polls for new segments periodically (as Segmentor works)
 * - Visual legend explaining the difference
 */

export default function VideoClipList({ soliloquyId, soliloquyTitle }) {
  const [clips, setClips] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchClips = async () => {
    try {
      const res = await fetch(`/api/videos/clips/${soliloquyId}`)
      if (res.ok) {
        const data = await res.json()
        setClips(data.clips || [])
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error('Failed to fetch video clips:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClips()

    // Poll for segment updates every 30 seconds
    const interval = setInterval(fetchClips, 30000)
    return () => clearInterval(interval)
  }, [soliloquyId])

  // Sort: segmented clips first, then by year (newest first)
  const sortedClips = [...clips].sort((a, b) => {
    const aSegmented = a.startSeconds != null
    const bSegmented = b.startSeconds != null
    if (aSegmented !== bSegmented) return bSegmented ? 1 : -1
    return (b.year || 0) - (a.year || 0)
  })

  const segmentedCount = clips.filter(c => c.startSeconds != null).length
  const fullCount = clips.length - segmentedCount

  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#9a9a9a'
      }}>
        Loading performances...
      </div>
    )
  }

  if (clips.length === 0) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#9a9a9a',
        fontStyle: 'italic'
      }}>
        No video performances found for this soliloquy yet.
      </div>
    )
  }

  return (
    <div>
      {/* Header with legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid rgba(0,0,0,0.06)'
      }}>
        <div>
          <h3 style={{
            fontFamily: "'Cormorant', serif",
            fontSize: '1.1rem',
            color: '#1a1a1a',
            fontWeight: 400,
            margin: 0
          }}>
            Watch Performances
          </h3>
          <p style={{
            fontSize: '0.75rem',
            color: '#9a9a9a',
            margin: '0.25rem 0 0'
          }}>
            {clips.length} recording{clips.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          fontSize: '0.7rem'
        }}>
          {segmentedCount > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#c4a35a'
            }}>
              <Scissors size={12} />
              <span>{segmentedCount} clip{segmentedCount !== 1 ? 's' : ''}</span>
            </div>
          )}
          {fullCount > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#9a9a9a'
            }}>
              <Film size={12} />
              <span>{fullCount} full</span>
            </div>
          )}
        </div>
      </div>

      {/* Segmentor status indicator */}
      {fullCount > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          marginBottom: '1rem',
          background: 'rgba(196, 163, 90, 0.08)',
          borderRadius: '6px',
          fontSize: '0.75rem',
          color: '#9a9a9a'
        }}>
          <RefreshCw size={12} style={{ animation: 'spin 3s linear infinite' }} />
          <span>
            Finding exact timestamps for {fullCount} video{fullCount !== 1 ? 's' : ''}...
          </span>
        </div>
      )}

      {/* Clip list */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {sortedClips.map(clip => (
          <VideoClip
            key={clip.id}
            clip={clip}
            onPlay={() => {
              // Could track analytics here
              console.log('Playing:', clip.id)
            }}
          />
        ))}
      </div>

      {/* CSS for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
