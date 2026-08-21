import { useState, useEffect } from 'react'
import { trackEvent } from '../App'

const STORAGE_KEY = 'soliloquy_seenTour_v1'

const SLIDES = [
  {
    title: 'A quiet place to memorize Shakespeare',
    body: `40 soliloquies from 19 plays — Hamlet, Macbeth, King Lear, Antony & Cleopatra, and more.
Learn them line by line, then test yourself. No sign-up, no email — just a 6-digit key that saves your progress.`
  },
  {
    title: 'Pick a soliloquy',
    body: `From the home page, click into Shakespeare, then pick a work.
New to memorizing? Start short: "If music be the food of love" (8 lines) or "All the world's a stage" (14 lines).
Ready for the mountain? "To be, or not to be" (33 lines).`
  },
  {
    title: 'Three modes: Learn, Drill, Test',
    body: `Learn: cards flip line-by-line. Master each before moving on.
Drill: same lines, randomized order — spaced repetition, weighted toward what you miss.
Test: recite each line from memory (type or use your mic). You get a composite score for accuracy, fluency, and pacing.`
  },
  {
    title: 'Save your 6-digit key',
    body: `Your key is shown at the top of the header. Screenshot it or jot it down.
There is no password recovery — the key IS your login. Enter it on the login screen from any device to pick up where you left off.
When you're ready — click Begin.`
  }
]

export default function Onboarding({ onDone }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    trackEvent('onboarding-open')
  }, [])

  const finish = (reason) => {
    localStorage.setItem(STORAGE_KEY, '1')
    trackEvent('onboarding-close', { slide: i + 1, of: SLIDES.length, reason })
    onDone()
  }
  const next = () => {
    if (i + 1 < SLIDES.length) setI(i + 1)
    else finish('completed')
  }
  const skip = () => finish('skipped')

  const slide = SLIDES[i]
  const isLast = i + 1 === SLIDES.length

  return (
    <div
      onClick={skip}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(20, 20, 20, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '1rem',
        fontFamily: "'IBM Plex Sans', sans-serif"
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fdfcf8', color: '#1a1a1a',
          maxWidth: '520px', width: '100%',
          borderRadius: '10px', padding: '2rem 2rem 1.25rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          border: '1px solid rgba(0,0,0,0.08)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
          <div style={{ fontFamily: "'Cormorant', serif", fontSize: '0.85rem', color: '#9b2d30', letterSpacing: '.05em' }}>
            {i + 1} / {SLIDES.length}
          </div>
          <button
            onClick={skip}
            style={{ background: 'none', border: 'none', color: '#9a9a9a', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Skip
          </button>
        </div>

        <h2 style={{
          fontFamily: "'Cormorant', serif", fontWeight: 400,
          fontSize: '1.5rem', margin: '0 0 0.75rem', color: '#1a1a1a', lineHeight: 1.2
        }}>
          {slide.title}
        </h2>

        <p style={{
          fontSize: '0.95rem', lineHeight: 1.6, color: '#4a4a4a',
          margin: '0 0 1.75rem', whiteSpace: 'pre-line'
        }}>
          {slide.body}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {SLIDES.map((_, idx) => (
              <div key={idx} style={{
                width: '20px', height: '3px', borderRadius: '2px',
                background: idx <= i ? '#9b2d30' : 'rgba(0,0,0,0.12)'
              }} />
            ))}
          </div>
          <button
            onClick={next}
            style={{
              background: '#9b2d30', color: '#fdfcf8', border: 'none',
              padding: '0.55rem 1.4rem', borderRadius: '6px', cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.9rem', fontWeight: 400
            }}
          >
            {isLast ? 'Begin' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper — returns true if this browser has never seen the tour.
export function shouldShowOnboarding() {
  return typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)
}
