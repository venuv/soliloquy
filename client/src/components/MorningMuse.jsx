import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Home, Coffee, ThumbsUp, ThumbsDown } from 'lucide-react'
import { api, trackPageview } from '../App'

const colors = {
  paper: '#fdfcf8',
  ink: '#1a1a1a',
  inkLight: '#4a4a4a',
  inkFaint: '#9a9a9a',
  crimson: '#9b2d30',
  forest: '#3d5c4a',
  deepBlue: '#2a4a5e',
  gold: '#c4a35a',
  purple: '#5a4a6a'
}

const MOODS = [
  { key: 'straight', label: 'Straight with me' },
  { key: 'laugh',    label: 'Make me laugh' },
  { key: 'deep',     label: 'Go deep' },
  { key: 'challenge',label: 'Challenge me' },
  { key: 'listen',   label: 'Just listen' },
]

const MOOD_COLORS = {
  straight:  { bg: 'rgba(42,74,94,0.08)',  color: colors.deepBlue },
  laugh:     { bg: 'rgba(196,163,90,0.10)', color: '#8a7a3a' },
  deep:      { bg: 'rgba(90,74,106,0.08)',  color: colors.purple },
  challenge: { bg: 'rgba(155,45,48,0.08)',  color: colors.crimson },
  listen:    { bg: 'rgba(61,92,74,0.08)',   color: colors.forest },
}

// Each segment is 72deg. Pointer at top (0deg).
// Segment midpoints: 36, 108, 180, 252, 324
const SEGMENT_CENTERS = [36, 108, 180, 252, 324]
const MAX_SPINS = 3

function FortuneWheel({ onSpinComplete, usedVoices }) {
  const wheelRef = useRef(null)
  const rotationRef = useRef(0)
  const [spinning, setSpinning] = useState(false)
  const [revealedMood, setRevealedMood] = useState(null)

  const spin = useCallback(() => {
    if (spinning) return
    setSpinning(true)
    setRevealedMood(null)

    // Pick winner avoiding repeats
    let idx = Math.floor(Math.random() * 5)
    let attempts = 0
    while (usedVoices.includes(idx) && attempts < 5) {
      idx = (idx + 1) % 5
      attempts++
    }

    const segCenter = SEGMENT_CENTERS[idx]
    const jitter = (Math.random() - 0.5) * 40
    const targetAngle = (360 - segCenter) + jitter
    const fullSpins = 1080 + Math.random() * 720
    const total = rotationRef.current + fullSpins + targetAngle

    const wheel = wheelRef.current
    wheel.style.transition = 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
    wheel.style.transform = `rotate(${total}deg)`
    rotationRef.current = total

    setTimeout(() => setRevealedMood(MOODS[idx]), 3200)
    setTimeout(() => {
      setSpinning(false)
      onSpinComplete(MOODS[idx], idx)
    }, 4500)
  }, [spinning, usedVoices, onSpinComplete])

  return (
    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
      <p style={{ fontFamily: "'Cormorant', serif", fontSize: '1rem', fontStyle: 'italic', color: colors.inkFaint, marginBottom: '1.5rem', lineHeight: 1.5 }}>
        The wheel shall choose how Fortune speaks today
      </p>

      <div style={{ position: 'relative', width: 260, height: 260, margin: '0 auto' }}>
        {/* Pointer */}
        <svg style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', zIndex: 3, width: 20, height: 24 }} viewBox="0 0 20 24">
          <polygon points="10,24 3,6 10,0 17,6" fill={colors.ink} opacity="0.85"/>
        </svg>

        {/* Wheel */}
        <svg ref={wheelRef} viewBox="0 0 260 260" style={{ width: '100%', height: '100%' }}>
          <defs>
            <filter id="ink-rough" x="-2%" y="-2%" width="104%" height="104%">
              <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="4" result="noise"/>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G"/>
            </filter>
          </defs>
          <g filter="url(#ink-rough)">
            <circle cx="130" cy="130" r="120" fill="none" stroke={colors.ink} strokeWidth="1.5" opacity="0.65"/>
            <circle cx="130" cy="130" r="116" fill="none" stroke={colors.ink} strokeWidth="0.4" opacity="0.2"/>
            <circle cx="130" cy="130" r="26" fill="none" stroke={colors.ink} strokeWidth="1" opacity="0.5"/>
            <circle cx="130" cy="130" r="3" fill={colors.ink} opacity="0.6"/>
            <line x1="130" y1="130" x2="130"   y2="10"    stroke={colors.ink} strokeWidth="0.7" opacity="0.35"/>
            <line x1="130" y1="130" x2="244.1" y2="92.9"  stroke={colors.ink} strokeWidth="0.7" opacity="0.35"/>
            <line x1="130" y1="130" x2="200.7" y2="227.1" stroke={colors.ink} strokeWidth="0.7" opacity="0.35"/>
            <line x1="130" y1="130" x2="59.3"  y2="227.1" stroke={colors.ink} strokeWidth="0.7" opacity="0.35"/>
            <line x1="130" y1="130" x2="15.9"  y2="92.9"  stroke={colors.ink} strokeWidth="0.7" opacity="0.35"/>
          </g>
          <g fontFamily="'Cormorant', serif" fontStyle="italic" fontWeight="400" fontSize="13.5" fill={colors.inkLight} textAnchor="middle" dominantBaseline="middle">
            <text x="176" y="68" transform="rotate(36, 176, 68)">Straight with me</text>
            <text x="204" y="154" transform="rotate(-72, 204, 154)">Make me laugh</text>
            <text x="130" y="208" transform="rotate(0, 130, 208)">Go deep</text>
            <text x="56" y="154" transform="rotate(72, 56, 154)">Challenge me</text>
            <text x="84" y="68" transform="rotate(-36, 84, 68)">Just listen</text>
          </g>
          <g fill={colors.ink} opacity="0.4">
            <circle cx="130" cy="11" r="2"/>
            <circle cx="244" cy="93" r="2"/>
            <circle cx="200.5" cy="227" r="2"/>
            <circle cx="59.5" cy="227" r="2"/>
            <circle cx="16" cy="93" r="2"/>
          </g>
        </svg>
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        style={{
          display: 'inline-block', marginTop: '1.25rem', padding: '0.6rem 2.5rem',
          fontFamily: "'Cormorant', serif", fontSize: '1rem', fontWeight: 500,
          color: colors.ink, background: 'transparent',
          border: '1.5px solid rgba(0,0,0,0.2)', borderRadius: 8,
          cursor: spinning ? 'default' : 'pointer', letterSpacing: '0.06em',
          opacity: spinning ? 0.3 : 1, transition: 'all 0.2s'
        }}
      >
        Turn the Wheel
      </button>

      <div style={{
        fontFamily: "'Cormorant', serif", fontSize: '1.15rem', fontWeight: 500,
        color: colors.ink, marginTop: '1.25rem', minHeight: '1.5em',
        letterSpacing: '0.02em', opacity: revealedMood ? 1 : 0, transition: 'opacity 0.5s ease'
      }}>
        {revealedMood?.label || ''}
      </div>
    </div>
  )
}

