import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Palette, Image, Layers } from 'lucide-react'
import ShakespeareArtwork, {
  HamletArtwork,
  LadyMacbethArtwork,
  GlobeTheatreArtwork,
  RichardIIIArtwork,
  ArtisticFilters
} from './ShakespeareArtwork'

/**
 * ArtworkGallery - Showcase page for the artistic Shakespeare images
 * Demonstrates the various artistic treatments and effects
 */
export default function ArtworkGallery() {
  const [selectedEffect, setSelectedEffect] = useState('default')

  const effects = [
    { id: 'default', label: 'Vintage Paper', filter: 'none' },
    { id: 'sepia', label: 'Sepia Tone', filter: 'sepia(40%) contrast(1.1)' },
    { id: 'dramatic', label: 'Dramatic', filter: 'contrast(1.2) brightness(0.95) saturate(1.1)' },
    { id: 'faded', label: 'Aged & Faded', filter: 'sepia(20%) brightness(1.05) contrast(0.9)' },
    { id: 'monochrome', label: 'Monochrome', filter: 'grayscale(100%) contrast(1.1)' },
  ]

  const currentFilter = effects.find(e => e.id === selectedEffect)?.filter || 'none'

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
      <ArtisticFilters />

      {/* Header */}
      <header style={{
        padding: '1.5rem 2.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(0,0,0,0.06)'
      }}>
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#4a4a4a',
          textDecoration: 'none',
          fontSize: '0.9rem'
        }}>
          <ArrowLeft size={18} />
          Back to Home
        </Link>

        <h1 style={{
          fontFamily: "'Cormorant', serif",
          fontWeight: 300,
          fontSize: '1.5rem',
          color: '#1a1a1a',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Palette size={20} style={{ color: '#9b2d30' }} />
          Shakespeare Artwork Gallery
        </h1>

        <div style={{ width: '120px' }} /> {/* Spacer for centering */}
      </header>

      {/* Introduction */}
      <section style={{
        padding: '2rem 2.5rem',
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <p style={{
          fontSize: '1rem',
          color: '#4a4a4a',
          lineHeight: 1.8,
          marginBottom: '1rem'
        }}>
          Artistic interpretations replacing the original line drawings on the home page.
          These pieces draw inspiration from classic Shakespeare artwork in the public domain,
          enhanced with vintage paper textures, worn edges, and artistic effects.
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginTop: '1.5rem'
        }}>
          {effects.map(effect => (
            <button
              key={effect.id}
              onClick={() => setSelectedEffect(effect.id)}
              style={{
                padding: '0.5rem 1rem',
                background: selectedEffect === effect.id ? '#9b2d30' : 'transparent',
                color: selectedEffect === effect.id ? '#fdfcf8' : '#4a4a4a',
                border: `1px solid ${selectedEffect === effect.id ? '#9b2d30' : 'rgba(0,0,0,0.15)'}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: '0.85rem',
                transition: 'all 0.2s ease'
              }}
            >
              {effect.label}
            </button>
          ))}
        </div>
      </section>

      {/* Main Collage */}
      <section style={{
        padding: '2rem 2.5rem',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div style={{
          filter: currentFilter,
          transition: 'filter 0.3s ease'
        }}>
          <ShakespeareArtwork variant="collage" />
        </div>
      </section>

      {/* Individual Pieces */}
      <section style={{
        padding: '3rem 2.5rem',
        background: 'linear-gradient(180deg, transparent 0%, rgba(155, 45, 48, 0.03) 100%)'
      }}>
        <h2 style={{
          fontFamily: "'Cormorant', serif",
          fontWeight: 300,
          fontSize: '1.3rem',
          textAlign: 'center',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <Layers size={18} style={{ color: '#c4a35a' }} />
          Individual Pieces
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '3rem',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          {/* Hamlet */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-block',
              padding: '1rem',
              background: '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              filter: currentFilter,
              transition: 'filter 0.3s ease'
            }}>
              <HamletArtwork width={200} height={260} />
            </div>
            <h3 style={{
              fontFamily: "'Cormorant', serif",
              fontSize: '1.1rem',
              marginTop: '1rem',
              color: '#2a4a5e'
            }}>Hamlet</h3>
            <p style={{
              fontSize: '0.8rem',
              color: '#7a7a7a',
              marginTop: '0.5rem',
              fontStyle: 'italic'
            }}>
              After Fuseli's "Hamlet and his Father's Ghost" (c. 1780-85)
            </p>
          </div>

          {/* Lady Macbeth */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-block',
              padding: '1rem',
              background: '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              filter: currentFilter,
              transition: 'filter 0.3s ease'
            }}>
              <LadyMacbethArtwork width={155} height={200} />
            </div>
            <h3 style={{
              fontFamily: "'Cormorant', serif",
              fontSize: '1.1rem',
              marginTop: '1rem',
              color: '#3d5c4a'
            }}>Lady Macbeth</h3>
            <p style={{
              fontSize: '0.8rem',
              color: '#7a7a7a',
              marginTop: '0.5rem',
              fontStyle: 'italic'
            }}>
              Inspired by Sargent's "Ellen Terry as Lady Macbeth" (1889)
            </p>
          </div>

          {/* The Globe */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-block',
              padding: '1rem',
              background: '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              filter: currentFilter,
              transition: 'filter 0.3s ease'
            }}>
              <GlobeTheatreArtwork width={170} height={115} />
            </div>
            <h3 style={{
              fontFamily: "'Cormorant', serif",
              fontSize: '1.1rem',
              marginTop: '1rem',
              color: '#c4a35a'
            }}>The Globe Theatre</h3>
            <p style={{
              fontSize: '0.8rem',
              color: '#7a7a7a',
              marginTop: '0.5rem',
              fontStyle: 'italic'
            }}>
              Historical engraving style, Southwark c. 1599
            </p>
          </div>

          {/* Richard III */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-block',
              padding: '1rem',
              background: '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              filter: currentFilter,
              transition: 'filter 0.3s ease'
            }}>
              <RichardIIIArtwork width={130} height={170} />
            </div>
            <h3 style={{
              fontFamily: "'Cormorant', serif",
              fontSize: '1.1rem',
              marginTop: '1rem',
              color: '#9b2d30'
            }}>Richard III</h3>
            <p style={{
              fontSize: '0.8rem',
              color: '#7a7a7a',
              marginTop: '0.5rem',
              fontStyle: 'italic'
            }}>
              After Hogarth's "David Garrick as Richard III" (1745)
            </p>
          </div>
        </div>
      </section>

      {/* Technical Notes */}
      <section style={{
        padding: '2rem 2.5rem',
        maxWidth: '700px',
        margin: '0 auto'
      }}>
        <h2 style={{
          fontFamily: "'Cormorant', serif",
          fontWeight: 300,
          fontSize: '1.2rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Image size={16} style={{ color: '#4a4a4a' }} />
          About These Images
        </h2>

        <div style={{
          fontSize: '0.85rem',
          color: '#5a5a5a',
          lineHeight: 1.8,
          background: 'rgba(0,0,0,0.02)',
          padding: '1.5rem',
          borderRadius: '4px',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          <p style={{ marginBottom: '1rem' }}>
            <strong>Artistic Treatments Applied:</strong>
          </p>
          <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
            <li>Vintage paper textures using SVG noise filters</li>
            <li>Worn edge effects with radial gradient overlays</li>
            <li>Sepia and warm color adjustments</li>
            <li>Engraving-style line work for the Globe Theatre</li>
            <li>Dramatic lighting inspired by Fuseli and Hogarth</li>
          </ul>
          <p>
            <strong>Sources:</strong> The Hamlet piece uses a public domain image from
            Wikimedia Commons (Fuseli, c. 1780-85). Other pieces are original SVG artwork
            created in the style of their inspirational works.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '1.5rem 2.5rem',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        justifyContent: 'center',
        fontSize: '0.75rem',
        color: '#9a9a9a'
      }}>
        All source artwork in the public domain
      </footer>
    </div>
  )
}
