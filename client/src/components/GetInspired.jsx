import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Home, Play, Clock, User, ChevronDown, ChevronUp, ExternalLink, Archive, Loader2 } from 'lucide-react'

// Curated YouTube performances of Shakespeare soliloquies
// All videos are under 15 minutes - focused on quality short-form performances
const PERFORMANCES = [
  {
    id: 'to-be-or-not-to-be',
    soliloquy: 'To be, or not to be',
    play: 'Hamlet',
    videos: [
      {
        youtubeId: 'SjuZq-8PUw0',
        title: 'Kenneth Branagh - Film (1996)',
        performer: 'Kenneth Branagh',
        duration: '4:15',
        description: 'From the acclaimed unabridged 1996 film adaptation.'
      },
      {
        youtubeId: 'xYZHb2xo0OI',
        title: 'David Tennant - RSC (2009)',
        performer: 'David Tennant',
        duration: '3:30',
        description: 'The emotionally raw RSC production that defined Hamlet for a generation.'
      }
    ]
  },
  {
    id: 'tomorrow-and-tomorrow',
    soliloquy: 'Tomorrow, and tomorrow, and tomorrow',
    play: 'Macbeth',
    videos: [
      {
        youtubeId: '4LDdyafsR7g',
        title: 'Ian McKellen - RSC Performance',
        performer: 'Ian McKellen',
        duration: '2:30',
        description: "McKellen's legendary RSC performance as the tortured Scottish king."
      },
      {
        youtubeId: 'zGbZCgHQ9m8',
        title: 'Ian McKellen - Masterclass Analysis',
        performer: 'Ian McKellen',
        duration: '6:42',
        description: 'McKellen breaks down the speech line by line in this 1979 BBC masterclass.'
      }
    ]
  },
  {
    id: 'now-is-the-winter',
    soliloquy: 'Now is the winter of our discontent',
    play: 'Richard III',
    videos: [
      {
        youtubeId: 'cDxnXgYPnKg',
        title: 'Laurence Olivier - Classic Film (1955)',
        performer: 'Laurence Olivier',
        duration: '4:45',
        description: 'The iconic 1955 film performance that defined Richard III.'
      }
    ]
  },
  {
    id: 'once-more-unto-the-breach',
    soliloquy: 'Once more unto the breach',
    play: 'Henry V',
    videos: [
      {
        youtubeId: 'A-yZNMWFqvM',
        title: 'Kenneth Branagh - Film',
        performer: 'Kenneth Branagh',
        duration: '3:30',
        description: 'The rousing battlefield speech from the 1989 film.'
      }
    ]
  },
  {
    id: 'friends-romans-countrymen',
    soliloquy: 'Friends, Romans, countrymen',
    play: 'Julius Caesar',
    videos: [
      {
        youtubeId: '7X9C55TkUP8',
        title: 'Marlon Brando - Classic Film',
        performer: 'Marlon Brando',
        duration: '7:30',
        description: "The legendary 1953 film performance of Mark Antony's funeral oration."
      }
    ]
  },
  // === NEW SPEECHES FROM SCRAPER ===
  {
    id: 'o-what-a-rogue',
    soliloquy: 'O, what a rogue and peasant slave am I',
    play: 'Hamlet',
    videos: [
      {
        youtubeId: 'Fje1acYFQg4',
        title: 'Hamlet Act 2, Scene 2 Soliloquy',
        performer: 'Film Performance',
        duration: '3:39',
        description: 'Hamlet berates himself after watching the Player King weep for Hecuba.'
      }
    ]
  },
  {
    id: 'what-a-piece-of-work',
    soliloquy: 'What a piece of work is man',
    play: 'Hamlet',
    videos: [
      {
        youtubeId: '8205kJSig4A',
        title: 'What a piece of work is man',
        performer: 'Brian Focht',
        duration: '1:35',
        description: "Hamlet's meditation on humanity's nobility and his own melancholy."
      }
    ]
  },
  {
    id: 'is-this-a-dagger',
    soliloquy: 'Is this a dagger which I see before me',
    play: 'Macbeth',
    videos: [
      {
        youtubeId: 'pusU90ov8pQ',
        title: 'Is this a dagger which I see before me?',
        performer: 'Film Performance',
        duration: '3:46',
        description: "Macbeth's hallucination before murdering King Duncan."
      }
    ]
  },
  {
    id: 'out-damned-spot',
    soliloquy: 'Out, damned spot',
    play: 'Macbeth',
    videos: [
      {
        youtubeId: '9dgbbtUbgcM',
        title: 'Judi Dench as Lady Macbeth',
        performer: 'Judi Dench',
        duration: '4:34',
        description: "The haunting sleepwalking scene from the 1979 RSC production."
      }
    ]
  },
  {
    id: 'blow-winds',
    soliloquy: 'Blow, winds, and crack your cheeks',
    play: 'King Lear',
    videos: [
      {
        youtubeId: 'zn955417swY',
        title: 'Roger Allam - Shakespeare Solos',
        performer: 'Roger Allam',
        duration: '2:03',
        description: 'Lear rages against the storm on the heath.'
      }
    ]
  },
  {
    id: 'but-soft-what-light',
    soliloquy: 'But soft, what light through yonder window breaks',
    play: 'Romeo and Juliet',
    videos: [
      {
        youtubeId: 'S0qao2xINsE',
        title: 'Balcony Scene - Zeffirelli Film',
        performer: 'Leonard Whiting',
        duration: '4:24',
        description: "The iconic balcony scene from the 1968 film adaptation."
      }
    ]
  },
  {
    id: 'st-crispins-day',
    soliloquy: 'We few, we happy few, we band of brothers',
    play: 'Henry V',
    videos: [
      {
        youtubeId: '9P8hogkNdu8',
        title: "St. Crispin's Day Speech",
        performer: 'Kenneth Branagh',
        duration: '5:41',
        description: "Henry rallies his troops before the Battle of Agincourt."
      }
    ]
  },
  {
    id: 'this-sceptred-isle',
    soliloquy: 'This royal throne of kings, this sceptred isle',
    play: 'Richard II',
    videos: [
      {
        youtubeId: 'hQQyyMyTHa0',
        title: 'This Sceptered Isle Speech',
        performer: 'Various',
        duration: '7:29',
        description: "John of Gaunt's dying tribute to England."
      }
    ]
  },
  {
    id: 'quality-of-mercy',
    soliloquy: 'The quality of mercy is not strained',
    play: 'The Merchant of Venice',
    videos: [
      {
        youtubeId: 'wmmBT_4dmI0',
        title: 'Laura Carmichael - Shakespeare Solos',
        performer: 'Laura Carmichael',
        duration: '1:38',
        description: "Portia's famous courtroom plea for mercy over justice."
      }
    ]
  },
  {
    id: 'hath-not-a-jew-eyes',
    soliloquy: 'Hath not a Jew eyes?',
    play: 'The Merchant of Venice',
    videos: [
      {
        youtubeId: 'GWLBwkj07OY',
        title: 'David Suchet as Shylock',
        performer: 'David Suchet',
        duration: '1:57',
        description: "Shylock's powerful defense of his humanity."
      }
    ]
  },
  {
    id: 'all-the-worlds-a-stage',
    soliloquy: 'All the world\'s a stage',
    play: 'As You Like It',
    videos: [
      {
        youtubeId: 'rOHhUUWeKN8',
        title: 'The Seven Ages of Man',
        performer: 'RedFrost Motivation',
        duration: '2:59',
        description: "Jaques' meditation on the seven stages of human life."
      }
    ]
  },
  {
    id: 'our-revels-now-are-ended',
    soliloquy: 'Our revels now are ended',
    play: 'The Tempest',
    videos: [
      {
        youtubeId: 'KFNTAsC8qQ0',
        title: 'David Threlfall - Shakespeare Solos',
        performer: 'David Threlfall',
        duration: '1:24',
        description: "Prospero's farewell to his magical powers."
      }
    ]
  },
  {
    id: 'if-music-be-the-food',
    soliloquy: 'If music be the food of love, play on',
    play: 'Twelfth Night',
    videos: [
      {
        youtubeId: 'SJcCLr19tIs',
        title: 'BBC Shakespeare',
        performer: 'BBC Production',
        duration: '2:07',
        description: "Duke Orsino's opening meditation on love and music."
      }
    ]
  },
  {
    id: 'coriolanus-banishment',
    soliloquy: 'You common cry of curs',
    play: 'Coriolanus',
    videos: [
      {
        youtubeId: 'MrAPDOT3xMM',
        title: 'The Tragedy of Coriolanus',
        performer: 'Stage Production',
        duration: '3:14',
        description: "Coriolanus turns on the Roman citizens who banish him."
      }
    ]
  },
]

