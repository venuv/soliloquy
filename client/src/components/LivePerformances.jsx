import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Home,
  MapPin,
  Calendar,
  ExternalLink,
  Star,
  ChevronDown,
  Filter,
  Globe2,
  Theater
} from 'lucide-react'
import {
  PERFORMANCES,
  VENUES,
  getUpcomingPerformances,
  getVenueInfo,
  formatDateRange,
  getPlayCategory
} from '../data/livePerformances'

// Region display names and colors
const REGIONS = {
  'all': { name: 'All Regions', color: '#1a1a1a' },
  'europe': { name: 'United Kingdom', color: '#9b2d30' },
  'north-america': { name: 'North America', color: '#2a4a5e' },
  'oceania': { name: 'Australia', color: '#3d5c4a' }
};

// Play category colors matching sumi-e palette
const CATEGORY_COLORS = {
  tragedy: '#9b2d30',    // Crimson
  comedy: '#3d5c4a',     // Forest green
  history: '#2a4a5e',    // Deep blue
  romance: '#7a5c3d',    // Warm brown
  problem: '#5a4a6a',    // Muted purple
  other: '#4a4a4a'       // Neutral
};

function PerformanceCard({ performance }) {
  const venue = getVenueInfo(performance.venue);
  const category = getPlayCategory(performance.play);
  const categoryColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;

  const isUpcoming = new Date(performance.startDate) > new Date();
  const isRunning = new Date(performance.startDate) <= new Date() &&
                    new Date(performance.endDate) >= new Date();

  return (
    <div
      className="performance-card"
      style={{
        background: '#fdfcf8',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: '4px',
        padding: '1.5rem',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Category accent line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: categoryColor,
        opacity: 0.7
      }} />

      {/* Highlight badge */}
      {performance.highlight && (
        <div style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          background: 'rgba(196, 163, 90, 0.15)',
          color: '#8a7340',
          padding: '0.25rem 0.5rem',
          borderRadius: '3px',
          fontSize: '0.7rem',
          fontWeight: 500,
          letterSpacing: '0.03em'
        }}>
          <Star size={10} fill="#c4a35a" stroke="#c4a35a" />
          Featured
        </div>
      )}

      {/* Special badge */}
      {performance.special && (
        <div style={{
          position: 'absolute',
          top: performance.highlight ? '2.25rem' : '0.75rem',
          right: '0.75rem',
          background: 'rgba(61, 92, 74, 0.12)',
          color: '#3d5c4a',
          padding: '0.25rem 0.5rem',
          borderRadius: '3px',
          fontSize: '0.65rem',
          fontWeight: 500,
          letterSpacing: '0.02em'
        }}>
          {performance.special}
        </div>
      )}

      {/* Play title */}
      <h3 style={{
        fontFamily: "'Cormorant', serif",
        fontSize: '1.35rem',
        fontWeight: 400,
        color: '#1a1a1a',
        marginBottom: '0.5rem',
        paddingRight: performance.highlight || performance.special ? '5rem' : 0
      }}>
        {performance.play}
      </h3>

      {/* Venue */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem'
      }}>
        <Theater size={14} style={{ color: '#9a9a9a' }} />
        <span style={{
          fontSize: '0.85rem',
          color: '#4a4a4a',
          fontWeight: 400
        }}>
          {venue?.name}
        </span>
      </div>

      {/* Location */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.5rem'
      }}>
        <MapPin size={14} style={{ color: '#9a9a9a' }} />
        <span style={{
          fontSize: '0.8rem',
          color: '#6a6a6a'
        }}>
          {venue?.city}, {venue?.country}
        </span>
      </div>

      {/* Dates */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1rem'
      }}>
        <Calendar size={14} style={{ color: '#9a9a9a' }} />
        <span style={{
          fontSize: '0.8rem',
          color: '#6a6a6a'
        }}>
          {formatDateRange(performance.startDate, performance.endDate)}
        </span>
        {isRunning && (
          <span style={{
            background: 'rgba(61, 92, 74, 0.15)',
            color: '#3d5c4a',
            padding: '0.15rem 0.4rem',
            borderRadius: '3px',
            fontSize: '0.65rem',
            fontWeight: 500,
            marginLeft: '0.25rem'
          }}>
            Now Playing
          </span>
        )}
      </div>

      {/* Director & Cast */}
      {(performance.director || performance.cast) && (
        <div style={{
          fontSize: '0.8rem',
          color: '#6a6a6a',
          marginBottom: '0.75rem',
          lineHeight: 1.5
        }}>
          {performance.director && (
            <div>
              <span style={{ color: '#9a9a9a' }}>Director: </span>
              {performance.director}
            </div>
          )}
          {performance.cast && performance.cast.length > 0 && (
            <div>
              <span style={{ color: '#9a9a9a' }}>Featuring: </span>
              {performance.cast.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {performance.description && (
        <p style={{
          fontSize: '0.85rem',
          color: '#5a5a5a',
          lineHeight: 1.6,
          marginBottom: '1rem'
        }}>
          {performance.description}
        </p>
      )}

      {/* Ticket link */}
      {performance.ticketUrl && (
        <a
          href={performance.ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.8rem',
            color: categoryColor,
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'opacity 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.7'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          Get Tickets <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}

function VenueSection({ venueId, performances }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const venue = getVenueInfo(venueId);
  const regionColor = REGIONS[venue?.region]?.color || '#1a1a1a';

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Venue header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.75rem 0',
          borderBottom: '1px solid rgba(0,0,0,0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: regionColor,
            opacity: 0.7
          }} />
          <h2 style={{
            fontFamily: "'Cormorant', serif",
            fontSize: '1.3rem',
            fontWeight: 400,
            color: '#1a1a1a',
            margin: 0
          }}>
            {venue?.name}
          </h2>
          <span style={{
            fontSize: '0.75rem',
            color: '#9a9a9a',
            fontWeight: 300
          }}>
            {venue?.city}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            fontSize: '0.75rem',
            color: '#9a9a9a',
            background: 'rgba(0,0,0,0.04)',
            padding: '0.25rem 0.5rem',
            borderRadius: '3px'
          }}>
            {performances.length} {performances.length === 1 ? 'production' : 'productions'}
          </span>
          <ChevronDown
            size={18}
            style={{
              color: '#9a9a9a',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s ease'
            }}
          />
        </div>
      </button>

      {/* Performances grid */}
      {isExpanded && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1rem',
          marginTop: '1rem'
        }}>
          {performances.map(performance => (
            <PerformanceCard key={performance.id} performance={performance} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LivePerformances() {
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedPlay, setSelectedPlay] = useState('all');
  const [viewMode, setViewMode] = useState('venue'); // 'venue' or 'timeline'

  // Get unique plays for filter
  const plays = useMemo(() => {
    const uniquePlays = [...new Set(PERFORMANCES.map(p => p.play))].sort();
    return uniquePlays;
  }, []);

  // Filter performances
  const filteredPerformances = useMemo(() => {
    let result = getUpcomingPerformances();

    if (selectedRegion !== 'all') {
      result = result.filter(p => VENUES[p.venue]?.region === selectedRegion);
    }

    if (selectedPlay !== 'all') {
      result = result.filter(p => p.play === selectedPlay);
    }

    return result;
  }, [selectedRegion, selectedPlay]);

  // Group by venue
  const performancesByVenue = useMemo(() => {
    const grouped = {};
    filteredPerformances.forEach(p => {
      if (!grouped[p.venue]) {
        grouped[p.venue] = [];
      }
      grouped[p.venue].push(p);
    });
    return grouped;
  }, [filteredPerformances]);

  // Sort venues by region then name
  const sortedVenues = useMemo(() => {
    return Object.keys(performancesByVenue).sort((a, b) => {
      const venueA = VENUES[a];
      const venueB = VENUES[b];
      if (venueA?.region !== venueB?.region) {
        return (venueA?.region || '').localeCompare(venueB?.region || '');
      }
      return (venueA?.name || '').localeCompare(venueB?.name || '');
    });
  }, [performancesByVenue]);

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
      {/* Header */}
      <header style={{
        padding: '1.5rem 2.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        borderBottom: '1px solid rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link
            to="/"
            style={{
              color: '#4a4a4a',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Home"
          >
            <Home size={20} />
          </Link>
          <span style={{
            fontFamily: "'Cormorant', serif",
            fontWeight: 300,
            fontSize: '1.25rem',
            color: '#1a1a1a'
          }}>
            Live Performances
          </span>
        </div>
        <span style={{
          fontSize: '0.75rem',
          color: '#9a9a9a',
          letterSpacing: '0.02em'
        }}>
          2025-2026 Season
        </span>
      </header>

      {/* Hero section */}
      <section style={{
        padding: '3rem 2.5rem 2rem',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        <h1 style={{
          fontFamily: "'Cormorant', serif",
          fontWeight: 300,
          fontSize: '2.2rem',
          lineHeight: 1.2,
          color: '#1a1a1a',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          Shakespeare on Stage
        </h1>
        <p style={{
          fontSize: '0.95rem',
          color: '#5a5a5a',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto 2rem',
          lineHeight: 1.7
        }}>
          The world's finest theaters bring Shakespeare to life. From London's Globe to
          Central Park, from Stratford-upon-Avon to Stratford, Ontario — discover
          productions that will deepen your understanding of the words you're memorizing.
        </p>

        {/* Stats */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '4rem',
          marginBottom: '2rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: "'Cormorant', serif",
              fontSize: '2rem',
              color: '#9b2d30'
            }}>
              {filteredPerformances.length}
            </div>
            <div style={{
              fontSize: '0.65rem',
              color: '#9a9a9a',
              letterSpacing: '0.06em',
              textTransform: 'uppercase'
            }}>
              Productions
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: "'Cormorant', serif",
              fontSize: '2rem',
              color: '#3d5c4a'
            }}>
              {Object.keys(performancesByVenue).length}
            </div>
            <div style={{
              fontSize: '0.65rem',
              color: '#9a9a9a',
              letterSpacing: '0.06em',
              textTransform: 'uppercase'
            }}>
              Venues
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: "'Cormorant', serif",
              fontSize: '2rem',
              color: '#2a4a5e'
            }}>
              {[...new Set(filteredPerformances.map(p => p.play))].length}
            </div>
            <div style={{
              fontSize: '0.65rem',
              color: '#9a9a9a',
              letterSpacing: '0.06em',
              textTransform: 'uppercase'
            }}>
              Plays
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section style={{
        padding: '0 2.5rem 1.5rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#9a9a9a',
            fontSize: '0.8rem'
          }}>
            <Filter size={14} />
            Filter:
          </div>

          {/* Region filter */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {Object.entries(REGIONS).map(([key, { name, color }]) => (
              <button
                key={key}
                onClick={() => setSelectedRegion(key)}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '3px',
                  border: '1px solid',
                  borderColor: selectedRegion === key ? color : 'rgba(0,0,0,0.1)',
                  background: selectedRegion === key ? `${color}10` : 'transparent',
                  color: selectedRegion === key ? color : '#6a6a6a',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {key !== 'all' && <Globe2 size={12} />}
                {name}
              </button>
            ))}
          </div>

          {/* Play filter dropdown */}
          <select
            value={selectedPlay}
            onChange={(e) => setSelectedPlay(e.target.value)}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '3px',
              border: '1px solid rgba(0,0,0,0.1)',
              background: 'transparent',
              color: '#4a4a4a',
              fontSize: '0.75rem',
              cursor: 'pointer',
              minWidth: '180px'
            }}
          >
            <option value="all">All Plays</option>
            {plays.map(play => (
              <option key={play} value={play}>{play}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Main content */}
      <main style={{
        padding: '1rem 2.5rem 4rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {filteredPerformances.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: '#9a9a9a'
          }}>
            <Theater size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No performances match your filters.</p>
          </div>
        ) : (
          sortedVenues.map(venueId => (
            <VenueSection
              key={venueId}
              venueId={venueId}
              performances={performancesByVenue[venueId]}
            />
          ))
        )}
      </main>

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
        <span>Performance data updated January 2026</span>
      </footer>
    </div>
  );
}
