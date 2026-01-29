import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Home, Send, ThumbsUp, ThumbsDown, RefreshCw, Coffee, Loader2 } from 'lucide-react'
import { api } from '../App'

const colors = {
  paper: '#fdfcf8',
  ink: '#1a1a1a',
  crimson: '#9b2d30',
  forest: '#3d5c4a',
  blue: '#2a4a5e',
  gold: '#c4a35a',
  muted: '#4a4a4a',
  faded: '#9a9a9a'
}

export default function MorningMuse() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [feedbackGiven, setFeedbackGiven] = useState(false)
  const [quotesCount, setQuotesCount] = useState(null)

  useEffect(() => {
    api('/muse/quotes/count')
      .then(data => setQuotesCount(data.count))
      .catch(() => setQuotesCount(0))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    setLoading(true)
    setError(null)
    setResponse(null)
    setFeedbackGiven(false)

    try {
      const data = await api('/muse', {
        method: 'POST',
        body: JSON.stringify({ input: input.trim() })
      })
      setResponse(data)
    } catch (err) {
      setError(err.message || 'The muse is momentarily silent. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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

  const handleReset = () => {
    setInput('')
    setResponse(null)
    setError(null)
    setFeedbackGiven(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.paper,
      fontFamily: "'IBM Plex Sans', sans-serif",
      padding: '1.5rem'
    }}>
      {/* Header */}
      <div style={{ maxWidth: '40rem', margin: '0 auto 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={{ color: colors.muted, textDecoration: 'none' }} title="Home">
            <Home size={22} />
          </Link>
          <div>
            <h1 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.75rem', color: colors.forest, fontWeight: 400, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Coffee size={22} />
              Morning Muse
            </h1>
            <p style={{ color: colors.muted, fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
              Share your morning mood, receive Shakespeare's wisdom
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '40rem', margin: '0 auto' }}>
        {/* Input Form */}
        {!response && (
          <form onSubmit={handleSubmit}>
            <div style={{ background: 'rgba(61,92,74,0.04)', border: '1px solid rgba(61,92,74,0.15)', borderRadius: '12px', padding: '1.5rem' }}>
              <label style={{ display: 'block', color: colors.ink, marginBottom: '0.75rem', fontFamily: "'Cormorant', serif", fontSize: '1.1rem' }}>
                How are you feeling this morning?
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="I woke up feeling anxious about the day ahead... / I'm grateful but a bit restless... / I can't shake this melancholy..."
                disabled={loading}
                style={{
                  width: '100%',
                  height: '8rem',
                  background: 'rgba(0,0,0,0.02)',
                  color: colors.ink,
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '8px',
                  padding: '1rem',
                  resize: 'none',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <span style={{ color: colors.faded, fontSize: '0.85rem' }}>
                  {quotesCount !== null ? `${quotesCount} Shakespeare quotes ready` : 'Loading quotes...'}
                </span>
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: loading || !input.trim() ? 'rgba(0,0,0,0.1)' : colors.forest,
                    color: loading || !input.trim() ? colors.faded : colors.paper,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: '0.95rem'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      Consulting the Bard...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Seek Wisdom
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(155,45,48,0.08)', border: '1px solid rgba(155,45,48,0.2)', borderRadius: '12px', padding: '1.5rem', color: colors.crimson }}>
            <p>{error}</p>
            <button onClick={handleReset} style={{ marginTop: '1rem', color: colors.crimson, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        )}

        {/* Response */}
        {response && (
          <div>
            {/* Main Response Card */}
            <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' }}>
              {/* Meta info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
                <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', color: colors.muted }}>
                  {response.meta?.style}
                </span>
                <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(61,92,74,0.1)', borderRadius: '4px', color: colors.forest }}>
                  {response.meta?.wisdomType}
                </span>
                {response.meta?.emotions?.map(e => (
                  <span key={e} style={{ padding: '0.25rem 0.5rem', background: 'rgba(90,74,106,0.1)', borderRadius: '4px', color: '#5a4a6a' }}>
                    {e}
                  </span>
                ))}
              </div>

              {/* Response text */}
              <p style={{ color: colors.ink, whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '1rem' }}>
                {response.response}
              </p>

              {/* Quote source */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <p style={{ color: colors.muted, fontSize: '0.9rem' }}>
                  <span style={{ color: colors.crimson }}>{response.quote?.character}</span>
                  {' '}in{' '}
                  <span style={{ color: colors.crimson, fontStyle: 'italic' }}>{response.quote?.play}</span>
                </p>
                {response.quote?.situation && (
                  <p style={{ color: colors.faded, fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    {response.quote.situation}
                  </p>
                )}
              </div>
            </div>

            {/* Feedback */}
            <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: colors.muted, fontSize: '0.9rem' }}>
                  {feedbackGiven ? 'Thanks for your feedback!' : 'Did this resonate with you?'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleFeedback(true)}
                    disabled={feedbackGiven}
                    style={{ padding: '0.5rem', borderRadius: '8px', background: 'none', border: 'none', cursor: feedbackGiven ? 'not-allowed' : 'pointer', color: feedbackGiven ? colors.faded : colors.forest }}
                    title="This helped"
                  >
                    <ThumbsUp size={20} />
                  </button>
                  <button
                    onClick={() => handleFeedback(false)}
                    disabled={feedbackGiven}
                    style={{ padding: '0.5rem', borderRadius: '8px', background: 'none', border: 'none', cursor: feedbackGiven ? 'not-allowed' : 'pointer', color: feedbackGiven ? colors.faded : colors.crimson }}
                    title="Not quite right"
                  >
                    <ThumbsDown size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Try again button */}
            <button onClick={handleReset} style={{ width: '100%', padding: '0.75rem', color: colors.muted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              <RefreshCw size={16} />
              Share another feeling
            </button>
          </div>
        )}

        {/* Prompt suggestions */}
        {!response && !loading && (
          <div style={{ marginTop: '2rem' }}>
            <p style={{ color: colors.faded, fontSize: '0.85rem', marginBottom: '0.75rem' }}>Not sure what to say? Try:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {[
                "I'm feeling anxious about a big decision",
                "I woke up melancholy today",
                "I feel stuck and restless",
                "I'm grateful but uncertain about the future"
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  style={{
                    fontSize: '0.85rem',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(0,0,0,0.03)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    color: colors.muted,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: "'IBM Plex Sans', sans-serif"
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
