import { useState } from 'react'

/**
 * ShakespeareArtwork - Artistic images replacing line drawings
 * Uses public domain artwork with CSS artistic effects
 *
 * Image sources (Public Domain):
 * - Hamlet: Henry Fuseli "Hamlet and his Father's Ghost" (c. 1780-85)
 * - Lady Macbeth: Artistic interpretation based on Sargent's composition
 * - The Globe: Historical engraving style
 * - Richard III: Based on Hogarth's Garrick composition
 */

// SVG Filters for artistic effects
const ArtisticFilters = () => (
  <svg style={{ position: 'absolute', width: 0, height: 0 }}>
    <defs>
      {/* Vintage paper texture */}
      <filter id="vintage-paper" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" seed="2"/>
        <feColorMatrix in="noise" type="saturate" values="0" result="monoNoise"/>
        <feBlend in="SourceGraphic" in2="monoNoise" mode="multiply" result="blended"/>
        <feComponentTransfer>
          <feFuncR type="linear" slope="0.9" intercept="0.05"/>
          <feFuncG type="linear" slope="0.88" intercept="0.06"/>
          <feFuncB type="linear" slope="0.85" intercept="0.08"/>
        </feComponentTransfer>
      </filter>

      {/* Faded edges - vignette effect */}
      <filter id="faded-edges" x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="blur"/>
        <feOffset in="blur" dx="0" dy="0" result="offsetBlur"/>
        <feMorphology in="SourceAlpha" operator="erode" radius="3" result="eroded"/>
        <feGaussianBlur in="eroded" stdDeviation="12" result="edgeBlur"/>
        <feComposite in="SourceGraphic" in2="edgeBlur" operator="in"/>
      </filter>

      {/* Oil painting effect */}
      <filter id="oil-paint" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="3" result="turbulence"/>
        <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="4" xChannelSelector="R" yChannelSelector="G"/>
        <feConvolveMatrix order="3" kernelMatrix="0 -1 0 -1 5 -1 0 -1 0"/>
      </filter>

      {/* Sepia tone */}
      <filter id="sepia-tone">
        <feColorMatrix type="matrix"
          values="0.393 0.769 0.189 0 0
                  0.349 0.686 0.168 0 0
                  0.272 0.534 0.131 0 0
                  0     0     0     1 0"/>
      </filter>

      {/* Glassblock distortion */}
      <filter id="glassblock" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G"/>
        <feGaussianBlur stdDeviation="0.5"/>
      </filter>

      {/* Engraving effect */}
      <filter id="engraving" x="0%" y="0%" width="100%" height="100%">
        <feColorMatrix type="saturate" values="0"/>
        <feConvolveMatrix order="3" kernelMatrix="1 0 -1 2 0 -2 1 0 -1" divisor="1"/>
        <feComponentTransfer>
          <feFuncR type="discrete" tableValues="0 0.15 0.3 0.45 0.6 0.75 0.9 1"/>
          <feFuncG type="discrete" tableValues="0 0.15 0.3 0.45 0.6 0.75 0.9 1"/>
          <feFuncB type="discrete" tableValues="0 0.15 0.3 0.45 0.6 0.75 0.9 1"/>
        </feComponentTransfer>
      </filter>

      {/* Worn frame effect */}
      <pattern id="worn-frame" patternUnits="userSpaceOnUse" width="20" height="20">
        <rect width="20" height="20" fill="#d4c4a8"/>
        <circle cx="3" cy="7" r="1.5" fill="#c4b090" opacity="0.6"/>
        <circle cx="15" cy="4" r="1" fill="#b4a080" opacity="0.5"/>
        <circle cx="8" cy="16" r="2" fill="#c4b090" opacity="0.4"/>
        <circle cx="18" cy="12" r="1.5" fill="#d4c4a8" opacity="0.3"/>
      </pattern>
    </defs>
  </svg>
)

// Torn paper edge SVG clip paths - more dramatic tears
const TornEdgeClipPath = ({ id, variant = 'default' }) => {
  const paths = {
    default: "M0,5 Q8,0 15,7 L18,3 Q25,9 32,4 L38,10 Q45,2 52,8 L58,4 Q65,11 72,5 L78,9 Q85,3 92,7 L100,4 L100,95 Q92,100 85,94 L78,98 Q72,92 65,97 L58,93 Q52,99 45,94 L38,97 Q32,91 25,96 L18,92 Q10,98 0,95 Z",
    rough: "M0,4 L6,10 L10,3 L18,12 L24,4 L32,14 L40,5 L48,13 L56,6 L64,15 L72,4 L80,12 L88,6 L94,13 L100,5 L100,96 L94,88 L88,96 L80,87 L72,95 L64,86 L56,94 L48,85 L40,93 L32,84 L24,92 L18,85 L10,94 L6,86 L0,95 Z",
    wavy: "M0,6 C8,0 16,12 24,4 C32,-2 40,10 48,3 C56,-3 64,9 72,2 C80,-2 88,8 96,4 L100,6 L100,94 C92,100 84,88 76,96 C68,102 60,90 52,97 C44,103 36,91 28,98 C20,104 12,92 4,98 L0,94 Z"
  }
  return (
    <clipPath id={id} clipPathUnits="objectBoundingBox">
      <path d={paths[variant]} transform="scale(0.01)" />
    </clipPath>
  )
}

