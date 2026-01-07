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
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-amber-400 mb-2">🎭 Soliloquy Master</h1>
        <p className="text-gray-400">Master Shakespeare's greatest speeches</p>
      </div>

      {mode === 'choice' && (
        <div className="space-y-4 w-full max-w-xs">
          <button
            onClick={() => setMode('enter')}
            className="w-full flex items-center justify-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-white transition-colors"
          >
            <KeyRound size={24} />
            <span>I have a key</span>
          </button>
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 p-4 bg-amber-600 hover:bg-amber-500 rounded-xl text-white transition-colors disabled:opacity-50"
          >
            <Sparkles size={24} />
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
            placeholder="Enter your key (e.g., 1000)"
            className="w-full p-4 bg-gray-800 text-white rounded-xl mb-4 text-center text-xl tracking-widest"
            autoFocus
          />
          {error && <p className="text-red-400 text-center mb-4">{error}</p>}
          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full p-4 bg-amber-600 hover:bg-amber-500 rounded-xl text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
          <button
            type="button"
            onClick={() => setMode('choice')}
            className="w-full p-4 text-gray-400 hover:text-white mt-2"
          >
            Back
          </button>
        </form>
      )}
    </div>
  )
}
