import { useState, useEffect } from 'react'
import { api, trackEvent } from '../App'

// Modal for requesting new content. Pass `source` so the click event
// records where the modal was triggered from ('header' or 'catalog').
export default function RequestContent({ source = 'unknown', onClose }) {
  const [request, setRequest] = useState('')
  const [context, setContext] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    trackEvent('request-open', { source })
  }, [source])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (request.trim().length < 3) return
    setSubmitting(true)
    setError(null)
    try {
      await api('/requests', {
        method: 'POST',
        body: JSON.stringify({ request: request.trim(), context: context.trim(), source })
      })
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Failed to send. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(20,20,20,0.55)',
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
          borderRadius: '10px', padding: '1.75rem 2rem 1.25rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          border: '1px solid rgba(0,0,0,0.08)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
          <h2 style={{
            fontFamily: "'Cormorant', serif", fontWeight: 400,
            fontSize: '1.5rem', margin: 0, color: '#1a1a1a'
          }}>
            {submitted ? 'Got it — thank you' : 'Request a speech'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#9a9a9a', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}
            title="Close"
          >
            ×
          </button>
        </div>

        {submitted ? (
          <>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#4a4a4a', margin: '0 0 1.5rem' }}>
              By my faith, marked and welcome. I read every one — those who tread these boards themselves are served first.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  background: '#3d5c4a', color: '#fdfcf8', border: 'none',
                  padding: '0.55rem 1.4rem', borderRadius: '6px', cursor: 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.9rem'
                }}
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', color: '#4a4a4a', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              What soliloquy or speech would you like added?
            </label>
            <textarea
              value={request}
              onChange={e => setRequest(e.target.value.slice(0, 2000))}
              placeholder="e.g. Portia's mercy speech, Titania's Act 2 monologue, or 'Lady M's Act 1 letter reading'"
              rows={3}
              autoFocus
              style={{
                width: '100%', padding: '0.6rem 0.75rem', borderRadius: 6,
                border: '1px solid rgba(0,0,0,0.15)', background: '#fdfcf8',
                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.9rem',
                resize: 'vertical', color: '#1a1a1a', boxSizing: 'border-box',
                marginBottom: '1rem'
              }}
            />

            <label style={{ display: 'block', color: '#4a4a4a', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              Any context that might help? <span style={{ color: '#9a9a9a', fontSize: '0.8rem' }}>(optional)</span>
            </label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value.slice(0, 2000))}
              placeholder="What you're working on, why this one, exam board, audition, etc."
              rows={2}
              style={{
                width: '100%', padding: '0.6rem 0.75rem', borderRadius: 6,
                border: '1px solid rgba(0,0,0,0.15)', background: '#fdfcf8',
                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.9rem',
                resize: 'vertical', color: '#1a1a1a', boxSizing: 'border-box',
                marginBottom: '1rem'
              }}
            />

            {error && (
              <p style={{ color: '#9b2d30', fontSize: '0.85rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>{error}</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'none', color: '#9a9a9a', border: 'none',
                  padding: '0.55rem 1rem', cursor: 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.9rem'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || request.trim().length < 3}
                style={{
                  background: submitting || request.trim().length < 3 ? 'rgba(0,0,0,0.15)' : '#9b2d30',
                  color: '#fdfcf8', border: 'none',
                  padding: '0.55rem 1.4rem', borderRadius: '6px',
                  cursor: submitting || request.trim().length < 3 ? 'not-allowed' : 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.9rem'
                }}
              >
                {submitting ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