// Artwork card with torn paper collage effect and varied styles
const ArtworkCard = ({ src, alt, width = 200, height = 260, rotation = 0, clipVariant = 'topTorn', filterStyle = 'dramatic' }) => {
  const [imageLoaded, setImageLoaded] = useState(false)

  // Different filter styles for variety
  const filterStyles = {
    dramatic: 'contrast(1.25) saturate(1.2) brightness(0.9)',
    saturated: 'contrast(1.1) saturate(1.4) brightness(0.95) hue-rotate(-5deg)',
    watercolor: 'contrast(0.95) saturate(0.8) brightness(1.05) blur(0.3px)',
    sketch: 'contrast(1.4) saturate(0.3) brightness(1.1)',
    blockprint: 'contrast(1.6) saturate(0) brightness(0.95)',
    vintage: 'contrast(1.1) saturate(0.7) sepia(0.3) brightness(0.95)'
  }

  // Varied torn edge masks - each unique
  const tornEdges = {
    // Top-heavy tear
    topTorn: 'polygon(0% 8%, 5% 2%, 12% 10%, 18% 0%, 26% 7%, 34% 1%, 42% 9%, 50% 3%, 58% 11%, 66% 2%, 74% 8%, 82% 0%, 90% 6%, 100% 3%, 100% 100%, 0% 100%)',
    // Bottom-heavy tear
    bottomTorn: 'polygon(0% 0%, 100% 0%, 100% 92%, 94% 100%, 86% 91%, 78% 98%, 70% 89%, 62% 97%, 54% 88%, 46% 96%, 38% 87%, 30% 95%, 22% 86%, 14% 94%, 6% 85%, 0% 93%)',
    // Right side torn
    rightTorn: 'polygon(0% 0%, 95% 0%, 100% 6%, 94% 14%, 100% 22%, 95% 30%, 100% 38%, 94% 46%, 100% 54%, 95% 62%, 100% 70%, 94% 78%, 100% 86%, 95% 94%, 100% 100%, 0% 100%)',
    // Irregular all sides
    irregular: 'polygon(3% 6%, 10% 0%, 20% 5%, 30% 1%, 42% 8%, 55% 2%, 68% 7%, 80% 0%, 92% 4%, 100% 8%, 97% 20%, 100% 35%, 96% 50%, 100% 65%, 97% 80%, 100% 92%, 94% 100%, 80% 96%, 65% 100%, 50% 95%, 35% 100%, 20% 97%, 8% 100%, 0% 94%, 4% 78%, 0% 62%, 5% 46%, 0% 30%, 4% 15%)',
    // Gentle wave
    gentleWave: 'polygon(0% 3%, 25% 0%, 50% 4%, 75% 0%, 100% 3%, 100% 97%, 75% 100%, 50% 96%, 25% 100%, 0% 97%)'
  }

  return (
    <div style={{
      width,
      height,
      position: 'relative',
      transform: `rotate(${rotation}deg)`,
      filter: 'drop-shadow(4px 6px 12px rgba(0,0,0,0.35))',
    }}>
      <div style={{
        width: '100%',
        height: '100%',
        clipPath: tornEdges[clipVariant] || tornEdges.default,
        background: '#f5f0e6',
        position: 'relative',
      }}>
        {/* Paper texture background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            linear-gradient(135deg, #faf6ee 0%, #f0e8d8 50%, #f5f0e6 100%)
          `,
          zIndex: 0,
        }}/>

        {/* Torn paper fiber/fray effect on edges */}
        <div style={{
          position: 'absolute',
          inset: 0,
          boxShadow: 'inset 0 0 15px rgba(200, 180, 150, 0.5)',
          zIndex: 1,
          pointerEvents: 'none',
        }}/>

        <img
          src={src}
          alt={alt}
          onLoad={() => setImageLoaded(true)}
          style={{
            position: 'absolute',
            top: '6%',
            left: '5%',
            width: '90%',
            height: '88%',
            objectFit: 'cover',
            filter: filterStyles[filterStyle] || filterStyles.dramatic,
            opacity: imageLoaded ? 1 : 0.3,
            transition: 'opacity 0.5s ease',
            zIndex: 2,
          }}
        />

        {/* Dramatic vignette */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, transparent 25%, rgba(15, 10, 5, 0.4) 100%)`,
          pointerEvents: 'none',
          zIndex: 3,
        }}/>

        {/* Aged paper creases and spots */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            linear-gradient(45deg, transparent 48%, rgba(139, 115, 85, 0.08) 50%, transparent 52%),
            linear-gradient(-45deg, transparent 48%, rgba(139, 115, 85, 0.06) 50%, transparent 52%),
            radial-gradient(circle at 10% 15%, rgba(120, 100, 70, 0.12) 0%, transparent 12%),
            radial-gradient(circle at 90% 80%, rgba(120, 100, 70, 0.1) 0%, transparent 15%)
          `,
          pointerEvents: 'none',
          zIndex: 4,
        }}/>
      </div>
    </div>
  )
}

