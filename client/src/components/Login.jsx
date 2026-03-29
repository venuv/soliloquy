import { useState } from 'react'
import { useAuth } from '../App'
import { KeyRound, Sparkles } from 'lucide-react'

function DemoCube() {
  return (
    <svg viewBox="0 0 500 520" className="h-auto" style={{ width: '520px' }}>
      <defs>
        <style>{`
          @keyframes lstate1 { 0%,26%{opacity:1} 32%,88%{opacity:0} 94%,100%{opacity:1} }
          @keyframes lstate2 { 0%,30%{opacity:0} 36%,60%{opacity:1} 66%,100%{opacity:0} }
          @keyframes lstate3 { 0%,64%{opacity:0} 70%,88%{opacity:1} 94%,100%{opacity:0} }
          .ls1 { animation: lstate1 6s ease-in-out infinite; }
          .ls2 { animation: lstate2 6s ease-in-out infinite; }
          .ls3 { animation: lstate3 6s ease-in-out infinite; }
        `}</style>
        <clipPath id="lc-top"><polygon points="250,10 410,105 250,200 90,105"/></clipPath>
        <clipPath id="lc-left"><polygon points="90,105 250,200 250,390 90,295"/></clipPath>
        <clipPath id="lc-right"><polygon points="250,200 410,105 410,295 250,390"/></clipPath>
        <pattern id="lh-left" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#4a3828" strokeWidth="0.4" opacity="0.09"/>
        </pattern>
        <pattern id="lh-left-x" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(-30)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="#4a3828" strokeWidth="0.3" opacity="0.06"/>
        </pattern>
        <pattern id="lh-right" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(-45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#4a3828" strokeWidth="0.35" opacity="0.065"/>
        </pattern>
        <pattern id="lh-top" patternUnits="userSpaceOnUse" width="6" height="6">
          <line x1="0" y1="3" x2="6" y2="3" stroke="#8b7355" strokeWidth="0.3" opacity="0.07"/>
        </pattern>
        <filter id="lp" x="-3%" y="-3%" width="106%" height="106%">
          <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="5" seed="7" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.5" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <filter id="lp2" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" seed="2" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>

      {/* Top face */}
      <g clipPath="url(#lc-top)">
        <polygon points="250,10 410,105 250,200 90,105" fill="#fdfcf8"/>
        <polygon points="250,10 410,105 250,200 90,105" fill="url(#lh-top)"/>
        <g transform="matrix(0.8,0.475,-0.8,0.475,250,10)">
          <g className="ls1">
            <rect x="15" y="55" width="170" height="55" rx="2" fill="#9b2d30" opacity="0.9"/>
            <text x="55" y="72" textAnchor="middle" fontFamily="Georgia,serif" fontSize="10" fill="#fdfcf8" fontWeight="500">Memorize</text>
            <text x="100" y="72" textAnchor="middle" fontFamily="Georgia,serif" fontSize="10" fill="#fdfcf8" fontWeight="500">Watch</text>
            <text x="145" y="72" textAnchor="middle" fontFamily="Georgia,serif" fontSize="10" fill="#fdfcf8" fontWeight="500">Reflect</text>
            <line x1="77" y1="60" x2="77" y2="104" stroke="#fdfcf8" strokeWidth="0.3" opacity="0.35"/>
            <line x1="123" y1="60" x2="123" y2="104" stroke="#fdfcf8" strokeWidth="0.3" opacity="0.35"/>
            <rect x="88" y="96" width="24" height="24" rx="1" fill="#9b2d30" opacity="0.75"/>
            <text x="100" y="113" textAnchor="middle" fontFamily="Georgia,serif" fontSize="14" fontWeight="600" fill="#fdfcf8">習</text>
            <text x="100" y="42" textAnchor="middle" fontFamily="Georgia,serif" fontSize="13" fontWeight="300" fill="#1a1a1a">Commit the words</text>
            <text x="100" y="52" textAnchor="middle" fontFamily="Georgia,serif" fontSize="13" fontWeight="300" fill="#1a1a1a" fontStyle="italic">to memory</text>
          </g>
          <g className="ls2">
            <ellipse cx="50" cy="72" rx="28" ry="20" fill="#9b2d30" opacity="0.12"/>
            <text x="50" y="78" textAnchor="middle" fontFamily="Georgia,serif" fontSize="22" fill="#9b2d30">25</text>
            <text x="50" y="92" textAnchor="middle" fontFamily="sans-serif" fontSize="5" fill="#9a9a9a" letterSpacing="0.08em">SOLILOQUIES</text>
            <ellipse cx="100" cy="72" rx="24" ry="18" fill="#3d5c4a" opacity="0.15"/>
            <text x="100" y="78" textAnchor="middle" fontFamily="Georgia,serif" fontSize="22" fill="#3d5c4a">9</text>
            <text x="100" y="92" textAnchor="middle" fontFamily="sans-serif" fontSize="5" fill="#9a9a9a" letterSpacing="0.08em">PLAYS</text>
            <ellipse cx="150" cy="72" rx="24" ry="18" fill="#2a4a5e" opacity="0.15"/>
            <text x="150" y="78" textAnchor="middle" fontFamily="Georgia,serif" fontSize="22" fill="#2a4a5e">∞</text>
            <text x="150" y="92" textAnchor="middle" fontFamily="sans-serif" fontSize="5" fill="#9a9a9a" letterSpacing="0.08em">PERFORMANCES</text>
          </g>
          <g className="ls3">
            <circle cx="100" cy="52" r="20" fill="none" stroke="#9b2d30" strokeWidth="0.8" opacity="0.4"/>
            <text x="100" y="82" textAnchor="middle" fontFamily="Georgia,serif" fontSize="12" fontWeight="300" fill="#1a1a1a">A tool for the</text>
            <text x="100" y="94" textAnchor="middle" fontFamily="Georgia,serif" fontSize="12" fontWeight="300" fill="#1a1a1a" fontStyle="italic">aspiring player</text>
          </g>
        </g>
      </g>

      {/* Left face */}
      <g clipPath="url(#lc-left)">
        <polygon points="90,105 250,200 250,390 90,295" fill="#fdfcf8"/>
        <polygon points="90,105 250,200 250,390 90,295" fill="#1a1a1a" opacity="0.02"/>
        <polygon points="90,105 250,200 250,390 90,295" fill="url(#lh-left)"/>
        <polygon points="90,105 250,200 250,390 90,295" fill="url(#lh-left-x)"/>
        <g transform="matrix(0.8,0.475,0,0.95,90,105)">
          <g className="ls1">
            <text x="10" y="15" fontFamily="sans-serif" fontSize="6.5" fill="#9a9a9a" letterSpacing="0.08em">MEMORIZE</text>
            <text x="70" y="15" fontFamily="sans-serif" fontSize="6.5" fill="#9b2d30" letterSpacing="0.08em">LINES</text>
            <rect x="10" y="22" width="150" height="3" rx="1.5" fill="#e8e4dc"/>
            <rect x="10" y="22" width="95" height="3" rx="1.5" fill="#9b2d30" opacity="0.75"/>
            <text x="12" y="44" fontFamily="Georgia,serif" fontSize="10.5" fill="#1a1a1a" fontStyle="italic">"To be, or not to be,</text>
            <text x="15" y="56" fontFamily="Georgia,serif" fontSize="10.5" fill="#1a1a1a" fontStyle="italic">that is the question—"</text>
            <text x="12" y="78" fontFamily="Georgia,serif" fontSize="12" fill="#c4a35a" fontWeight="500" letterSpacing="0.25em">W ' t i n</text>
            <text x="12" y="92" fontFamily="Georgia,serif" fontSize="12" fill="#c4a35a" fontWeight="500" letterSpacing="0.25em">i t m o f</text>
            <g transform="translate(12,115)">
              <circle cx="0" cy="0" r="4.5" fill="#9b2d30" opacity="0.75"/>
              <circle cx="16" cy="0" r="4.5" fill="#9b2d30" opacity="0.5"/>
              <circle cx="32" cy="0" r="4.5" fill="#c4a35a" opacity="0.65"/>
              <circle cx="48" cy="0" r="4.5" fill="#2a4a5e" opacity="0.55"/>
              <circle cx="64" cy="0" r="4.5" fill="#3d5c4a" opacity="0.75"/>
            </g>
          </g>
          <g className="ls2">
            <text x="10" y="15" fontFamily="sans-serif" fontSize="6.5" fill="#9a9a9a" letterSpacing="0.08em">MEMORIZE</text>
            <text x="70" y="15" fontFamily="sans-serif" fontSize="6.5" fill="#9b2d30" letterSpacing="0.08em">TEST</text>
            <text x="12" y="38" fontFamily="Georgia,serif" fontSize="9" fill="#4a4a4a">Complete the line:</text>
            <text x="12" y="52" fontFamily="Georgia,serif" fontSize="10.5" fill="#1a1a1a" fontStyle="italic">"To sleep, perchance to ___"</text>
            <g transform="translate(12,62)">
              <rect x="0" y="0" width="130" height="18" rx="3" fill="#c4a35a" fillOpacity="0.08" stroke="#c4a35a" strokeWidth="0.7"/>
              <text x="10" y="13" fontFamily="sans-serif" fontSize="8" fill="#1a1a1a">A. dream</text>
              <rect x="0" y="24" width="130" height="18" rx="3" fill="none" stroke="#e8e4dc" strokeWidth="0.7"/>
              <text x="10" y="37" fontFamily="sans-serif" fontSize="8" fill="#4a4a4a">B. sleep</text>
              <rect x="0" y="48" width="130" height="18" rx="3" fill="none" stroke="#e8e4dc" strokeWidth="0.7"/>
              <text x="10" y="61" fontFamily="sans-serif" fontSize="8" fill="#4a4a4a">C. rest</text>
            </g>
          </g>
          <g className="ls3">
            <text x="10" y="15" fontFamily="sans-serif" fontSize="6.5" fill="#9a9a9a" letterSpacing="0.08em">MEMORIZE</text>
            <text x="70" y="15" fontFamily="sans-serif" fontSize="6.5" fill="#9b2d30" letterSpacing="0.08em">PALACE</text>
            <g transform="translate(10,25)">
              <rect x="0" y="0" width="65" height="40" rx="1.5" fill="none" stroke="#888" strokeWidth="0.7"/>
              <text x="5" y="10" fontFamily="sans-serif" fontSize="5.5" fill="#aaa">1</text>
              <text x="16" y="10" fontFamily="sans-serif" fontSize="4.5" fill="#999" letterSpacing="0.06em">FOYER</text>
              <line x1="3" y1="14" x2="62" y2="14" stroke="#ddd" strokeWidth="0.4"/>
              <text x="5" y="24" fontFamily="sans-serif" fontSize="5.5" fill="#555">A ghost at the</text>
              <text x="5" y="32" fontFamily="sans-serif" fontSize="5.5" fill="#555">castle entrance</text>
              <rect x="75" y="0" width="65" height="40" rx="1.5" fill="none" stroke="#888" strokeWidth="0.7"/>
              <text x="80" y="10" fontFamily="sans-serif" fontSize="5.5" fill="#aaa">2</text>
              <text x="91" y="10" fontFamily="sans-serif" fontSize="4.5" fill="#999" letterSpacing="0.06em">GREAT HALL</text>
              <line x1="78" y1="14" x2="137" y2="14" stroke="#ddd" strokeWidth="0.4"/>
              <text x="80" y="24" fontFamily="sans-serif" fontSize="5.5" fill="#555">Skull on the</text>
              <text x="80" y="32" fontFamily="sans-serif" fontSize="5.5" fill="#555">banquet table</text>
              <rect x="0" y="50" width="65" height="40" rx="1.5" fill="none" stroke="#888" strokeWidth="0.7"/>
              <text x="5" y="60" fontFamily="sans-serif" fontSize="5.5" fill="#aaa">3</text>
              <text x="16" y="60" fontFamily="sans-serif" fontSize="4.5" fill="#999" letterSpacing="0.06em">PARLOR</text>
              <line x1="3" y1="64" x2="62" y2="64" stroke="#ddd" strokeWidth="0.4"/>
              <text x="5" y="74" fontFamily="sans-serif" fontSize="5.5" fill="#555">Mirror showing</text>
              <text x="5" y="82" fontFamily="sans-serif" fontSize="5.5" fill="#555">two selves</text>
              <rect x="75" y="50" width="65" height="40" rx="1.5" fill="none" stroke="#888" strokeWidth="0.7"/>
              <text x="80" y="60" fontFamily="sans-serif" fontSize="5.5" fill="#aaa">4</text>
              <text x="91" y="60" fontFamily="sans-serif" fontSize="4.5" fill="#999" letterSpacing="0.06em">LIBRARY</text>
              <line x1="78" y1="64" x2="137" y2="64" stroke="#ddd" strokeWidth="0.4"/>
              <text x="80" y="74" fontFamily="sans-serif" fontSize="5.5" fill="#555">Books turning</text>
              <text x="80" y="82" fontFamily="sans-serif" fontSize="5.5" fill="#555">into daggers</text>
            </g>
          </g>
        </g>
      </g>

      {/* Right face */}
      <g clipPath="url(#lc-right)">
        <polygon points="250,200 410,105 410,295 250,390" fill="#fdfcf8"/>
        <polygon points="250,200 410,105 410,295 250,390" fill="url(#lh-right)"/>
        <g transform="matrix(0.8,-0.475,0,0.95,250,200)">
          <g className="ls1">
            <text x="10" y="15" fontFamily="sans-serif" fontSize="6.5" fill="#9a9a9a" letterSpacing="0.08em">REFLECT</text>
            <text x="12" y="35" fontFamily="Georgia,serif" fontSize="9" fill="#4a4a4a" fontStyle="italic">How are you feeling?</text>
            <g transform="translate(80,75)">
              <circle cx="0" cy="0" r="40" fill="none" stroke="#1a1a1a" strokeWidth="0.8" opacity="0.45"/>
              <line x1="0" y1="0" x2="0" y2="-40" stroke="#1a1a1a" strokeWidth="0.4" opacity="0.25"/>
              <line x1="0" y1="0" x2="38" y2="-12.4" stroke="#1a1a1a" strokeWidth="0.4" opacity="0.25"/>
              <line x1="0" y1="0" x2="23.5" y2="32.4" stroke="#1a1a1a" strokeWidth="0.4" opacity="0.25"/>
              <line x1="0" y1="0" x2="-23.5" y2="32.4" stroke="#1a1a1a" strokeWidth="0.4" opacity="0.25"/>
              <line x1="0" y1="0" x2="-38" y2="-12.4" stroke="#1a1a1a" strokeWidth="0.4" opacity="0.25"/>
              <text x="12" y="-22" fontFamily="sans-serif" fontSize="5" fill="#2a4a5e">Straight</text>
              <text x="24" y="6" fontFamily="sans-serif" fontSize="5" fill="#c4a35a">Laugh</text>
              <text x="8" y="28" fontFamily="sans-serif" fontSize="5" fill="#5a4a6a">Deep</text>
              <text x="-28" y="28" fontFamily="sans-serif" fontSize="5" fill="#9b2d30">Challenge</text>
              <text x="-38" y="6" fontFamily="sans-serif" fontSize="5" fill="#3d5c4a">Listen</text>
              <circle cx="0" cy="0" r="7" fill="#fdfcf8" stroke="#1a1a1a" strokeWidth="0.4" opacity="0.5"/>
              <circle cx="0" cy="0" r="1.5" fill="#1a1a1a" opacity="0.5"/>
              <polygon points="-3.5,-41 0,-48 3.5,-41" fill="#1a1a1a" opacity="0.65"/>
            </g>
          </g>
          <g className="ls2">
            <text x="10" y="15" fontFamily="sans-serif" fontSize="6.5" fill="#9a9a9a" letterSpacing="0.08em">REFLECT</text>
            <rect x="10" y="22" width="42" height="14" rx="7" fill="#5a4a6a" opacity="0.12"/>
            <text x="31" y="32" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#5a4a6a" fontWeight="500">Go deep</text>
            <text x="12" y="52" fontFamily="sans-serif" fontSize="7" fill="#9a9a9a" fontStyle="italic">"Feeling restless today..."</text>
            <line x1="10" y1="62" x2="10" y2="112" stroke="#c4a35a" strokeWidth="2" opacity="0.55"/>
            <text x="18" y="75" fontFamily="Georgia,serif" fontSize="9.5" fill="#1a1a1a" fontStyle="italic">"Our doubts are traitors,</text>
            <text x="18" y="87" fontFamily="Georgia,serif" fontSize="9.5" fill="#1a1a1a" fontStyle="italic">and make us lose the good</text>
            <text x="18" y="99" fontFamily="Georgia,serif" fontSize="9.5" fill="#1a1a1a" fontStyle="italic">we oft might win..."</text>
            <text x="18" y="114" fontFamily="sans-serif" fontSize="6.5" fill="#9a9a9a">— Lucio, Measure for Measure</text>
          </g>
          <g className="ls3">
            <text x="10" y="15" fontFamily="sans-serif" fontSize="6.5" fill="#9a9a9a" letterSpacing="0.08em">WATCH</text>
            <text x="12" y="36" fontFamily="Georgia,serif" fontSize="10.5" fill="#1a1a1a" fontStyle="italic">"To be, or not to be"</text>
            <text x="12" y="48" fontFamily="sans-serif" fontSize="7" fill="#9a9a9a">Hamlet</text>
            <g transform="translate(10,56)">
              <rect x="0" y="0" width="140" height="32" rx="4" fill="#5a4a6a" fillOpacity="0.05" stroke="#5a4a6a" strokeWidth="0.5" strokeOpacity="0.15"/>
              <circle cx="16" cy="16" r="11" fill="#5a4a6a" opacity="0.08"/>
              <polygon points="13,10 13,22 22,16" fill="#5a4a6a" opacity="0.45"/>
              <text x="34" y="13" fontFamily="sans-serif" fontSize="7.5" fill="#1a1a1a" fontWeight="500">Branagh (1996)</text>
              <text x="34" y="24" fontFamily="sans-serif" fontSize="6" fill="#4a4a4a">Kenneth Branagh · 4:15</text>
            </g>
            <g transform="translate(10,94)">
              <rect x="0" y="0" width="140" height="32" rx="4" fill="#c4a35a" fillOpacity="0.05" stroke="#c4a35a" strokeWidth="0.5" strokeOpacity="0.18"/>
              <circle cx="16" cy="16" r="11" fill="#c4a35a" opacity="0.08"/>
              <polygon points="13,10 13,22 22,16" fill="#c4a35a" opacity="0.45"/>
              <text x="34" y="13" fontFamily="sans-serif" fontSize="7.5" fill="#1a1a1a" fontWeight="500">Olivier (1948)</text>
              <text x="34" y="24" fontFamily="sans-serif" fontSize="6" fill="#4a4a4a">Laurence Olivier · 3:52</text>
            </g>
          </g>
        </g>
      </g>

      {/* Pencil edges — heavy pass */}
      <g filter="url(#lp)">
        <line x1="250" y1="10" x2="410" y2="105" stroke="#000" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="250" y1="10" x2="90" y2="105" stroke="#000" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="90" y1="105" x2="90" y2="295" stroke="#000" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="410" y1="105" x2="410" y2="295" stroke="#000" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="90" y1="295" x2="250" y2="390" stroke="#000" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="410" y1="295" x2="250" y2="390" stroke="#000" strokeWidth="2.2" strokeLinecap="round"/>
      </g>
      {/* Pencil edges — retracing pass */}
      <g filter="url(#lp2)">
        <line x1="250" y1="10" x2="410" y2="105" stroke="#000" strokeWidth="1.1" strokeLinecap="round"/>
        <line x1="250" y1="10" x2="90" y2="105" stroke="#000" strokeWidth="1.1" strokeLinecap="round"/>
        <line x1="90" y1="105" x2="90" y2="295" stroke="#000" strokeWidth="1.1" strokeLinecap="round"/>
        <line x1="410" y1="105" x2="410" y2="295" stroke="#000" strokeWidth="1.1" strokeLinecap="round"/>
        <line x1="90" y1="295" x2="250" y2="390" stroke="#000" strokeWidth="1.1" strokeLinecap="round"/>
        <line x1="410" y1="295" x2="250" y2="390" stroke="#000" strokeWidth="1.1" strokeLinecap="round"/>
      </g>
      {/* Inner edges */}
      <g filter="url(#lp)">
        <line x1="250" y1="200" x2="250" y2="390" stroke="#000" strokeWidth="1.4" opacity="0.6" strokeLinecap="round"/>
        <line x1="90" y1="105" x2="250" y2="200" stroke="#000" strokeWidth="1.4" opacity="0.6" strokeLinecap="round"/>
        <line x1="250" y1="200" x2="410" y2="105" stroke="#000" strokeWidth="1.4" opacity="0.6" strokeLinecap="round"/>
      </g>
    </svg>
  )
}

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
    <div className="min-h-screen bg-paper flex items-center justify-center p-6 relative overflow-hidden">

      {/* Two-column layout: login left, cube right */}
      <div className="flex items-center justify-center gap-20 w-full max-w-6xl">

        {/* Left column — login form */}
        <div className="flex flex-col items-center flex-shrink-0 w-full max-w-sm">
          {/* Decorative quill-stroke line */}
          <div className="w-40 h-px bg-gradient-to-r from-transparent via-ink/15 to-transparent mb-8" />

          {/* Title & tagline */}
          <div className="text-center mb-6">
            <h1 className="font-cormorant text-7xl font-light text-ink tracking-wide mb-4">
              Soliloquy
            </h1>
            <p className="font-cormorant italic text-ink-light text-xl" style={{ fontWeight: 300 }}>
              to thine own self be true
            </p>
          </div>

          {/* Contextual prompt */}
          <p
            className="font-cormorant text-ink-faint text-xs tracking-widest uppercase mb-8"
            style={{ letterSpacing: '0.2em' }}
          >
            {mode === 'choice' && 'take the stage'}
            {mode === 'enter' && 'speak, friend'}
          </p>

          {/* Choice buttons */}
          {mode === 'choice' && (
            <div className="space-y-3 w-full">
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
            <form onSubmit={handleLogin} className="w-full">
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

          {/* Decorative quill-stroke line */}
          <div className="w-40 h-px bg-gradient-to-r from-transparent via-ink/15 to-transparent mt-8" />
        </div>

        {/* Right column — animated cube (hidden on mobile) */}
        <div className="hidden md:flex items-center justify-center flex-shrink-0" style={{ isolation: 'isolate', willChange: 'transform' }}>
          <DemoCube />
        </div>
      </div>

      {/* Bottom flourish */}
      <p className="absolute bottom-8 font-cormorant italic text-ink-faint/40 text-xs tracking-wide select-none">
        all the world's a stage
      </p>
    </div>
  )
}
