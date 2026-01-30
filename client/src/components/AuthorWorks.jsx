import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../App'
import { Home, ChevronRight } from 'lucide-react'

// Ink wash colors for different plays - visible but not overwhelming
const PLAY_COLORS = {
  'Hamlet': { wash: 'rgba(155, 45, 48, 0.10)', accent: '#9b2d30' },
  'Macbeth': { wash: 'rgba(61, 92, 74, 0.10)', accent: '#3d5c4a' },
  'Richard III': { wash: 'rgba(42, 74, 94, 0.10)', accent: '#2a4a5e' },
  'As You Like It': { wash: 'rgba(180, 145, 70, 0.12)', accent: '#9a7830' },
  'Henry V': { wash: 'rgba(139, 90, 43, 0.10)', accent: '#8b5a2b' },
  'The Merchant of Venice': { wash: 'rgba(120, 80, 120, 0.10)', accent: '#785078' },
  'Romeo and Juliet': { wash: 'rgba(180, 60, 80, 0.10)', accent: '#b43c50' },
  'Julius Caesar': { wash: 'rgba(120, 110, 60, 0.10)', accent: '#6e6432' },
  'Othello': { wash: 'rgba(70, 70, 100, 0.10)', accent: '#464664' },
  'King Lear': { wash: 'rgba(100, 85, 70, 0.10)', accent: '#645546' },
  'The Tempest': { wash: 'rgba(70, 130, 140, 0.10)', accent: '#46828c' },
  'A Midsummer Night\'s Dream': { wash: 'rgba(90, 140, 90, 0.10)', accent: '#5a8c5a' },
  'Twelfth Night': { wash: 'rgba(130, 90, 130, 0.10)', accent: '#825a82' },
  'Pericles': { wash: 'rgba(70, 110, 130, 0.10)', accent: '#466e82' },
  'Coriolanus': { wash: 'rgba(140, 70, 70, 0.10)', accent: '#8c4646' },
}

const DEFAULT_COLOR = { wash: 'rgba(100, 100, 100, 0.06)', accent: '#5a5a5a' }