// Hamlet artwork - dramatic, high contrast
const HamletArtwork = ({ width = 200, height = 260, rotation = -2 }) => (
  <ArtworkCard
    src="/images/shakespeare/hamlet-fuseli.jpg"
    alt="Hamlet and Ghost by Fuseli"
    width={width}
    height={height}
    rotation={rotation}
    clipVariant="topTorn"
    filterStyle="dramatic"
  />
)

// Lady Macbeth artwork - rich saturated color
const LadyMacbethArtwork = ({ width = 155, height = 200, rotation = 3 }) => (
  <ArtworkCard
    src="/images/shakespeare/lady-macbeth-sargent.jpg"
    alt="Ellen Terry as Lady Macbeth by Sargent"
    width={width}
    height={height}
    rotation={rotation}
    clipVariant="rightTorn"
    filterStyle="saturated"
  />
)

// Midsummer artwork - watercolor feel
const GlobeTheatreArtwork = ({ width = 170, height = 115, rotation = -1.5 }) => (
  <ArtworkCard
    src="/images/shakespeare/globe-theatre.jpg"
    alt="Titania and Bottom - Midsummer Night's Dream"
    width={width}
    height={height}
    rotation={rotation}
    clipVariant="gentleWave"
    filterStyle="watercolor"
  />
)

// Richard III artwork - sketch/etching feel
const RichardIIIArtwork = ({ width = 130, height = 170, rotation = 2.5 }) => (
  <ArtworkCard
    src="/images/shakespeare/richard-hogarth.jpg"
    alt="David Garrick as Richard III by Hogarth"
    width={width}
    height={height}
    rotation={rotation}
    clipVariant="bottomTorn"
    filterStyle="sketch"
  />
)

// Shakespeare portrait - monochrome block print style
const ShakespearePortrait = ({ width = 160, height = 200, rotation = 1 }) => (
  <ArtworkCard
    src="/images/shakespeare/shakespeare-portrait.jpg"
    alt="William Shakespeare"
    width={width}
    height={height}
    rotation={rotation}
    clipVariant="irregular"
    filterStyle="blockprint"
  />
)

// Main export - Collage of all artworks
export default function ShakespeareArtwork({ variant = 'collage' }) {
  if (variant === 'hamlet') return <HamletArtwork />
  if (variant === 'ladymacbeth') return <LadyMacbethArtwork />
  if (variant === 'globe') return <GlobeTheatreArtwork />
  if (variant === 'richardiii') return <RichardIIIArtwork />

  // Default: dramatic overlapping collage layout with Shakespeare
  return (
    <>
      <ArtisticFilters />
      <div style={{
        position: 'relative',
        width: '520px',
        height: '520px',
      }}>
        {/* Shakespeare portrait - center back, monochrome anchor */}
        <div style={{ position: 'absolute', top: '140px', left: '160px', zIndex: 1 }}>
          <ShakespearePortrait width={180} height={230} rotation={0.5} />
        </div>

        {/* Hamlet - top left, dramatic color burst */}
        <div style={{ position: 'absolute', top: '0', left: '0', zIndex: 3 }}>
          <HamletArtwork width={240} height={300} rotation={-4} />
          <p className="piece-label" style={{ marginTop: '6px' }}>Hamlet</p>
        </div>

        {/* Lady Macbeth - top right, saturated */}
        <div style={{ position: 'absolute', top: '20px', right: '0', zIndex: 4 }}>
          <LadyMacbethArtwork width={180} height={240} rotation={5} />
          <p className="piece-label" style={{ marginTop: '6px', textAlign: 'right' }}>Lady Macbeth</p>
        </div>

        {/* Midsummer - bottom left, watercolor feel */}
        <div style={{ position: 'absolute', bottom: '80px', left: '10px', zIndex: 2 }}>
          <GlobeTheatreArtwork width={200} height={140} rotation={-2.5} />
          <p className="piece-label" style={{ marginTop: '4px', fontSize: '0.7rem' }}>Midsummer</p>
        </div>

        {/* Richard III - bottom right, sketch/etching */}
        <div style={{ position: 'absolute', bottom: '30px', right: '20px', zIndex: 5 }}>
          <RichardIIIArtwork width={160} height={200} rotation={3.5} />
          <p className="piece-label" style={{ marginTop: '6px', textAlign: 'right' }}>Richard III</p>
        </div>
      </div>
    </>
  )
}

// Export individual components for flexibility
export { HamletArtwork, LadyMacbethArtwork, GlobeTheatreArtwork, RichardIIIArtwork, ShakespearePortrait, ArtisticFilters }
