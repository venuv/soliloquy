import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Home, Calendar, Theater, Star, ExternalLink, ChevronRight, Clock, MapPin } from 'lucide-react'
import { api } from '../App'

function OnThisDayCard({ events, upcoming, message }) {
  const today = new Date()
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December']
  const dateString = `${monthNames[today.getMonth()]} ${today.getDate()}`

  const displayEvents = events?.length > 0 ? events : upcoming

  const getCategoryColor = (category) => {
    switch (category) {
      case 'shakespeare': return 'bg-amber-500/20 text-amber-400'
      case 'theater': return 'bg-purple-500/20 text-purple-400'
      case 'performance': return 'bg-green-500/20 text-green-400'
      case 'modern': return 'bg-blue-500/20 text-blue-400'
      case 'historical': return 'bg-gray-500/20 text-gray-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <div style={{ background: 'rgba(196,163,90,0.04)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(196,163,90,0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(196,163,90,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Calendar size={20} style={{ color: '#c4a35a' }} />
        </div>
        <div>
          <h3 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.15rem', color: '#1a1a1a', fontWeight: 500, margin: 0 }}>On This Day</h3>
          <p style={{ fontSize: '0.85rem', color: '#4a4a4a', margin: 0 }}>{dateString}</p>
        </div>
      </div>

      {message && (
        <p style={{ color: '#9a9a9a', fontSize: '0.85rem', marginBottom: '0.75rem', fontStyle: 'italic' }}>{message}</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {displayEvents?.map((event, idx) => (
          <div key={idx} style={{ borderLeft: '2px solid rgba(196,163,90,0.4)', paddingLeft: '1rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
              <p style={{ color: '#1a1a1a', fontSize: '0.9rem', margin: 0 }}>{event.event}</p>
              <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', whiteSpace: 'nowrap', background: 'rgba(196,163,90,0.15)', color: '#8a7340' }}>
                {event.year}
              </span>
            </div>
            {event.daysUntil !== undefined && (
              <p style={{ fontSize: '0.75rem', color: '#9a9a9a', marginTop: '0.25rem' }}>
                In {event.daysUntil} day{event.daysUntil !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function CurrentNewsCard({ news }) {
  if (!news || news.length === 0) return null

  return (
    <div style={{ background: 'rgba(61,92,74,0.04)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(61,92,74,0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(61,92,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Theater size={20} style={{ color: '#3d5c4a' }} />
        </div>
        <h3 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.15rem', color: '#1a1a1a', fontWeight: 500, margin: 0 }}>Theatre News</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {news.map((item) => (
          <div key={item.id}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', padding: '0.75rem', margin: '-0.75rem', borderRadius: '8px', textDecoration: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <h4 style={{ color: '#1a1a1a', fontWeight: 500, margin: 0 }}>
                    {item.title}
                  </h4>
                  <p style={{ color: '#4a4a4a', fontSize: '0.9rem', marginTop: '0.25rem' }}>{item.summary}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#9a9a9a' }}>
                    <span>{item.source}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={10} />
                      {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                <ExternalLink size={14} style={{ color: '#9a9a9a', flexShrink: 0, marginTop: '0.25rem' }} />
              </div>
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

function FeaturedPerformanceCard({ performance }) {
  if (!performance) return null

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(90,74,106,0.08) 0%, rgba(0,0,0,0.02) 100%)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(90,74,106,0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(90,74,106,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Star size={20} style={{ color: '#5a4a6a' }} />
        </div>
        <h3 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.15rem', color: '#1a1a1a', fontWeight: 500, margin: 0 }}>Legendary Performance</h3>
      </div>

      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <p style={{ fontFamily: "'Cormorant', serif", fontSize: '1.75rem', color: '#1a1a1a', marginBottom: '0.5rem' }}>{performance.actor}</p>
        <p style={{ color: '#5a4a6a', fontSize: '1.1rem' }}>as {performance.role}</p>
        <p style={{ color: '#4a4a4a', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          {performance.venue} ({performance.year})
        </p>
        {performance.note && (
          <p style={{ color: '#9a9a9a', fontSize: '0.85rem', marginTop: '0.75rem', fontStyle: 'italic' }}>
            "{performance.note}"
          </p>
        )}
      </div>

      <Link
        to="/inspired"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#5a4a6a', fontSize: '0.9rem', marginTop: '1rem', textDecoration: 'none' }}
      >
        Watch performances <ChevronRight size={14} />
      </Link>
    </div>
  )
}

function FestivalsCard({ festivals }) {
  if (!festivals) return null

  const { active, upcoming } = festivals

  return (
    <div style={{ background: 'rgba(42,74,94,0.04)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(42,74,94,0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(42,74,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Theater size={20} style={{ color: '#2a4a5e' }} />
        </div>
        <h3 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.15rem', color: '#1a1a1a', fontWeight: 500, margin: 0 }}>Shakespeare Festivals</h3>
      </div>

      {active?.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#3d5c4a', marginBottom: '0.5rem' }}>Currently in Season</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {active.slice(0, 3).map((festival, idx) => (
              <a
                key={idx}
                href={festival.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', padding: '0.75rem', background: 'rgba(61,92,74,0.08)', borderRadius: '8px', textDecoration: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: '#1a1a1a', fontWeight: 500, margin: 0 }}>{festival.name}</p>
                    <p style={{ color: '#4a4a4a', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                      <MapPin size={12} />
                      {festival.location}
                    </p>
                  </div>
                  <ExternalLink size={12} style={{ color: '#9a9a9a', marginTop: '0.25rem' }} />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {upcoming?.length > 0 && (
        <div>
          <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9a9a9a', marginBottom: '0.5rem' }}>Coming Soon</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {upcoming.slice(0, 2).map((festival, idx) => (
              <div key={idx} style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                <p style={{ color: '#1a1a1a', fontWeight: 500, margin: 0 }}>{festival.name}</p>
                <p style={{ color: '#9a9a9a', fontSize: '0.85rem', marginTop: '0.25rem' }}>{festival.season}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DailyNews() {
  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api('/news')
      .then(setNews)
      .catch(err => {
        console.error('Failed to load news:', err)
        setError('Failed to load daily news')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fdfcf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#9a9a9a' }}>Loading daily news...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#fdfcf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#9b2d30' }}>{error}</div>
      </div>
    )
  }

  const today = new Date()
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div style={{ minHeight: '100vh', background: '#fdfcf8', fontFamily: "'IBM Plex Sans', sans-serif", padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ maxWidth: '56rem', margin: '0 auto 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={{ color: '#4a4a4a', textDecoration: 'none' }} title="Home">
            <Home size={22} />
          </Link>
          <div>
            <h1 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.75rem', color: '#c4a35a', fontWeight: 400, margin: 0 }}>
              Daily News
            </h1>
            <p style={{ color: '#4a4a4a', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
              {dateString}
            </p>
          </div>
        </div>
      </div>

      {/* News Grid */}
      <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* On This Day */}
          <OnThisDayCard
            events={news?.onThisDay?.today}
            upcoming={news?.onThisDay?.upcoming}
            message={news?.onThisDay?.message}
          />

          {/* Featured Performance */}
          <FeaturedPerformanceCard performance={news?.featuredPerformance} />

          {/* Current News */}
          <CurrentNewsCard news={news?.currentNews} />

          {/* Festivals */}
          <FestivalsCard festivals={news?.festivals} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ maxWidth: '56rem', margin: '3rem auto 0', textAlign: 'center' }}>
        <p style={{ color: '#9a9a9a', fontSize: '0.85rem' }}>
          Shakespeare news and events from around the world
        </p>
      </div>
    </div>
  )
}
