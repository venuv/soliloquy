import { useState } from 'react'
import { Play, Clock, Film, Scissors } from 'lucide-react'

/**
 * VideoClip component - displays embeddable video with segment awareness
 *
 * Props:
 * - clip: { videoId, source, startSeconds, endSeconds, actor, production, year, status }
 * - onPlay: callback when video is played
 *
 * Visual distinction:
 * - Segmented clips (gold accent): precise start/end times available
 * - Full videos (muted): watching entire video, soliloquy location unknown
 */

const SOURCES = {
  'internet-archive': {
    name: 'Internet Archive',
    buildEmbedUrl: (videoId, start, end) => {
      let url = `https://archive.org/embed/${videoId}`
      const params = []
      if (start) params.push(`start=${start}`)
      if (end) params.push(`end=${end}`)
      return params.length ? `${url}?${params.join('&')}` : url
    }
  },
  'youtube': {
    name: 'YouTube',
    buildEmbedUrl: (videoId, start, end) => {
      let url = `https://www.youtube.com/embed/${videoId}`
      const params = []
      if (start) params.push(`start=${start}`)
      if (end) params.push(`end=${end}`)
      return params.length ? `${url}?${params.join('&')}` : url
    }
  },
  'vimeo': {
    name: 'Vimeo',
    buildEmbedUrl: (videoId, start) => {
      const url = `https://player.vimeo.com/video/${videoId}`
      if (start) {
        const mins = Math.floor(start / 60)
        const secs = start % 60
        return `${url}#t=${mins}m${secs}s`
      }
      return url
    }
  }
}

// Format seconds to mm:ss
const formatTime = (seconds) => {
  if (!seconds) return null
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function VideoClip({ clip, onPlay }) {
  const [showEmbed, setShowEmbed] = useState(false)

  const isSegmented = clip.startSeconds != null && clip.endSeconds != null
  const sourceConfig = SOURCES[clip.source] || SOURCES['internet-archive']

  const embedUrl = sourceConfig.buildEmbedUrl(
    clip.videoId,
    clip.startSeconds,
    clip.endSeconds
  )

  const duration = isSegmented
    ? clip.endSeconds - clip.startSeconds
    : null

  // Color scheme based on segment status
  const accentColor = isSegmented ? '#c4a35a' : '#9a9a9a'
  const borderColor = isSegmented ? 'rgba(196, 163, 90, 0.3)' : 'rgba(0,0,0,0.08)'
  const bgColor = isSegmented ? 'rgba(196, 163, 90, 0.04)' : 'rgba(0,0,0,0.02)'

  return (
    <div style={{
      border: `1px solid ${borderColor}`,
      borderRadius: '8px',
      overflow: 'hidden',
      background: bgColor,
      transition: 'all 0.2s'
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.25rem'
          }}>
            {/* Segment indicator */}
            {isSegmented ? (
              <Scissors size={14} style={{ color: accentColor }} />
            ) : (
              <Film size={14} style={{ color: accentColor }} />
            )}
            <span style={{
              fontFamily: "'Cormorant', serif",
              fontSize: '1rem',
              color: '#1a1a1a'
            }}>
              {clip.actor}
            </span>
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#9a9a9a'
          }}>
            {clip.production} ({clip.year})
          </div>
        </div>

        {/* Status badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {isSegmented && duration && (
            <span style={{
              fontSize: '0.7rem',
              color: accentColor,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <Clock size={12} />
              {formatTime(duration)}
            </span>
          )}
          <span style={{
            fontSize: '0.6rem',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            background: isSegmented ? 'rgba(196, 163, 90, 0.15)' : 'rgba(0,0,0,0.05)',
            color: accentColor,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {isSegmented ? 'Clip' : 'Full'}
          </span>
        </div>
      </div>

      {/* Video area */}
      {showEmbed ? (
        <div style={{
          position: 'relative',
          paddingBottom: '56.25%', // 16:9 aspect ratio
          height: 0,
          overflow: 'hidden'
        }}>
          <iframe
            src={embedUrl}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            allowFullScreen
            title={`${clip.actor} - ${clip.production}`}
          />
        </div>
      ) : (
        <button
          onClick={() => {
            setShowEmbed(true)
            onPlay?.()
          }}
          style={{
            width: '100%',
            padding: '2rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: isSegmented ? 'rgba(196, 163, 90, 0.15)' : 'rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s'
          }}>
            <Play size={24} style={{ color: accentColor, marginLeft: '2px' }} />
          </div>
          <span style={{
            fontSize: '0.8rem',
            color: '#9a9a9a'
          }}>
            {isSegmented
              ? `Watch clip (${formatTime(clip.startSeconds)} - ${formatTime(clip.endSeconds)})`
              : 'Watch full video'
            }
          </span>
          <span style={{
            fontSize: '0.7rem',
            color: '#c4c4c4'
          }}>
            via {sourceConfig.name}
          </span>
        </button>
      )}

      {/* Timestamp info for full videos */}
      {!isSegmented && showEmbed && (
        <div style={{
          padding: '0.5rem 1rem',
          background: 'rgba(0,0,0,0.03)',
          borderTop: `1px solid ${borderColor}`,
          fontSize: '0.75rem',
          color: '#9a9a9a',
          fontStyle: 'italic'
        }}>
          Soliloquy location being identified...
        </div>
      )}
    </div>
  )
}
