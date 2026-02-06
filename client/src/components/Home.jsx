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
  const totalPlays = authors.reduce((sum, a) => sum + (a.playsCount || 0), 0)

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
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div
            className="globe-theatre-icon"
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
              border: '1.5px solid rgba(0,0,0,0.1)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.8)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'
              e.currentTarget.style.zIndex = '100'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'
              e.currentTarget.style.zIndex = 'auto'
            }}
          >
            <img
              src="/images/shakespeare/globe-theatre.jpg"
              alt="The Globe Theatre"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center 25%',
                filter: 'saturate(0.9) contrast(1.05)'
              }}
            />
          </div>
          <span style={{
            fontFamily: "'Cormorant', serif",
            fontWeight: 300,
            fontSize: '1.25rem',
            color: '#1a1a1a'
          }}>
            Soliloquy Master
          </span>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link to="/live" style={{
            fontSize: '0.8rem',
            color: '#4a4a4a',
            textDecoration: 'none',
            letterSpacing: '0.03em'
          }}>
            Live Performances
          </Link>
          <Link to="/news" style={{
            fontSize: '0.8rem',
            color: '#4a4a4a',
            textDecoration: 'none',
            letterSpacing: '0.03em'
          }}>
            Daily News
          </Link>
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
            {/* Stacked calligraphic burgundy chevrons - pointing down */}
            <svg
              width="32"
              height="48"
              viewBox="0 0 32 48"
              style={{
                marginLeft: '0.75rem',
                animation: 'scroll-hint 2s ease-in-out infinite',
                opacity: 0.85
              }}
            >
              <defs>
                {/* Washed burgundy gradient with distressed feel */}
                <linearGradient id="burgundy-wash" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b3a3d"/>
                  <stop offset="30%" stopColor="#7a2f32"/>
                  <stop offset="70%" stopColor="#6d2628"/>
                  <stop offset="100%" stopColor="#5a2022"/>
                </linearGradient>
                {/* Ink bleed filter for calligraphic effect */}
                <filter id="ink-bleed" x="-10%" y="-10%" width="120%" height="120%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" result="noise"/>
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" xChannelSelector="R" yChannelSelector="G"/>
                </filter>
              </defs>

              {/* First chevron (top) - lightest, most faded */}
              <g opacity="0.45" style={{ filter: 'url(#ink-bleed)' }}>
                <path
                  d="M4,2 Q8,2 16,14 Q24,2 28,2"
                  stroke="url(#burgundy-wash)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Distress marks */}
                <circle cx="7" cy="4" r="0.5" fill="#5a2022" opacity="0.3"/>
                <circle cx="25" cy="4" r="0.4" fill="#5a2022" opacity="0.25"/>
              </g>

              {/* Second chevron (middle) */}
              <g transform="translate(0, 14)" opacity="0.6" style={{ filter: 'url(#ink-bleed)' }}>
                <path
                  d="M4,2 Q8,2 16,14 Q24,2 28,2"
                  stroke="url(#burgundy-wash)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Distress - ink splatter effect */}
                <circle cx="9" cy="5" r="0.6" fill="#6d2628" opacity="0.35"/>
                <ellipse cx="23" cy="6" rx="0.8" ry="0.5" fill="#5a2022" opacity="0.3"/>
              </g>

              {/* Third chevron (bottom, most prominent) */}
              <g transform="translate(0, 28)" opacity="0.8" style={{ filter: 'url(#ink-bleed)' }}>
                <path
                  d="M4,2 Q8,2 16,16 Q24,2 28,2"
                  stroke="url(#burgundy-wash)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Distress marks - aged ink spots */}
                <circle cx="6" cy="4" r="0.7" fill="#5a2022" opacity="0.4"/>
                <circle cx="26" cy="4" r="0.6" fill="#5a2022" opacity="0.35"/>
                <ellipse cx="16" cy="12" rx="0.5" ry="0.8" fill="#6d2628" opacity="0.25"/>
              </g>
            </svg>
          </div>
        </div>

        {/* Playful Photo Collage */}
        <div style={{
          position: 'relative',
          width: '480px',
          height: '420px'
        }}>
          {/* Olivier & Leigh - top left, slight tilt */}
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            transform: 'rotate(-4deg)',
            zIndex: 3
          }}>
            <img
              src="/images/shakespeare/olivier leigh.jpg"
              alt="Laurence Olivier and Vivien Leigh"
              style={{
                width: '180px',
                height: '220px',
                objectFit: 'cover',
                clipPath: 'polygon(0% 5%, 8% 0%, 20% 6%, 35% 1%, 50% 4%, 65% 0%, 80% 5%, 92% 1%, 100% 6%, 100% 94%, 92% 100%, 78% 95%, 62% 100%, 48% 96%, 32% 100%, 18% 95%, 5% 100%, 0% 95%)',
                boxShadow: '3px 4px 12px rgba(0,0,0,0.15)',
                filter: 'contrast(1.1) saturate(0.9) sepia(0.15)'
              }}
            />
          </div>

          {/* Japanese Shakespeare - top right, tilt other way */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '0',
            transform: 'rotate(3deg)',
            zIndex: 2
          }}>
            <img
              src="/images/shakespeare/japshake.jpg"
              alt="Japanese Shakespeare"
              style={{
                width: '200px',
                height: '180px',
                objectFit: 'cover',
                clipPath: 'polygon(3% 0%, 15% 4%, 30% 0%, 48% 5%, 65% 0%, 82% 3%, 97% 0%, 100% 8%, 98% 25%, 100% 45%, 97% 65%, 100% 85%, 98% 100%, 82% 97%, 65% 100%, 45% 96%, 25% 100%, 8% 97%, 0% 100%, 2% 80%, 0% 55%, 3% 30%, 0% 10%)',
                boxShadow: '2px 3px 10px rgba(0,0,0,0.12)',
                filter: 'contrast(1.15) saturate(1.2)'
              }}
            />
          </div>

          {/* Falstaff - center left, overlapping */}
          <div style={{
            position: 'absolute',
            top: '160px',
            left: '40px',
            transform: 'rotate(2deg)',
            zIndex: 4
          }}>
            <img
              src="/images/shakespeare/falstaff.jpg"
              alt="Falstaff"
              style={{
                width: '160px',
                height: '200px',
                objectFit: 'cover',
                clipPath: 'polygon(0% 3%, 12% 0%, 28% 5%, 45% 0%, 62% 4%, 78% 0%, 95% 3%, 100% 0%, 100% 97%, 88% 100%, 70% 95%, 52% 100%, 35% 96%, 18% 100%, 3% 96%, 0% 100%)',
                boxShadow: '4px 5px 14px rgba(0,0,0,0.18)',
                filter: 'contrast(1.2) saturate(0.85) brightness(1.05)'
              }}
            />
          </div>

          {/* Coriolanus - center right */}
          <div style={{
            position: 'absolute',
            top: '180px',
            right: '20px',
            transform: 'rotate(-2.5deg)',
            zIndex: 5
          }}>
            <img
              src="/images/shakespeare/coriolanus.jpg"
              alt="Coriolanus"
              style={{
                width: '190px',
                height: '160px',
                objectFit: 'cover',
                clipPath: 'polygon(2% 6%, 18% 0%, 38% 5%, 58% 0%, 78% 4%, 95% 0%, 100% 5%, 97% 20%, 100% 40%, 97% 60%, 100% 80%, 97% 95%, 100% 100%, 80% 96%, 58% 100%, 38% 95%, 18% 100%, 0% 96%, 0% 75%, 3% 50%, 0% 25%)',
                boxShadow: '3px 4px 12px rgba(0,0,0,0.14)',
                filter: 'contrast(1.1) saturate(1.1)'
              }}
            />
          </div>

          {/* Pericles - bottom, anchoring */}
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '120px',
            transform: 'rotate(1.5deg)',
            zIndex: 1
          }}>
            <img
              src="/images/shakespeare/pericles.jpg"
              alt="Pericles"
              style={{
                width: '220px',
                height: '140px',
                objectFit: 'cover',
                clipPath: 'polygon(0% 8%, 10% 0%, 25% 6%, 42% 0%, 60% 5%, 78% 0%, 92% 4%, 100% 0%, 100% 92%, 90% 100%, 72% 94%, 55% 100%, 38% 95%, 20% 100%, 6% 95%, 0% 100%)',
                boxShadow: '2px 3px 10px rgba(0,0,0,0.12)',
                filter: 'contrast(1.05) saturate(0.95) sepia(0.1)'
              }}
            />
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
          fontSize: '1.3rem',
          lineHeight: 1.5,
          color: '#1a1a1a',
          textAlign: 'center',
          whiteSpace: 'nowrap'
        }}>
          "Speak the speech, I pray you, as I pronounced it to you, trippingly on the tongue."
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
        <div className="stat-card">
          <div
            className="stat-halo"
            style={{
              width: '100px',
              height: '75px',
              background: 'radial-gradient(ellipse at 45% 50%, rgba(155, 45, 48, 0.28) 0%, rgba(155, 45, 48, 0.15) 35%, rgba(155, 45, 48, 0.05) 60%, transparent 80%)'
            }}
          />
          <div className="stat-value" style={{ color: '#9b2d30' }}>
            {totalWorks || 25}
          </div>
          <div className="stat-label">Soliloquies</div>
        </div>

        {/* Stat 2 - Forest with stronger halo */}
        <div className="stat-card">
          <div
            className="stat-halo"
            style={{
              width: '90px',
              height: '70px',
              background: 'radial-gradient(ellipse at 55% 50%, rgba(61, 92, 74, 0.32) 0%, rgba(61, 92, 74, 0.18) 35%, rgba(61, 92, 74, 0.06) 60%, transparent 80%)'
            }}
          />
          <div className="stat-value" style={{ color: '#3d5c4a' }}>
            {totalPlays || 9}
          </div>
          <div className="stat-label">Plays</div>
        </div>

        {/* Stat 3 - Deep Blue with stronger halo */}
        <div className="stat-card">
          <div
            className="stat-halo"
            style={{
              width: '95px',
              height: '72px',
              background: 'radial-gradient(ellipse at 50% 50%, rgba(42, 74, 94, 0.30) 0%, rgba(42, 74, 94, 0.16) 35%, rgba(42, 74, 94, 0.05) 60%, transparent 80%)'
            }}
          />
          <div className="stat-value" style={{ color: '#2a4a5e' }}>∞</div>
          <div className="stat-label">Performances</div>
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
