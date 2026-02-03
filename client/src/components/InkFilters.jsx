/**
 * SVG Filters for Sumi-e ink wash effects
 * Include this component once at the app root
 */
export default function InkFilters() {
  return (
    <svg
      style={{ position: 'absolute', width: 0, height: 0 }}
      aria-hidden="true"
    >
      <defs>
        {/* Grainy ink texture for bands */}
        <filter id="ink-texture" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.04"
            numOctaves="3"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="3"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Soft ink bleed for stat numbers */}
        <filter id="ink-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.03"
            numOctaves="2"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
          <feGaussianBlur stdDeviation="1"/>
        </filter>

        {/* Brush stroke roughness for gold accents */}
        <filter id="brush" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02"
            numOctaves="3"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}