function YouTubeEmbed({ videoId, title }) {
  return (
    <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: '8px', overflow: 'hidden', background: '#1a1a1a' }}>
      <iframe
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  )
}

function InternetArchiveEmbed({ videoId, title, startSeconds, endSeconds }) {
  // Build URL with optional start/end parameters
  let url = `https://archive.org/embed/${videoId}`
  const params = []
  if (startSeconds) params.push(`start=${startSeconds}`)
  if (endSeconds) params.push(`end=${endSeconds}`)
  if (params.length) url += `?${params.join('&')}`

  return (
    <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: '8px', overflow: 'hidden', background: '#1a1a1a' }}>
      <iframe
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        src={url}
        title={title}
        frameBorder="0"
        allowFullScreen
      />
    </div>
  )
}

function VideoCard({ video, isExpanded, onToggle }) {
  const isArchive = video.source === 'internet-archive'
  const isSegmented = video.startSeconds != null && video.endSeconds != null

  // Format duration for Internet Archive clips
  const formatDuration = () => {
    if (video.duration) return video.duration
    if (isSegmented) {
      const secs = video.endSeconds - video.startSeconds
      const mins = Math.floor(secs / 60)
      const remainSecs = secs % 60
      return `${mins}:${remainSecs.toString().padStart(2, '0')}`
    }
    return 'Full film'
  }

  return (
    <div style={{
      background: isArchive ? 'rgba(196,163,90,0.06)' : 'rgba(90,74,106,0.06)',
      borderRadius: '8px',
      overflow: 'hidden',
      border: `1px solid ${isArchive ? 'rgba(196,163,90,0.2)' : 'rgba(90,74,106,0.12)'}`
    }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: isArchive ? 'rgba(196,163,90,0.15)' : 'rgba(90,74,106,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {isArchive ? (
              <Archive size={16} style={{ color: '#c4a35a' }} />
            ) : (
              <Play size={16} style={{ color: '#5a4a6a', marginLeft: '2px' }} />
            )}
          </div>
          <div>
            <h4 style={{ fontWeight: 500, color: '#1a1a1a', margin: 0 }}>{video.title}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: '#4a4a4a', marginTop: '0.25rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <User size={12} />
                {video.performer}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Clock size={12} />
                {formatDuration()}
              </span>
              {isArchive && (
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.15rem 0.4rem',
                  borderRadius: '4px',
                  background: isSegmented ? 'rgba(196,163,90,0.2)' : 'rgba(0,0,0,0.05)',
                  color: isSegmented ? '#c4a35a' : '#9a9a9a'
                }}>
                  {isSegmented ? 'Clip' : 'Full'}
                </span>
              )}
            </div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp size={20} style={{ color: '#9a9a9a' }} />
        ) : (
          <ChevronDown size={20} style={{ color: '#9a9a9a' }} />
        )}
      </button>

      {isExpanded && (
        <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ color: '#4a4a4a', fontSize: '0.9rem' }}>{video.description}</p>
          {isArchive ? (
            <>
              <InternetArchiveEmbed
                videoId={video.videoId}
                title={video.title}
                startSeconds={video.startSeconds}
                endSeconds={video.endSeconds}
              />
              <a
                href={`https://archive.org/details/${video.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: '#c4a35a', textDecoration: 'none' }}
              >
                View on Internet Archive <ExternalLink size={12} />
              </a>
            </>
          ) : (
            <>
              <YouTubeEmbed videoId={video.youtubeId} title={video.title} />
              <a
                href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: '#5a4a6a', textDecoration: 'none' }}
              >
                Watch on YouTube <ExternalLink size={12} />
              </a>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SoliloquySection({ performance }) {
  const [expandedVideo, setExpandedVideo] = useState(null)

  const toggleVideo = (index) => {
    setExpandedVideo(expandedVideo === index ? null : index)
  }

  return (
    <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.15rem', color: '#1a1a1a', fontWeight: 500, margin: 0 }}>
            "{performance.soliloquy}"
          </h3>
          <p style={{ color: '#4a4a4a', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {performance.play}
          </p>
        </div>
        <Link
          to={`/practice/shakespeare/${performance.id}`}
          style={{ fontSize: '0.85rem', background: 'rgba(155,45,48,0.08)', color: '#9b2d30', padding: '0.5rem 0.75rem', borderRadius: '6px', textDecoration: 'none' }}
        >
          Practice This
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {performance.videos.map((video, index) => (
          <VideoCard
            key={video.youtubeId || video.id || `${video.videoId}-${index}`}
            video={video}
            isExpanded={expandedVideo === index}
            onToggle={() => toggleVideo(index)}
          />
        ))}
      </div>
    </div>
  )
}

// Map soliloquyId to play name for Internet Archive clips
const SOLILOQUY_TO_PLAY = {
  'to-be-or-not-to-be': 'Hamlet',
  'o-what-a-rogue': 'Hamlet',
  'what-a-piece-of-work': 'Hamlet',
  'tomorrow-and-tomorrow': 'Macbeth',
  'is-this-a-dagger': 'Macbeth',
  'out-damned-spot': 'Macbeth',
  'now-is-the-winter': 'Richard III',
  'once-more-unto-the-breach': 'Henry V',
  'st-crispins-day': 'Henry V',
  'friends-romans-countrymen': 'Julius Caesar',
  'but-soft-what-light': 'Romeo and Juliet',
  'all-the-worlds-a-stage': 'As You Like It',
  'quality-of-mercy': 'The Merchant of Venice',
  'hath-not-a-jew-eyes': 'The Merchant of Venice',
  'our-revels-now-are-ended': 'The Tempest',
  'if-music-be-the-food': 'Twelfth Night',
  'blow-winds': 'King Lear',
  'this-sceptred-isle': 'Richard II',
  'coriolanus-banishment': 'Coriolanus'
}

// Map soliloquyId to display title
const SOLILOQUY_TITLES = {
  'to-be-or-not-to-be': 'To be, or not to be',
  'o-what-a-rogue': 'O, what a rogue and peasant slave am I',
  'tomorrow-and-tomorrow': 'Tomorrow, and tomorrow, and tomorrow',
  'is-this-a-dagger': 'Is this a dagger which I see before me',
  'now-is-the-winter': 'Now is the winter of our discontent',
  'once-more-unto-the-breach': 'Once more unto the breach',
  'but-soft-what-light': 'But soft, what light through yonder window breaks',
  'all-the-worlds-a-stage': "All the world's a stage"
}

export default function GetInspired() {
  const [filter, setFilter] = useState('all')
  const [archiveClips, setArchiveClips] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch Internet Archive clips on mount
  useEffect(() => {
    fetch('/api/videos/clips')
      .then(res => res.ok ? res.json() : { clips: [] })
      .then(data => setArchiveClips(data.clips || []))
      .catch(err => console.error('Failed to fetch archive clips:', err))
      .finally(() => setLoading(false))
  }, [])

  // Merge archive clips into PERFORMANCES structure
  const mergedPerformances = PERFORMANCES.map(perf => {
    // Find matching archive clips for this soliloquy
    const matchingClips = archiveClips
      .filter(clip => clip.soliloquyId === perf.id)
      .map(clip => ({
        id: clip.id,
        source: clip.source,
        videoId: clip.videoId,
        title: `${clip.actor} - ${clip.production} (${clip.year})`,
        performer: clip.actor,
        duration: null, // Will be calculated from timestamps if available
        description: clip.notes,
        startSeconds: clip.startSeconds,
        endSeconds: clip.endSeconds
      }))

    return {
      ...perf,
      videos: [...perf.videos, ...matchingClips]
    }
  })

  // Also add any archive clips for soliloquies not in PERFORMANCES
  const existingIds = new Set(PERFORMANCES.map(p => p.id))
  const newSoliloquies = {}

  archiveClips.forEach(clip => {
    if (!existingIds.has(clip.soliloquyId)) {
      if (!newSoliloquies[clip.soliloquyId]) {
        newSoliloquies[clip.soliloquyId] = {
          id: clip.soliloquyId,
          soliloquy: SOLILOQUY_TITLES[clip.soliloquyId] || clip.soliloquyId,
          play: SOLILOQUY_TO_PLAY[clip.soliloquyId] || 'Unknown',
          videos: []
        }
      }
      newSoliloquies[clip.soliloquyId].videos.push({
        id: clip.id,
        source: clip.source,
        videoId: clip.videoId,
        title: `${clip.actor} - ${clip.production} (${clip.year})`,
        performer: clip.actor,
        duration: null,
        description: clip.notes,
        startSeconds: clip.startSeconds,
        endSeconds: clip.endSeconds
      })
    }
  })

  const allPerformances = [...mergedPerformances, ...Object.values(newSoliloquies)]
  const plays = [...new Set(allPerformances.map(p => p.play))].sort()

  const filteredPerformances = filter === 'all'
    ? allPerformances
    : allPerformances.filter(p => p.play === filter)

  return (
    <div style={{ minHeight: '100vh', background: '#fdfcf8', fontFamily: "'IBM Plex Sans', sans-serif", padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ maxWidth: '56rem', margin: '0 auto 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={{ color: '#4a4a4a', textDecoration: 'none' }} title="Home">
            <Home size={22} />
          </Link>
          <div>
            <h1 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.75rem', color: '#5a4a6a', fontWeight: 400, margin: 0 }}>
              Get Inspired
            </h1>
            <p style={{ color: '#4a4a4a', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
              Watch master performances of the soliloquies you're learning
            </p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ maxWidth: '56rem', margin: '0 auto 1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer',
              background: filter === 'all' ? '#5a4a6a' : 'rgba(0,0,0,0.03)',
              color: filter === 'all' ? '#fdfcf8' : '#4a4a4a'
            }}
          >
            All Plays
          </button>
          {plays.map(play => (
            <button
              key={play}
              onClick={() => setFilter(play)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer',
                background: filter === play ? '#5a4a6a' : 'rgba(0,0,0,0.03)',
                color: filter === play ? '#fdfcf8' : '#4a4a4a'
              }}
            >
              {play}
            </button>
          ))}
        </div>
      </div>

      {/* Performances */}
      <div style={{ maxWidth: '56rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {filteredPerformances.map(performance => (
          <SoliloquySection key={performance.id} performance={performance} />
        ))}
      </div>

      {/* Footer */}
      <div style={{ maxWidth: '56rem', margin: '3rem auto 0', textAlign: 'center' }}>
        <p style={{ color: '#9a9a9a', fontSize: '0.85rem' }}>
          Videos from YouTube and <a href="https://archive.org" target="_blank" rel="noopener noreferrer" style={{ color: '#c4a35a', textDecoration: 'none' }}>Internet Archive</a>
        </p>
      </div>
    </div>
  )
}
