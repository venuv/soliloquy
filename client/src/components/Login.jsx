import { useState } from 'react'
import { useAuth } from '../App'

export default function Login() {
  const { login } = useAuth()
  const [mode, setMode] = useState('choice')
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      })
      const data = await res.json()
      if (data.key) {
        login(String(data.key))
      } else {
        setError('Failed to generate key')
      }
    } catch (err) {
      setError('Connection error')
    }
    setLoading(false)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!key.trim()) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key: key.trim() })
      })
      const data = await res.json()
      if (data.valid) {
        login(key.trim())
      } else {
        setError('Invalid key')
      }
    } catch (err) {
      setError('Connection error')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--paper)' }}>
      {/* Decorative ink wash element */}
      <div className="absolute top-0 left-0 right-0 h-32 opacity-30" style={{
        background: 'linear-gradient(180deg, rgba(155, 45, 48, 0.15) 0%, transparent 100%)'
      }} />

      <div className="text-center mb-12 relative">
        <h1 className="sumi-heading text-4xl mb-3" style={{ color: 'var(--ink)' }}>
          Soliloquy Master
        </h1>
        <p style={{ color: 'var(--ink-light)' }}>
          A quiet place to study Shakespeare's greatest speeches
        </p>
      </div>

      {mode === 'choice' && (
        <div className="space-y-4 w-full max-w-xs relative">
          <button
            onClick={() => setMode('enter')}
            className="sumi-button w-full flex items-center justify-center gap-3"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
            <span>I have a key</span>
          </button>
          <button
            onClick={handleRegister}
            disabled={loading}
            className="sumi-button primary w-full flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 3v18m9-9H3" />
            </svg>
            <span>{loading ? 'Creating...' : 'Begin anew'}</span>
          </button>
        </div>
      )}

      {mode === 'enter' && (
        <form onSubmit={handleLogin} className="w-full max-w-xs relative">
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter your key"
            className="sumi-input w-full mb-4 text-center text-xl tracking-widest"
            autoFocus
          />
          {error && (
            <p className="text-center mb-4" style={{ color: 'var(--crimson)' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="sumi-button primary w-full disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
          <button
            type="button"
            onClick={() => setMode('choice')}
            className="w-full py-4 mt-2 bg-transparent border-none cursor-pointer"
            style={{ color: 'var(--ink-light)' }}
          >
            Back
          </button>
        </form>
      )}

      {/* Bottom decoration */}
      <div className="absolute bottom-8 text-center">
        <p className="sumi-heading text-sm italic" style={{ color: 'var(--ink-faint)' }}>
          "All the world's a stage"
        </p>
      </div>
    </div>
  )
}