// Organic progress bar with main stroke + tributary (like the gold divider)
const ProgressBar = ({ percent, color }) => {
  if (percent === 0) return null

  return (
    <div style={{ marginTop: '0.6rem', position: 'relative', height: '12px' }}>
      {/* Background track */}
      <svg viewBox="0 0 200 12" preserveAspectRatio="none" style={{ width: '100%', height: '12px', position: 'absolute', top: 0, left: 0 }}>
        <path
          d="M0 6 Q25 4 50 7 Q100 9 150 5 Q175 3 200 6"
          stroke={color}
          strokeWidth="2"
          fill="none"
          opacity="0.12"
          strokeLinecap="round"
        />
      </svg>
      {/* Main progress stroke */}
      <svg
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
        style={{
          width: `${percent}%`,
          height: '12px',
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'visible'
        }}
      >
        <path
          d="M0 6 Q25 4 50 7 Q100 9 150 5 Q175 3 200 6"
          stroke={color}
          strokeWidth="3"
          fill="none"
          opacity="0.6"
          strokeLinecap="round"
        />
        {/* Tributary - lighter, offset */}
        <path
          d="M10 8 Q40 10 80 6 Q120 4 160 8 Q180 9 195 7"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
          opacity="0.3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

export default function AuthorWorks() {
  const { authorId } = useParams()
  const [author, setAuthor] = useState(null)
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api(`/authors/${authorId}`),
      api('/analytics/progress')
    ])
      .then(([authorData, progressData]) => {
        setAuthor(authorData)
        setProgress(progressData.progress || {})
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [authorId])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fdfcf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#9b2d30', fontFamily: "'Cormorant', serif", fontSize: '1.25rem' }}>Loading...</div>
      </div>
    )
  }

  if (!author) {
    return (
      <div style={{ minHeight: '100vh', background: '#fdfcf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#9b2d30' }}>Author not found</div>
      </div>
    )
  }

  const getWorkProgress = (workId) => {
    const key = `${authorId}/${workId}`
    const workProgress = progress[key]
    if (!workProgress || !workProgress.mastered) return 0
    const work = author.works.find(w => w.id === workId)
    if (!work) return 0
    return Math.round((workProgress.mastered.length / work.chunks.length) * 100)
  }

  // Group works by play (source)
  const worksByPlay = author.works.reduce((acc, work) => {
    const play = work.source
    if (!acc[play]) acc[play] = []
    acc[play].push(work)
    return acc
  }, {})

  const plays = Object.keys(worksByPlay).sort()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fdfcf8',
      fontFamily: "'IBM Plex Sans', sans-serif",
      padding: '1.5rem'
    }}>
      {/* Header */}
      <div style={{ maxWidth: '42rem', margin: '0 auto 2rem' }}>
        <Link to="/" style={{ color: '#4a4a4a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
          <Home size={18} />
          <span>Back to Home</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '3rem' }}>{author.portrait}</span>
          <div>
            <h1 style={{ fontFamily: "'Cormorant', serif", fontSize: '2rem', color: '#1a1a1a', fontWeight: 400, margin: 0 }}>{author.name}</h1>
            <p style={{ color: '#4a4a4a', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>{author.subtitle}</p>
          </div>
        </div>

        {/* Overall stats */}
        <div style={{
          marginTop: '1.5rem',
          display: 'flex',
          gap: '2rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid rgba(0,0,0,0.06)'
        }}>
          <div>
            <div style={{ fontFamily: "'Cormorant', serif", fontSize: '1.5rem', color: '#9b2d30' }}>{author.works.length}</div>
            <div style={{ fontSize: '0.75rem', color: '#9a9a9a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Soliloquies</div>
          </div>
          <div>
            <div style={{ fontFamily: "'Cormorant', serif", fontSize: '1.5rem', color: '#3d5c4a' }}>{plays.length}</div>
            <div style={{ fontSize: '0.75rem', color: '#9a9a9a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plays</div>
          </div>
        </div>
      </div>

      {/* Works grouped by play */}
      <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
        {plays.map((play, playIndex) => {
          const works = worksByPlay[play]
          const colors = PLAY_COLORS[play] || DEFAULT_COLOR

          return (
            <section
              key={play}
              style={{
                marginBottom: '2rem',
                position: 'relative'
              }}
            >
              {/* Ink wash background - more visible */}
              <div style={{
                position: 'absolute',
                top: '-0.5rem',
                left: '-1rem',
                right: '-1rem',
                bottom: '-0.5rem',
                background: `linear-gradient(145deg, ${colors.wash.replace('0.06', '0.12').replace('0.08', '0.14')} 0%, ${colors.wash.replace('0.06', '0.04').replace('0.08', '0.05')} 50%, transparent 85%)`,
                borderRadius: '12px',
                zIndex: 0,
                pointerEvents: 'none'
              }} />

              {/* Accent bar on left edge */}
              <div style={{
                position: 'absolute',
                top: '0.5rem',
                left: '-0.5rem',
                bottom: '0.5rem',
                width: '3px',
                background: `linear-gradient(180deg, ${colors.accent}60 0%, ${colors.accent}20 100%)`,
                borderRadius: '2px',
                zIndex: 1
              }} />

              {/* Play header */}
              <div style={{ position: 'relative', zIndex: 1, marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
                <h2 style={{
                  fontFamily: "'Cormorant', serif",
                  fontSize: '1.3rem',
                  color: colors.accent,
                  fontWeight: 500,
                  margin: 0,
                  fontStyle: 'italic',
                  letterSpacing: '0.01em'
                }}>
                  {play}
                </h2>
                <div style={{
                  fontSize: '0.7rem',
                  color: '#9a9a9a',
                  marginTop: '0.35rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  {works.length} {works.length === 1 ? 'speech' : 'speeches'}
                </div>
              </div>

              {/* Works in this play */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'relative', zIndex: 1 }}>
                {works.map((work) => {
                  const pct = getWorkProgress(work.id)
                  return (
                    <Link
                      key={work.id}
                      to={`/practice/${authorId}/${work.id}`}
                      style={{
                        display: 'block',
                        padding: '0.875rem 1rem',
                        background: 'rgba(253, 252, 248, 0.8)',
                        border: '1px solid rgba(0,0,0,0.06)',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                        backdropFilter: 'blur(4px)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.95)'
                        e.currentTarget.style.borderColor = colors.accent + '30'
                        e.currentTarget.style.boxShadow = `0 2px 8px ${colors.accent}15`
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(253, 252, 248, 0.8)'
                        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.05rem', color: '#1a1a1a', margin: 0, fontWeight: 400 }}>
                            "{work.title}"
                          </h3>
                          <p style={{ color: '#4a4a4a', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
                            {work.character} • {work.act}
                          </p>
                          <p style={{ color: '#9a9a9a', fontSize: '0.75rem', margin: '0.15rem 0 0' }}>
                            {work.chunks.length} lines to master
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {pct > 0 && (
                            <div style={{ textAlign: 'right' }}>
                              <div style={{
                                fontFamily: "'Cormorant', serif",
                                color: colors.accent,
                                fontSize: '1.1rem',
                                fontWeight: 500
                              }}>{pct}%</div>
                              <div style={{ color: '#9a9a9a', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>mastered</div>
                            </div>
                          )}
                          <ChevronRight size={16} style={{ color: '#9a9a9a' }} />
                        </div>
                      </div>
                      <ProgressBar percent={pct} color={colors.accent} />
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {/* Footer breathing room */}
      <div style={{ height: '3rem' }} />
    </div>
  )
}
