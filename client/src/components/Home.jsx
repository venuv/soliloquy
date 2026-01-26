import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, api } from '../App'
import { LogOut, BarChart2, KeyRound } from 'lucide-react'
import './Home.css'

export default function Home() {
  const { userKey, logout } = useAuth()
  const [authors, setAuthors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/authors')
      .then(setAuthors)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const totalWorks = authors.reduce((sum, a) => sum + (a.worksCount || 0), 0)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fdfcf8',
      fontFamily: "'IBM Plex Sans', sans-serif",
      fontWeight: 300,
      fontSize: '15px',
      color: '#1a1a1a',
      lineHeight: 1.6
    }}>
      {/* SVG Filters for ink wash effects */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          {/* Grainy ink texture */}
          <filter id="ink-texture" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G"/>
          </filter>

          {/* Soft ink bleed for stat glows */}
          <filter id="ink-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G"/>
            <feGaussianBlur stdDeviation="1"/>
          </filter>

          {/* Brush stroke roughness */}
          <filter id="brush" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>
      </svg>

      {/* Header */}
      <header style={{
        padding: '1.5rem 2.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline'
      }}>
        <span style={{
          fontFamily: "'Cormorant', serif",
          fontWeight: 300,
          fontSize: '1.25rem',
          color: '#1a1a1a'
        }}>
          Soliloquy Master
        </span>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <span style={{
            fontSize: '0.8rem',
            color: '#9a9a9a',
            letterSpacing: '0.03em',
            cursor: 'not-allowed'
          }} title="Coming soon">
            Live Performances
          </span>
          <span style={{
            fontSize: '0.8rem',
            color: '#9a9a9a',
            letterSpacing: '0.03em',
            cursor: 'not-allowed'
          }} title="Coming soon">
            Daily News
          </span>
          <Link to="/stats" style={{
            fontSize: '0.8rem',
            color: '#4a4a4a',
            textDecoration: 'none',
            letterSpacing: '0.03em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <BarChart2 size={14} />
            Stats
          </Link>
          <span style={{
            fontSize: '0.8rem',
            color: '#9a9a9a',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <KeyRound size={12} />
            {userKey}
          </span>
          <button
            onClick={logout}
            style={{
              background: 'none',
              border: 'none',
              color: '#4a4a4a',
              cursor: 'pointer',
              padding: 0
            }}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.4fr',
        minHeight: '75vh',
        padding: '2rem 2.5rem',
        gap: '2rem'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingRight: '2rem'
        }}>
          <h1 style={{
            fontFamily: "'Cormorant', serif",
            fontWeight: 300,
            fontSize: '2.7rem',
            lineHeight: 1.18,
            color: '#1a1a1a',
            marginBottom: '1.5rem'
          }}>
            Commit the words<br/>
            to <em>memory</em>
          </h1>
          <p style={{
            fontSize: '0.95rem',
            color: '#4a4a4a',
            lineHeight: 1.75,
            maxWidth: '340px',
            marginBottom: '2rem'
          }}>
            A quiet place to study Shakespeare's greatest speeches.
            Line by line, the text fades as you learn—until only
            your voice remains.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', alignSelf: 'flex-start' }}>
            {/* Chop mark / seal with rough edges */}
            <svg width="34" height="34" viewBox="0 0 34 34" style={{ flexShrink: 0 }}>
              {/* Rough-edged seal shape */}
              <path
                d="M3 2 L31 1 Q33 1 32 3 L33 30 Q33 33 30 32 L3 33 Q1 33 2 30 L1 4 Q1 1 3 2 Z"
                fill="#9b2d30"
                style={{ filter: 'url(#seal-texture)' }}
              />
              {/* Seal character */}
              <text
                x="17"
                y="23"
                textAnchor="middle"
                style={{
                  fontFamily: "'Cormorant', serif",
                  fontSize: '18px',
                  fontWeight: 600,
                  fill: '#fdfcf8'
                }}
              >習</text>
              {/* Subtle worn texture overlay */}
              <rect x="2" y="2" width="30" height="30" fill="url(#seal-wear)" opacity="0.15" />
              <defs>
                <filter id="seal-texture" x="-10%" y="-10%" width="120%" height="120%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="noise"/>
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G"/>
                </filter>
                <pattern id="seal-wear" patternUnits="userSpaceOnUse" width="34" height="34">
                  <circle cx="8" cy="12" r="2" fill="#fdfcf8"/>
                  <circle cx="26" cy="8" r="1.5" fill="#fdfcf8"/>
                  <circle cx="22" cy="28" r="1" fill="#fdfcf8"/>
                  <circle cx="6" cy="25" r="1.5" fill="#fdfcf8"/>
                </pattern>
              </defs>
            </svg>
            <span style={{
              fontFamily: "'Cormorant', serif",
              fontSize: '1.2rem',
              fontStyle: 'italic',
              color: '#1a1a1a'
            }}>Begin practicing</span>
          </div>
        </div>

        {/* Collage */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="collage-item">
              <div className="collage-piece" style={{ width: '200px', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 200 260" fill="none" style={{ width: '100%', height: '100%' }}>
                  <path d="M100 40 Q105 58 100 75" stroke="#2a4a5e" strokeWidth="1.5" fill="none" opacity="0.8"/>
                  <ellipse cx="100" cy="30" rx="17" ry="23" stroke="#2a4a5e" strokeWidth="1.5" fill="none" opacity="0.7"/>
                  <path d="M83 75 Q68 105 66 145 Q64 185 72 225" stroke="#2a4a5e" strokeWidth="1.5" fill="none" opacity="0.7"/>
                  <path d="M117 75 Q132 105 134 145 Q136 185 128 225" stroke="#2a4a5e" strokeWidth="1.5" fill="none" opacity="0.7"/>
                  <path d="M83 90 Q58 102 50 128" stroke="#2a4a5e" strokeWidth="1.5" fill="none" opacity="0.6"/>
                  <ellipse cx="47" cy="148" rx="15" ry="19" stroke="#2a4a5e" strokeWidth="1.5" fill="none" opacity="0.6"/>
                  <circle cx="40" cy="143" r="3" stroke="#2a4a5e" strokeWidth="1" fill="none" opacity="0.5"/>
                  <circle cx="54" cy="143" r="3" stroke="#2a4a5e" strokeWidth="1" fill="none" opacity="0.5"/>
                </svg>
              </div>
              <p className="piece-label">Hamlet</p>
            </div>
            <div className="collage-item">
              <div className="collage-piece" style={{ width: '155px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 155 200" fill="none" style={{ width: '100%', height: '100%' }}>
                  <ellipse cx="77" cy="35" rx="15" ry="20" stroke="#3d5c4a" strokeWidth="1.5" fill="none" opacity="0.75"/>
                  <path d="M77 55 Q77 78 77 98" stroke="#3d5c4a" strokeWidth="1.5" fill="none" opacity="0.65"/>
                  <path d="M62 70 Q42 54 34 38" stroke="#3d5c4a" strokeWidth="1.5" fill="none" opacity="0.6"/>
                  <path d="M92 70 Q112 54 120 38" stroke="#3d5c4a" strokeWidth="1.5" fill="none" opacity="0.6"/>
                  <path d="M62 98 Q50 138 42 180" stroke="#3d5c4a" strokeWidth="1.5" fill="none" opacity="0.55"/>
                  <path d="M92 98 Q104 138 112 180" stroke="#3d5c4a" strokeWidth="1.5" fill="none" opacity="0.55"/>
                </svg>
              </div>
              <p className="piece-label">Lady Macbeth</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginRight: '3.5rem' }}>
            <div className="collage-item">
              <div className="collage-piece" style={{ width: '170px', height: '115px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 170 115" fill="none" style={{ width: '100%', height: '100%' }}>
                  <path d="M20 92 L20 52 L85 28 L150 52 L150 92" stroke="#c4a35a" strokeWidth="1.5" fill="none" opacity="0.7"/>
                  <ellipse cx="85" cy="28" rx="65" ry="16" stroke="#c4a35a" strokeWidth="1" fill="none" opacity="0.5"/>
                  <path d="M85 12 L85 28" stroke="#c4a35a" strokeWidth="1" opacity="0.6"/>
                  <path d="M85 12 L102 17 L85 22" stroke="#c4a35a" strokeWidth="1" fill="none" opacity="0.5"/>
                  <rect x="60" y="55" width="50" height="30" stroke="#c4a35a" strokeWidth="1" fill="none" opacity="0.45"/>
                </svg>
              </div>
              <p className="piece-label">The Globe</p>
            </div>
            <div className="collage-item">
              <div className="collage-piece" style={{ width: '130px', height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 130 170" fill="none" style={{ width: '100%', height: '100%' }}>
                  <ellipse cx="65" cy="32" rx="14" ry="18" stroke="#9b2d30" strokeWidth="1.5" fill="none" opacity="0.7"/>
                  <path d="M65 50 Q65 72 65 92" stroke="#9b2d30" strokeWidth="1.5" fill="none" opacity="0.65"/>
                  <path d="M52 65 Q40 60 34 70 Q30 82 38 94" stroke="#9b2d30" strokeWidth="1.5" fill="none" opacity="0.55"/>
                  <path d="M78 65 Q90 60 96 70 Q100 82 92 94" stroke="#9b2d30" strokeWidth="1.5" fill="none" opacity="0.55"/>
                  <path d="M52 92 Q45 128 43 158" stroke="#9b2d30" strokeWidth="1.5" fill="none" opacity="0.5"/>
                  <path d="M78 92 Q85 128 87 158" stroke="#9b2d30" strokeWidth="1.5" fill="none" opacity="0.5"/>
                  <path d="M50 16 L54 6 L60 14 L65 4 L70 14 L76 6 L80 16" stroke="#c4a35a" strokeWidth="1.5" fill="none" opacity="0.65"/>
                </svg>
              </div>
              <p className="piece-label">Richard III</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ink Band */}
      <section className="ink-band" style={{
        position: 'relative',
        margin: '3rem 0',
        padding: '3rem 2.5rem',
        overflow: 'hidden'
      }}>
        {/* Crimson background with texture */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(155,45,48,0.95) 0%, rgba(155,45,48,0.82) 15%, rgba(155,45,48,0.78) 50%, rgba(155,45,48,0.85) 85%, rgba(155,45,48,0.92) 100%)',
          filter: 'url(#ink-texture)'
        }} />
        {/* Feathered top edge */}
        <div style={{
          position: 'absolute',
          top: '-12px',
          left: 0,
          right: 0,
          height: '20px',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 20' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20 Q5 8 10 15 Q15 5 20 12 Q25 3 30 14 Q35 6 40 13 Q45 2 50 11 Q55 5 60 14 Q65 3 70 12 Q75 7 80 15 Q85 4 90 13 Q95 8 100 16 L100 20 Z' fill='%239b2d30' opacity='0.7'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 20px',
          opacity: 0.85
        }} />

        <div style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '900px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '3rem'
        }}>
          {/* Memorize - Active Link */}
          <Link
            to={authors.length > 0 ? `/author/${authors[0]?.id}` : '#'}
            className="band-item"
          >
            <h3 className="band-title">Memorize</h3>
            <p className="band-desc">
              {totalWorks || 25} soliloquies broken into learnable fragments. Words fade as you prove mastery.
            </p>
          </Link>

          {/* Watch - Active Link */}
          <Link to="/inspired" className="band-item">
            <h3 className="band-title">Watch</h3>
            <p className="band-desc">
              Study performances by McKellen, Dench, Branagh—actors who've lived inside these speeches.
            </p>
          </Link>

          {/* Reflect - Active Link */}
          <Link to="/fortune" className="band-item">
            <h3 className="band-title">Reflect</h3>
            <p className="band-desc">
              A daily fragment from the Bard. Brief enough for morning, resonant enough to carry.
            </p>
          </Link>
        </div>
      </section>

      {/* Gold Stroke */}
      <div style={{ margin: '0 2.5rem', height: '8px', overflow: 'visible' }}>
        <svg viewBox="0 0 800 40" preserveAspectRatio="none" style={{ width: '100%', height: '40px', marginTop: '-16px' }}>
          <path
            d="M0 20 Q50 15 100 22 Q200 28 300 18 Q400 12 500 24 Q600 30 700 19 Q750 16 800 21"
            stroke="#c4a35a"
            strokeWidth="4"
            fill="none"
            opacity="0.5"
            strokeLinecap="round"
            style={{ filter: 'url(#brush)' }}
          />
          <path
            d="M50 22 Q150 26 250 20 Q350 14 450 25 Q550 32 650 21 Q720 17 780 23"
            stroke="#c4a35a"
            strokeWidth="2"
            fill="none"
            opacity="0.3"
            strokeLinecap="round"
            style={{ filter: 'url(#brush)' }}
          />
        </svg>
      </div>

      {/* Quote */}
      <section style={{ padding: '3rem 2.5rem', maxWidth: '650px', margin: '0 auto' }}>
        <blockquote style={{
          fontFamily: "'Cormorant', serif",
          fontWeight: 300,
          fontStyle: 'italic',
          fontSize: '1.4rem',
          lineHeight: 1.5,
          color: '#1a1a1a',
          textAlign: 'center'
        }}>
          "Speak the speech, I pray you, as I pronounced it to you,
          trippingly on the tongue."
        </blockquote>
        <p style={{
          fontSize: '0.8rem',
          color: '#4a4a4a',
          marginTop: '1rem',
          textAlign: 'center'
        }}>
          — Hamlet to the Players
        </p>
      </section>

      {/* Stats with ink wash halos */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '5rem',
        padding: '2rem 2.5rem 3rem'
      }}>
        {/* Stat 1 - Crimson with stronger halo */}
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -55%)',
            width: '100px',
            height: '75px',
            background: 'radial-gradient(ellipse at 45% 50%, rgba(155, 45, 48, 0.28) 0%, rgba(155, 45, 48, 0.15) 35%, rgba(155, 45, 48, 0.05) 60%, transparent 80%)',
            borderRadius: '50%',
            zIndex: 0,
            filter: 'blur(2px)'
          }} />
          <div style={{
            fontFamily: "'Cormorant', serif",
            fontSize: '2.5rem',
            color: '#9b2d30',
            position: 'relative',
            zIndex: 1
          }}>{totalWorks || 25}</div>
          <div style={{
            fontSize: '0.65rem',
            color: '#9a9a9a',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginTop: '0.25rem'
          }}>Soliloquies</div>
        </div>

        {/* Stat 2 - Forest with stronger halo */}
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -55%)',
            width: '90px',
            height: '70px',
            background: 'radial-gradient(ellipse at 55% 50%, rgba(61, 92, 74, 0.32) 0%, rgba(61, 92, 74, 0.18) 35%, rgba(61, 92, 74, 0.06) 60%, transparent 80%)',
            borderRadius: '50%',
            zIndex: 0,
            filter: 'blur(2px)'
          }} />
          <div style={{
            fontFamily: "'Cormorant', serif",
            fontSize: '2.5rem',
            color: '#3d5c4a',
            position: 'relative',
            zIndex: 1
          }}>7</div>
          <div style={{
            fontSize: '0.65rem',
            color: '#9a9a9a',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginTop: '0.25rem'
          }}>Plays</div>
        </div>

        {/* Stat 3 - Deep Blue with stronger halo */}
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -55%)',
            width: '95px',
            height: '72px',
            background: 'radial-gradient(ellipse at 50% 50%, rgba(42, 74, 94, 0.30) 0%, rgba(42, 74, 94, 0.16) 35%, rgba(42, 74, 94, 0.05) 60%, transparent 80%)',
            borderRadius: '50%',
            zIndex: 0,
            filter: 'blur(2px)'
          }} />
          <div style={{
            fontFamily: "'Cormorant', serif",
            fontSize: '2.5rem',
            color: '#2a4a5e',
            position: 'relative',
            zIndex: 1
          }}>∞</div>
          <div style={{
            fontSize: '0.65rem',
            color: '#9a9a9a',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginTop: '0.25rem'
          }}>Performances</div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        padding: '1.5rem 2.5rem',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: '#9a9a9a'
      }}>
        <span>Soliloquy Master</span>
        <span>A tool for the aspiring player</span>
      </footer>
    </div>
  )
}
