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
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Shakespeare illustration — right side, visible, soft fade to left */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/images/shakespeare-splash.jpeg)',
          backgroundSize: '500px auto',
          backgroundPosition: '75% 35%',
          backgroundRepeat: 'no-repeat',
          opacity: 0.14,
          filter: 'grayscale(100%) contrast(1.1)',
          maskImage: 'linear-gradient(to right, transparent 10%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.8) 65%, black 80%, rgba(0,0,0,0.6) 95%, transparent 100%), radial-gradient(ellipse 80% 80% at 70% 45%, black 30%, transparent 75%)',
          maskComposite: 'intersect',
          WebkitMaskImage: 'linear-gradient(to right, transparent 10%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.8) 65%, black 80%, rgba(0,0,0,0.6) 95%, transparent 100%)',
        }}
      />

      {/* Decorative quill-stroke line above title */}
      <div className="w-40 h-px bg-gradient-to-r from-transparent via-ink/15 to-transparent mb-8 relative z-10" />

      {/* Title & tagline */}
      <div className="text-center mb-6 relative z-10">
        <h1 className="font-cormorant text-5xl font-light text-ink tracking-wide mb-3">
          Soliloquy
        </h1>
        <p className="font-cormorant italic text-ink-light text-lg" style={{ fontWeight: 300 }}>
          to thine own self be true
        </p>
      </div>

      {/* Contextual calligraphic prompt */}
      <p
        className="font-cormorant text-ink-faint text-xs tracking-widest uppercase mb-8 relative z-10"
        style={{ letterSpacing: '0.2em' }}
      >
        {mode === 'choice' && 'take the stage'}
        {mode === 'enter' && 'speak, friend'}
      </p>

      {/* Choice buttons */}
      {mode === 'choice' && (
        <div className="space-y-3 w-full max-w-xs relative z-10">
          <button
            onClick={() => setMode('enter')}
            className="w-full flex items-center justify-center gap-3 p-4 bg-white/70 backdrop-blur-sm border border-ink/8 hover:border-ink/25 rounded-lg text-ink transition-all duration-300 hover:shadow-sm"
          >
            <KeyRound size={18} className="text-ink-faint" />
            <span className="font-cormorant text-lg">I have a key</span>
          </button>
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 p-4 bg-crimson/90 hover:bg-crimson rounded-lg text-white transition-all duration-300 hover:shadow-md disabled:opacity-50"
          >
            <Sparkles size={18} />
            <span className="font-cormorant text-lg">{loading ? 'Conjuring...' : 'Conjure a new key'}</span>
          </button>

          <p
            className="text-center font-cormorant italic text-ink-light/60 mt-6 leading-loose"
            style={{ fontSize: '0.95rem', letterSpacing: '0.03em' }}
          >
            Press, and a shadow of thyself becomes thy key —<br />
            <span className="text-ink-faint/50" style={{ fontSize: '0.8rem' }}>
              no name, no account, just thy mark upon the stage
            </span>
          </p>
        </div>
      )}

      {/* Key entry form */}
      {mode === 'enter' && (
        <form onSubmit={handleLogin} className="w-full max-w-xs relative z-10">
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="thy key"
            className="w-full p-4 bg-white/70 backdrop-blur-sm border border-ink/15 text-ink rounded-lg mb-4 text-center font-cormorant text-xl tracking-widest focus:outline-none focus:border-crimson/60 transition-colors placeholder:text-ink-faint placeholder:italic"
            autoFocus
          />
          {error && <p className="text-crimson text-center mb-4 text-sm font-cormorant">{error}</p>}
          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full p-4 bg-crimson/90 hover:bg-crimson rounded-lg text-white font-cormorant text-lg transition-all duration-300 hover:shadow-md disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
          <button
            type="button"
            onClick={() => { setMode('choice'); setError('') }}
            className="w-full p-3 text-ink-faint hover:text-ink-light mt-2 text-sm font-cormorant italic transition-colors"
          >
            back
          </button>
        </form>
      )}

      {/* Decorative quill-stroke line below content */}
      <div className="w-40 h-px bg-gradient-to-r from-transparent via-ink/15 to-transparent mt-8 relative z-10" />

      {/* Bottom flourish */}
      <p className="absolute bottom-8 font-cormorant italic text-ink-faint/40 text-xs tracking-wide select-none">
        all the world's a stage
      </p>
    </div>
  )
}
