import { useState } from 'react'
import { useAuth } from '../App'
import { KeyRound, Sparkles } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const [mode, setMode] = useState('choice') // 'choice', 'enter', 'register'
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
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <h1 className="font-cormorant text-4xl font-light text-ink mb-2">Soliloquy Master</h1>
        <p className="text-ink-light text-sm">A quiet place to study Shakespeare's greatest speeches</p>
      </div>

      {mode === 'choice' && (
        <div className="space-y-4 w-full max-w-xs">
          <button
            onClick={() => setMode('enter')}
            className="w-full flex items-center justify-center gap-3 p-4 bg-white border border-ink/10 hover:border-ink/30 rounded-lg text-ink transition-colors"
          >
            <KeyRound size={20} className="text-ink-light" />
            <span>I have a key</span>
          </button>
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 p-4 bg-crimson hover:bg-crimson/90 rounded-lg text-white transition-colors disabled:opacity-50"
          >
            <Sparkles size={20} />
            <span>{loading ? 'Creating...' : 'Get a new key'}</span>
          </button>
        </div>
      )}

      {mode === 'enter' && (
        <form onSubmit={handleLogin} className="w-full max-w-xs">
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter your key"
            className="w-full p-4 bg-white border border-ink/20 text-ink rounded-lg mb-4 text-center text-xl tracking-widest focus:outline-none focus:border-crimson"
            autoFocus
          />
          {error && <p className="text-crimson text-center mb-4 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full p-4 bg-crimson hover:bg-crimson/90 rounded-lg text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
          <button
            type="button"
            onClick={() => setMode('choice')}
            className="w-full p-4 text-ink-light hover:text-ink mt-2 text-sm"
          >
            Back
          </button>
        </form>
      )}
    </div>
  )
}
