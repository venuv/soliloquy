import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../App'
import { Home, Clock, Target, BookOpen, Trophy, Calendar } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'

export default function Stats() {
  const isMobile = useIsMobile()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/analytics/summary')
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fdfcf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#9b2d30', fontFamily: "'Cormorant', serif", fontSize: '1.25rem' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fdfcf8',
      fontFamily: "'IBM Plex Sans', sans-serif",
      padding: isMobile ? '1rem' : '1.5rem'
    }}>
      <div style={{ maxWidth: '40rem', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.75rem', color: '#1a1a1a', fontWeight: 400 }}>
            Your Stats
          </h1>
          <Link to="/" style={{ color: '#4a4a4a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <Home size={18} />
            <span>Home</span>
          </Link>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'rgba(155, 45, 48, 0.06)', border: '1px solid rgba(155, 45, 48, 0.15)', borderRadius: '8px', padding: isMobile ? '1rem' : '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <BookOpen size={22} style={{ color: '#9b2d30' }} />
              <span style={{ color: '#4a4a4a', fontSize: '0.85rem' }}>Total Sessions</span>
            </div>
            <div style={{ fontSize: '2rem', fontFamily: "'Cormorant', serif", color: '#1a1a1a' }}>{summary?.totalSessions || 0}</div>
          </div>

          <div style={{ background: 'rgba(42, 74, 94, 0.06)', border: '1px solid rgba(42, 74, 94, 0.15)', borderRadius: '8px', padding: isMobile ? '1rem' : '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Clock size={22} style={{ color: '#2a4a5e' }} />
              <span style={{ color: '#4a4a4a', fontSize: '0.85rem' }}>Time Practiced</span>
            </div>
            <div style={{ fontSize: '2rem', fontFamily: "'Cormorant', serif", color: '#1a1a1a' }}>{summary?.totalTimeMinutes || 0} min</div>
          </div>

          <div style={{ background: 'rgba(61, 92, 74, 0.06)', border: '1px solid rgba(61, 92, 74, 0.15)', borderRadius: '8px', padding: isMobile ? '1rem' : '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Target size={22} style={{ color: '#3d5c4a' }} />
              <span style={{ color: '#4a4a4a', fontSize: '0.85rem' }}>Tests Taken</span>
            </div>
            <div style={{ fontSize: '2rem', fontFamily: "'Cormorant', serif", color: '#1a1a1a' }}>{summary?.testSessions || 0}</div>
          </div>

          <div style={{ background: 'rgba(196, 163, 90, 0.08)', border: '1px solid rgba(196, 163, 90, 0.2)', borderRadius: '8px', padding: isMobile ? '1rem' : '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Trophy size={22} style={{ color: '#c4a35a' }} />
              <span style={{ color: '#4a4a4a', fontSize: '0.85rem' }}>Avg Test Score</span>
            </div>
            <div style={{ fontSize: '2rem', fontFamily: "'Cormorant', serif", color: '#1a1a1a' }}>
              {summary?.avgScore !== null ? `${summary.avgScore}%` : '—'}
            </div>
          </div>
        </div>

        {/* Progress Summary */}
        <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.2rem', color: '#1a1a1a', marginBottom: '1rem', fontWeight: 400 }}>Progress</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4a4a4a', fontSize: '0.9rem' }}>
            <span>Works Started</span>
            <span style={{ color: '#1a1a1a', fontWeight: 500 }}>{summary?.worksStarted || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4a4a4a', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            <span>Works with Mastered Chunks</span>
            <span style={{ color: '#1a1a1a', fontWeight: 500 }}>{summary?.worksMastered || 0}</span>
          </div>
        </div>

        {/* Member Info */}
        <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: isMobile ? '1rem' : '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar size={18} style={{ color: '#9a9a9a' }} />
            <span style={{ color: '#4a4a4a', fontSize: '0.9rem' }}>
              Member since {summary?.memberSince
                ? new Date(summary.memberSince).toLocaleDateString()
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
