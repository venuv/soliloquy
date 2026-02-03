import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api, useAuth } from '../App'

// SVG Illustrations for the collage
function HamletFigure() {
  return (
    <svg viewBox="0 0 200 260" fill="none" className="w-full h-full">
      <path d="M100 40 Q105 58 100 75" stroke="#2a4a5e" strokeWidth="1.5" fill="none" opacity="0.8"/>
      <ellipse cx="100" cy="30" rx="17" ry="23" stroke="#2a4a5e" strokeWidth="1.5" fill="none" opacity="0.7"/>
      <path d="M83 75 Q68 105 66 145 Q64 185 72 225" stroke="#2a4a5e" strokeWidth="1.5" fill="none" opacity="0.7"/>
      <path d="M117 75 Q132 105 134 145 Q136 185 128 225" stroke="#2a4a5e" strokeWidth="1.5" fill="none" opacity="0.7"/>
      <path d="M83 90 Q58 102 50 128" stroke="#2a4a5e" strokeWidth="1.5" fill="none" opacity="0.6"/>
      <ellipse cx="47" cy="148" rx="15" ry="19" stroke="#2a4a5e" strokeWidth="1.5" fill="none" opacity="0.6"/>
      <circle cx="40" cy="143" r="3" stroke="#2a4a5e" strokeWidth="1" fill="none" opacity="0.5"/>
      <circle cx="54" cy="143" r="3" stroke="#2a4a5e" strokeWidth="1" fill="none" opacity="0.5"/>
    </svg>
  )
}

function LadyMacbethFigure() {
  return (
    <svg viewBox="0 0 155 200" fill="none" className="w-full h-full">
      <ellipse cx="77" cy="35" rx="15" ry="20" stroke="#3d5c4a" strokeWidth="1.5" fill="none" opacity="0.75"/>
      <path d="M77 55 Q77 78 77 98" stroke="#3d5c4a" strokeWidth="1.5" fill="none" opacity="0.65"/>
      <path d="M62 70 Q42 54 34 38" stroke="#3d5c4a" strokeWidth="1.5" fill="none" opacity="0.6"/>
      <path d="M92 70 Q112 54 120 38" stroke="#3d5c4a" strokeWidth="1.5" fill="none" opacity="0.6"/>
      <path d="M62 98 Q50 138 42 180" stroke="#3d5c4a" strokeWidth="1.5" fill="none" opacity="0.55"/>
      <path d="M92 98 Q104 138 112 180" stroke="#3d5c4a" strokeWidth="1.5" fill="none" opacity="0.55"/>
    </svg>
  )
}

function GlobeFigure() {
  return (
    <svg viewBox="0 0 170 115" fill="none" className="w-full h-full">
      <path d="M20 92 L20 52 L85 28 L150 52 L150 92" stroke="#c4a35a" strokeWidth="1.5" fill="none" opacity="0.7"/>
      <ellipse cx="85" cy="28" rx="65" ry="16" stroke="#c4a35a" strokeWidth="1" fill="none" opacity="0.5"/>
      <path d="M85 12 L85 28" stroke="#c4a35a" strokeWidth="1" opacity="0.6"/>
      <path d="M85 12 L102 17 L85 22" stroke="#c4a35a" strokeWidth="1" fill="none" opacity="0.5"/>
      <rect x="60" y="55" width="50" height="30" stroke="#c4a35a" strokeWidth="1" fill="none" opacity="0.45"/>
    </svg>
  )
}

function RichardFigure() {
  return (
    <svg viewBox="0 0 130 170" fill="none" className="w-full h-full">
      <ellipse cx="65" cy="32" rx="14" ry="18" stroke="#9b2d30" strokeWidth="1.5" fill="none" opacity="0.7"/>
      <path d="M65 50 Q65 72 65 92" stroke="#9b2d30" strokeWidth="1.5" fill="none" opacity="0.65"/>
      <path d="M52 65 Q40 60 34 70 Q30 82 38 94" stroke="#9b2d30" strokeWidth="1.5" fill="none" opacity="0.55"/>
      <path d="M78 65 Q90 60 96 70 Q100 82 92 94" stroke="#9b2d30" strokeWidth="1.5" fill="none" opacity="0.55"/>
      <path d="M52 92 Q45 128 43 158" stroke="#9b2d30" strokeWidth="1.5" fill="none" opacity="0.5"/>
      <path d="M78 92 Q85 128 87 158" stroke="#9b2d30" strokeWidth="1.5" fill="none" opacity="0.5"/>
      <path d="M50 16 L54 6 L60 14 L65 4 L70 14 L76 6 L80 16" stroke="#c4a35a" strokeWidth="1.5" fill="none" opacity="0.65"/>
    </svg>
  )
}

function GoldStroke() {
  return (
    <div className="mx-10 h-2 overflow-visible">
      <svg viewBox="0 0 800 40" preserveAspectRatio="none" className="w-full h-10 -mt-4">
        <path
          d="M0 20 Q50 15 100 22 Q200 28 300 18 Q400 12 500 24 Q600 30 700 19 Q750 16 800 21"
          stroke="#c4a35a"
          strokeWidth="4"
          fill="none"
          opacity="0.5"
          strokeLinecap="round"
          filter="url(#brush)"
        />
        <path
          d="M50 22 Q150 26 250 20 Q350 14 450 25 Q550 32 650 21 Q720 17 780 23"
          stroke="#c4a35a"
          strokeWidth="2"
          fill="none"
          opacity="0.3"
          strokeLinecap="round"
          filter="url(#brush)"
        />
      </svg>
    </div>
  )
}