export default function MorningMuse() {
  const [phase, setPhase] = useState('input') // input | spin | response
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [feedbackGiven, setFeedbackGiven] = useState(false)
  const [quotesCount, setQuotesCount] = useState(null)
  const [usedVoices, setUsedVoices] = useState([])
  const [selectedMood, setSelectedMood] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => { trackPageview('muse') }, [])

  useEffect(() => {
    api('/muse/quotes/count')
      .then(data => setQuotesCount(data.count))
      .catch(() => setQuotesCount(0))
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || input.trim().length < 5) return
    setPhase('spin')
    setError(null)
    setResponse(null)
    setStreamText('')
    setFeedbackGiven(false)
  }

  const handleSpinComplete = useCallback(async (mood, idx) => {
    setSelectedMood(mood)
    setUsedVoices(prev => [...prev, idx])
    setPhase('response')
    setLoading(true)
    setStreamText('')

    // Try SSE streaming first
    try {
      const key = localStorage.getItem('userKey')
      const headers = { 'Content-Type': 'application/json', Accept: 'text/event-stream' }
      if (key) headers['X-User-Key'] = key

      const ctrl = new AbortController()
      abortRef.current = ctrl

      const res = await fetch('/api/muse?stream=1', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ input: input.trim(), style: mood.key }),
        signal: ctrl.signal
      })

      if (!res.ok) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let meta = null
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Parse SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() // keep incomplete line

        let eventType = null
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7)
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (eventType === 'meta') {
              meta = JSON.parse(data)
            } else if (eventType === 'token') {
              const token = JSON.parse(data)
              fullText += token
              setStreamText(fullText)
            } else if (eventType === 'done') {
              // Complete
            }
            eventType = null
          }
        }
      }

      // Build final response object
      setResponse({
        id: meta?.id,
        response: fullText,
        quote: meta?.quote,
        meta: meta?.meta
      })
      setLoading(false)
    } catch (err) {
      if (err.name === 'AbortError') return
      // Fallback to batch mode
      console.warn('SSE failed, falling back to batch:', err.message)
      try {
        const data = await api('/muse', {
          method: 'POST',
          body: JSON.stringify({ input: input.trim(), style: mood.key })
        })
        setResponse(data)
        setStreamText(data.response)
      } catch (batchErr) {
        setError(batchErr.message || 'The muse is momentarily silent.')
        setPhase('input')
      }
      setLoading(false)
    }
  }, [input])

  const handleFeedback = async (liked) => {
    if (!response?.id || feedbackGiven) return
    try {
      await api('/muse/feedback', {
        method: 'POST',
        body: JSON.stringify({ responseId: response.id, liked })
      })
      setFeedbackGiven(true)
    } catch (err) {
      console.error('Feedback error:', err)
    }
  }

  const handleSpinAgain = () => {
    setPhase('input')
    setResponse(null)
    setStreamText('')
    setError(null)
    setFeedbackGiven(false)
    setSelectedMood(null)
    // Keep input pre-filled, keep usedVoices
  }

  const handleStartFresh = () => {
    setPhase('input')
    setInput('')
    setResponse(null)
    setStreamText('')
    setError(null)
    setFeedbackGiven(false)
    setSelectedMood(null)
    setUsedVoices([])
  }

  const spinsLeft = MAX_SPINS - usedVoices.length

  return (
    <div style={{ minHeight: '100vh', background: colors.paper, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 300, padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ maxWidth: '28rem', margin: '0 auto 2rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
          <Link to="/" style={{ color: colors.inkLight, textDecoration: 'none', position: 'absolute', left: '1.5rem' }} title="Home">
            <Home size={20} />
          </Link>
          <h1 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.75rem', color: colors.ink, fontWeight: 400, letterSpacing: '0.02em', margin: 0 }}>
            Morning Muse
          </h1>
        </div>
        <p style={{ fontFamily: "'Cormorant', serif", fontSize: '0.95rem', fontStyle: 'italic', color: colors.inkFaint, margin: 0 }}>
          Shakespeare's wisdom, Fortune's choosing
        </p>
      </div>

      <div style={{ maxWidth: '28rem', margin: '0 auto' }}>
        {/* PHASE 1: Input */}
        {phase === 'input' && (
          <div>
            <form onSubmit={handleSubmit}>
              <div style={{ background: 'rgba(61,92,74,0.04)', border: '1px solid rgba(61,92,74,0.12)', borderRadius: 12, padding: '1.5rem' }}>
                <label style={{ display: 'block', fontFamily: "'Cormorant', serif", fontSize: '1.1rem', fontWeight: 500, color: colors.inkLight, letterSpacing: '0.02em' }}>
                  How are you feeling this morning?
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tired. Restless. Can't focus on anything..."
                  style={{
                    width: '100%', height: '5rem', marginTop: '0.75rem', padding: '0.75rem',
                    fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.95rem', fontWeight: 300,
                    color: colors.ink, background: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8,
                    resize: 'none', lineHeight: 1.6, boxSizing: 'border-box'
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || input.trim().length < 5}
                  style={{
                    display: 'block', width: '100%', marginTop: '1rem', padding: '0.75rem',
                    fontFamily: "'Cormorant', serif", fontSize: '1.05rem', fontWeight: 500,
                    color: (!input.trim() || input.trim().length < 5) ? colors.inkFaint : colors.paper,
                    background: (!input.trim() || input.trim().length < 5) ? 'rgba(0,0,0,0.06)' : colors.forest,
                    border: 'none', borderRadius: 8,
                    cursor: (!input.trim() || input.trim().length < 5) ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.04em', transition: 'opacity 0.2s'
                  }}
                >
                  Seek Wisdom
                </button>
              </div>
            </form>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
              {["I'm anxious about today", "Feeling stuck, no momentum", "Actually pretty good", "Restless, need direction"].map(s => (
                <button key={s} onClick={() => setInput(s)} style={{
                  fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.8rem', fontWeight: 300,
                  color: colors.inkFaint, background: 'transparent',
                  border: '1px solid rgba(0,0,0,0.1)', borderRadius: 20,
                  padding: '0.35rem 0.75rem', cursor: 'pointer', transition: 'all 0.2s'
                }}>
                  {s}
                </button>
              ))}
            </div>

            {quotesCount !== null && (
              <p style={{ textAlign: 'center', color: colors.inkFaint, fontSize: '0.8rem', marginTop: '1.25rem' }}>
                {quotesCount} Shakespeare quotes ready
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && phase === 'input' && (
          <div style={{ background: 'rgba(155,45,48,0.08)', border: '1px solid rgba(155,45,48,0.2)', borderRadius: 12, padding: '1.5rem', color: colors.crimson, marginTop: '1rem' }}>
            <p>{error}</p>
          </div>
        )}

        {/* PHASE 2: Fortune's Wheel */}
        {phase === 'spin' && (
          <FortuneWheel onSpinComplete={handleSpinComplete} usedVoices={usedVoices} />
        )}

        {/* PHASE 3: Response */}
        {phase === 'response' && (
          <div>
            <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '1.5rem', background: 'rgba(0,0,0,0.015)' }}>
              {/* User echo */}
              <p style={{ fontSize: '0.85rem', color: colors.inkFaint, fontStyle: 'italic', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                "{input}"
              </p>

              {/* Mood badge */}
              {selectedMood && (
                <span style={{
                  display: 'inline-block', fontFamily: "'Cormorant', serif",
                  fontSize: '0.85rem', fontWeight: 500, fontStyle: 'italic',
                  letterSpacing: '0.03em', padding: '0.25rem 0.75rem', borderRadius: 20,
                  marginBottom: '1.25rem',
                  background: MOOD_COLORS[selectedMood.key]?.bg,
                  color: MOOD_COLORS[selectedMood.key]?.color
                }}>
                  {selectedMood.label}
                </span>
              )}

              {/* Response text — streams in */}
              <div style={{ fontSize: '0.95rem', lineHeight: 1.7, color: colors.inkLight, whiteSpace: 'pre-wrap', minHeight: '4rem' }}>
                {streamText || (loading && (
                  <span style={{ color: colors.inkFaint, fontStyle: 'italic' }}>
                    The Muse speaks...
                  </span>
                ))}
                {loading && streamText && <span style={{ opacity: 0.4, animation: 'blink 1s infinite' }}>|</span>}
              </div>

              {/* Quote source — show after loading */}
              {response?.quote && (
                <div style={{ borderLeft: `2px solid ${colors.gold}`, padding: '0.75rem 1rem', margin: '1.25rem 0', background: 'rgba(196,163,90,0.04)', borderRadius: '0 8px 8px 0' }}>
                  <div style={{ fontFamily: "'Cormorant', serif", fontSize: '1.05rem', fontWeight: 400, lineHeight: 1.65, color: colors.ink, fontStyle: 'italic', whiteSpace: 'pre-line' }}>
                    {response.quote.text}
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: colors.inkFaint }}>
                    <span style={{ color: colors.crimson }}>{response.quote.character}</span>
                    {' in '}
                    <em>{response.quote.play}</em>
                  </div>
                  {response.quote.situation && (
                    <p style={{ fontSize: '0.8rem', color: colors.inkFaint, marginTop: '0.35rem', lineHeight: 1.5 }}>
                      {response.quote.situation}
                    </p>
                  )}
                </div>
              )}

              {/* Feedback */}
              {!loading && response && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ color: colors.inkFaint, fontSize: '0.85rem', flex: 1 }}>
                    {feedbackGiven ? 'Thanks for your feedback!' : 'Did this resonate?'}
                  </span>
                  {!feedbackGiven && (
                    <>
                      <button onClick={() => handleFeedback(true)} style={{ padding: '0.4rem 0.8rem', background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, cursor: 'pointer', color: colors.forest, display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        <ThumbsUp size={14} /> Helpful
                      </button>
                      <button onClick={() => handleFeedback(false)} style={{ padding: '0.4rem 0.8rem', background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, cursor: 'pointer', color: colors.crimson, display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        <ThumbsDown size={14} /> Not quite
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Spin again / Start fresh */}
            {!loading && (
              <div style={{ marginTop: '1.25rem' }}>
                {spinsLeft > 0 ? (
                  <button onClick={handleSpinAgain} style={{
                    display: 'block', width: '100%', padding: '0.65rem',
                    fontFamily: "'Cormorant', serif", fontSize: '0.95rem', fontWeight: 500,
                    color: colors.inkLight, background: 'transparent',
                    border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8,
                    cursor: 'pointer', letterSpacing: '0.03em', transition: 'all 0.2s'
                  }}>
                    Spin again ({spinsLeft} left)
                  </button>
                ) : (
                  <button onClick={handleStartFresh} style={{
                    display: 'block', width: '100%', padding: '0.65rem',
                    fontFamily: "'Cormorant', serif", fontSize: '0.95rem', fontWeight: 500,
                    color: colors.inkLight, background: 'transparent',
                    border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8,
                    cursor: 'pointer', letterSpacing: '0.03em', transition: 'all 0.2s'
                  }}>
                    Start fresh
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
