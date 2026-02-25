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

// Dual progress bars: mastery (claimed) + test performance
const DualProgressBar = ({ masteryPercent, testPercent, accentColor }) => {
  const testColor = '#c4a35a' // warm gold for test performance

  if (masteryPercent === 0 && testPercent === 0) return null

  return (
    <div style={{ marginTop: '0.6rem', position: 'relative', height: '18px', overflow: 'hidden', borderRadius: '4px' }}>
      {/* Background tracks */}
      <svg viewBox="0 0 200 18" preserveAspectRatio="none" style={{ width: '100%', height: '18px', position: 'absolute', top: 0, left: 0 }}>
        {/* Mastery track (upper) */}
        <path
          d="M0 5 Q25 3 50 6 Q100 8 150 4 Q175 2 200 5"
          stroke={accentColor}
          strokeWidth="2"
          fill="none"
          opacity="0.1"
          strokeLinecap="round"
        />
        {/* Test track (lower) */}
        <path
          d="M0 13 Q30 15 70 11 Q120 9 160 14 Q185 16 200 13"
          stroke={testColor}
          strokeWidth="2"
          fill="none"
          opacity="0.1"
          strokeLinecap="round"
        />
      </svg>

      {/* Mastery progress (upper wave) - claimed mastery */}
      {masteryPercent > 0 && (
        <svg
          viewBox="0 0 200 18"
          preserveAspectRatio="none"
          style={{
            width: `${masteryPercent}%`,
            height: '18px',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        >
          <path
            d="M0 5 Q25 3 50 6 Q100 8 150 4 Q175 2 200 5"
            stroke={accentColor}
            strokeWidth="3"
            fill="none"
            opacity="0.7"
            strokeLinecap="round"
          />
          {/* Tributary */}
          <path
            d="M5 3 Q35 1 75 5 Q115 7 155 3 Q180 1 195 4"
            stroke={accentColor}
            strokeWidth="1.5"
            fill="none"
            opacity="0.35"
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* Test progress (lower wave) - test performance */}
      {testPercent > 0 && (
        <svg
          viewBox="0 0 200 18"
          preserveAspectRatio="none"
          style={{
            width: `${testPercent}%`,
            height: '18px',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        >
          <path
            d="M0 13 Q30 15 70 11 Q120 9 160 14 Q185 16 200 13"
            stroke={testColor}
            strokeWidth="3"
            fill="none"
            opacity="0.7"
            strokeLinecap="round"
          />
          {/* Tributary */}
          <path
            d="M8 15 Q45 17 85 12 Q130 10 170 15 Q190 17 198 14"
            stroke={testColor}
            strokeWidth="1.5"
            fill="none"
            opacity="0.35"
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  )
}

export default function AuthorWorks() {
  const { authorId } = useParams()
  const [author, setAuthor] = useState(null)
  const [progress, setProgress] = useState({})
  const [preferences, setPreferences] = useState({})
  const [loading, setLoading] = useState(true)
  const [playFilter, setPlayFilter] = useState(null)

  useEffect(() => {
    Promise.all([
      api(`/authors/${authorId}`),
      api('/analytics/progress'),
      api('/analytics/preferences')
    ])
      .then(([authorData, progressData, prefsData]) => {
        setAuthor(authorData)
        setProgress(progressData.progress || {})
        setPreferences(prefsData.practiceUnit || {})
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

  // Get claimed mastery percentage — respects active practice unit
  const getMasteryProgress = (workId) => {
    const key = `${authorId}/${workId}`
    const workProgress = progress[key]
    if (!workProgress) return 0
    const work = author.works.find(w => w.id === workId)
    if (!work) return 0
    const unit = preferences[key] || 'lines'
    if (unit === 'beats' && workProgress.masteredBeats) {
      const beatCount = work.beats?.length || 0
      if (beatCount === 0) return 0
      return Math.min(100, Math.round((workProgress.masteredBeats.length / beatCount) * 100))
    }
    if (!workProgress.mastered) return 0
    return Math.min(100, Math.round((workProgress.mastered.length / work.chunks.length) * 100))
  }

  // Get test performance percentage — respects active practice unit
  const getTestProgress = (workId) => {
    const key = `${authorId}/${workId}`
    const workProgress = progress[key]
    if (!workProgress || !workProgress.attempts || workProgress.attempts.length === 0) return 0

    const work = author.works.find(w => w.id === workId)
    if (!work) return 0

    const unit = preferences[key] || 'lines'
    const useBeats = unit === 'beats' && work.beats?.length > 0
    const totalItems = useBeats ? work.beats.length : work.chunks.length

    // Group attempts by the relevant index
    const itemAttempts = {}
    workProgress.attempts.forEach(attempt => {
      const idx = useBeats ? attempt.beatIndex : attempt.chunkIndex
      if (idx == null) return
      if (!itemAttempts[idx]) itemAttempts[idx] = []
      itemAttempts[idx].push(attempt.correct)
    })

    let testedItems = 0
    let totalScore = 0
    Object.values(itemAttempts).forEach(attempts => {
      if (attempts.length >= 1) {
        testedItems++
        const correctCount = attempts.filter(c => c).length
        totalScore += correctCount / attempts.length
      }
    })

    if (testedItems === 0) return 0
    return Math.min(100, Math.round((totalScore / totalItems) * 100))
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

        {/* Play filter */}
        <div style={{ marginTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          <button
            onClick={() => setPlayFilter(null)}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              border: 'none',
              cursor: 'pointer',
              background: playFilter === null ? '#5a4a6a' : 'rgba(0,0,0,0.03)',
              color: playFilter === null ? '#fdfcf8' : '#4a4a4a'
            }}
          >
            All Plays
          </button>
          {plays.map(play => {
            const colors = PLAY_COLORS[play] || DEFAULT_COLOR
            return (
              <button
                key={play}
                onClick={() => setPlayFilter(play)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: playFilter === play ? colors.accent : 'rgba(0,0,0,0.03)',
                  color: playFilter === play ? '#fdfcf8' : '#4a4a4a'
                }}
              >
                {play}
              </button>
            )
          })}
        </div>
      </div>

      {/* Works grouped by play */}
      <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
        {plays.filter(play => !playFilter || play === playFilter).map((play, playIndex) => {
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
                  const masteryPct = getMasteryProgress(work.id)
                  const testPct = getTestProgress(work.id)
                  const hasProgress = masteryPct > 0 || testPct > 0
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
                          {hasProgress && (
                            <div style={{ textAlign: 'right', minWidth: '3.5rem' }}>
                              {masteryPct > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                  <div style={{
                                    fontFamily: "'Cormorant', serif",
                                    color: colors.accent,
                                    fontSize: '1rem',
                                    fontWeight: 500
                                  }}>{masteryPct}%</div>
                                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.accent, opacity: 0.6 }} />
                                </div>
                              )}
                              {testPct > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                  <div style={{
                                    fontFamily: "'Cormorant', serif",
                                    color: '#c4a35a',
                                    fontSize: '1rem',
                                    fontWeight: 500
                                  }}>{testPct}%</div>
                                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c4a35a', opacity: 0.6 }} />
                                </div>
                              )}
                            </div>
                          )}
                          <ChevronRight size={16} style={{ color: '#9a9a9a' }} />
                        </div>
                      </div>
                      <DualProgressBar masteryPercent={masteryPct} testPercent={testPct} accentColor={colors.accent} />
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