export default function Home() {
  const { logout } = useAuth()
  const [stats, setStats] = useState({ soliloquies: 0, plays: 0 })
  const [dailyQuote, setDailyQuote] = useState(null)

  useEffect(() => {
    // Fetch stats
    api('/authors')
      .then(data => {
        const totalWorks = data.reduce((sum, author) => sum + (author.works?.length || author.worksCount || 0), 0)
        setStats({ soliloquies: totalWorks, plays: data.length })
      })
      .catch(() => {})

    // Fetch daily quote from muse
    api('/muse/daily')
      .then(data => setDailyQuote(data))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      {/* Header */}
      <header className="flex justify-between items-baseline px-10 py-6">
        <Link to="/" className="sumi-heading text-xl" style={{ color: 'var(--ink)', textDecoration: 'none' }}>
          Soliloquy Master
        </Link>
        <nav className="flex gap-8">
          <Link to="/inspired" className="sumi-nav-link">Performances</Link>
          <Link to="/fortune" className="sumi-nav-link">Daily Muse</Link>
          <button onClick={logout} className="sumi-nav-link cursor-pointer bg-transparent border-none">
            Sign out
          </button>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] min-h-[75vh] px-10 py-8 gap-8">
          <div className="flex flex-col justify-center pr-8">
            <h1 className="sumi-heading text-4xl lg:text-5xl leading-tight mb-6" style={{ color: 'var(--ink)' }}>
              Commit the words<br />
              to <em>memory</em>
            </h1>
            <p className="text-base leading-relaxed max-w-sm mb-8" style={{ color: 'var(--ink-light)' }}>
              A quiet place to study Shakespeare's greatest speeches.
              Line by line, the text fades as you learn—until only
              your voice remains.
            </p>
            <Link to="/author/shakespeare" className="sumi-link self-start">
              Begin practicing
            </Link>
          </div>

          {/* Collage */}
          <div className="flex flex-col items-end gap-4">
            <div className="flex gap-4">
              <div>
                <div className="collage-piece w-48 h-64">
                  <HamletFigure />
                </div>
                <p className="piece-label">Hamlet</p>
              </div>
              <div>
                <div className="collage-piece w-40 h-52">
                  <LadyMacbethFigure />
                </div>
                <p className="piece-label">Lady Macbeth</p>
              </div>
            </div>
            <div className="flex gap-4 mr-14">
              <div>
                <div className="collage-piece w-44 h-28">
                  <GlobeFigure />
                </div>
                <p className="piece-label">The Globe</p>
              </div>
              <div>
                <div className="collage-piece w-32 h-44">
                  <RichardFigure />
                </div>
                <p className="piece-label">Richard III</p>
              </div>
            </div>
          </div>
        </section>

        {/* Ink Band */}
        <section className="ink-band">
          <div className="ink-band-content max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="band-item">
              <h3 className="band-title">Memorize</h3>
              <p className="band-desc">
                Soliloquies broken into learnable fragments.
                Words fade as you prove mastery.
              </p>
            </div>
            <div className="band-item">
              <Link to="/inspired" className="block hover:opacity-90">
                <h3 className="band-title">Watch</h3>
                <p className="band-desc">
                  Study performances by McKellen, Dench, Branagh—actors who've lived inside these speeches.
                </p>
              </Link>
            </div>
            <div className="band-item">
              <Link to="/fortune" className="block hover:opacity-90">
                <h3 className="band-title">Reflect</h3>
                <p className="band-desc">
                  A daily fragment from the Bard. Brief enough for morning, resonant enough to carry.
                </p>
              </Link>
            </div>
          </div>
        </section>

        {/* Gold Stroke */}
        <GoldStroke />

        {/* Quote Section */}
        <section className="py-12 px-10 max-w-2xl mx-auto">
          <blockquote className="sumi-quote">
            {dailyQuote ? (
              <>"{dailyQuote.quote}"</>
            ) : (
              <>"Speak the speech, I pray you, as I pronounced it to you, trippingly on the tongue."</>
            )}
          </blockquote>
          <p className="sumi-quote-attr">
            {dailyQuote ? `— ${dailyQuote.play}` : '— Hamlet to the Players'}
          </p>
        </section>

        {/* Stats */}
        <div className="flex justify-center gap-20 px-10 py-8 pb-12">
          <div className="text-center">
            <div className="stat-number crimson">{stats.soliloquies || 25}</div>
            <div className="stat-label">Soliloquies</div>
          </div>
          <div className="text-center">
            <div className="stat-number forest">{stats.plays || 7}</div>
            <div className="stat-label">Plays</div>
          </div>
          <div className="text-center">
            <div className="stat-number deep-blue">∞</div>
            <div className="stat-label">Performances</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex justify-between px-10 py-6 text-xs border-t" style={{ color: 'var(--ink-faint)', borderColor: 'rgba(0,0,0,0.06)' }}>
        <span>Soliloquy Master</span>
        <span>A tool for the aspiring player</span>
      </footer>
    </div>
  )
}
