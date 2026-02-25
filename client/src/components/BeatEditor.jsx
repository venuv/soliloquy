import { useState, useEffect } from 'react'
import { ChevronUp, ChevronDown, Plus, Trash2, X, RotateCcw, Check } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'

const colors = {
  paper: '#fdfcf8',
  ink: '#1a1a1a',
  crimson: '#9b2d30',
  forest: '#3d5c4a',
  blue: '#2a4a5e',
  gold: '#c4a35a',
  muted: '#4a4a4a',
  faded: '#9a9a9a'
}

const BEAT_COLORS = [
  'rgba(155,45,48,0.08)', 'rgba(61,92,74,0.08)', 'rgba(42,74,94,0.08)',
  'rgba(196,163,90,0.08)', 'rgba(90,74,106,0.08)', 'rgba(155,100,48,0.08)',
  'rgba(48,120,155,0.08)'
]

const BEAT_BORDERS = [
  'rgba(155,45,48,0.3)', 'rgba(61,92,74,0.3)', 'rgba(42,74,94,0.3)',
  'rgba(196,163,90,0.3)', 'rgba(90,74,106,0.3)', 'rgba(155,100,48,0.3)',
  'rgba(48,120,155,0.3)'
]

export default function BeatEditor({ work, beats: initialBeats, defaultBeats, onSave, onClose }) {
  const isMobile = useIsMobile()
  const [beats, setBeats] = useState([])

  useEffect(() => {
    if (initialBeats && initialBeats.length > 0) {
      setBeats(initialBeats.map(b => ({ ...b })))
    } else if (defaultBeats && defaultBeats.length > 0) {
      setBeats(defaultBeats.map(b => ({ ...b })))
    }
  }, [initialBeats, defaultBeats])

  const updateBeatField = (beatId, field, value) => {
    setBeats(prev => prev.map(b => b.id === beatId ? { ...b, [field]: value } : b))
  }

  // Split a beat at a chunk boundary: creates two beats from one
  const splitBeat = (beatId, afterChunk) => {
    setBeats(prev => {
      const idx = prev.findIndex(b => b.id === beatId)
      if (idx === -1) return prev
      const beat = prev[idx]
      if (afterChunk < beat.startChunk || afterChunk >= beat.endChunk) return prev

      const newBeats = [...prev]
      newBeats.splice(idx, 1,
        { ...beat, endChunk: afterChunk },
        { id: -1, label: 'New Beat', intention: '', startChunk: afterChunk + 1, endChunk: beat.endChunk }
      )
      // Reassign IDs
      return newBeats.map((b, i) => ({ ...b, id: i }))
    })
  }

  // Merge a beat with the next one
  const mergeBeatWithNext = (beatId) => {
    setBeats(prev => {
      const idx = prev.findIndex(b => b.id === beatId)
      if (idx === -1 || idx >= prev.length - 1) return prev
      const current = prev[idx]
      const next = prev[idx + 1]
      const newBeats = [...prev]
      newBeats.splice(idx, 2, {
        ...current,
        endChunk: next.endChunk
      })
      return newBeats.map((b, i) => ({ ...b, id: i }))
    })
  }

  // Move boundary: shift the divider between beat and next beat
  const moveBoundaryDown = (beatId) => {
    setBeats(prev => {
      const idx = prev.findIndex(b => b.id === beatId)
      if (idx === -1 || idx >= prev.length - 1) return prev
      const current = prev[idx]
      const next = prev[idx + 1]
      if (next.startChunk >= next.endChunk) return prev // can't shrink next to nothing

      const newBeats = [...prev]
      newBeats[idx] = { ...current, endChunk: current.endChunk + 1 }
      newBeats[idx + 1] = { ...next, startChunk: next.startChunk + 1 }
      return newBeats
    })
  }

  const moveBoundaryUp = (beatId) => {
    setBeats(prev => {
      const idx = prev.findIndex(b => b.id === beatId)
      if (idx === -1 || idx >= prev.length - 1) return prev
      const current = prev[idx]
      const next = prev[idx + 1]
      if (current.startChunk >= current.endChunk) return prev // can't shrink current to nothing

      const newBeats = [...prev]
      newBeats[idx] = { ...current, endChunk: current.endChunk - 1 }
      newBeats[idx + 1] = { ...next, startChunk: next.startChunk - 1 }
      return newBeats
    })
  }

  const resetToDefault = () => {
    if (defaultBeats) {
      setBeats(defaultBeats.map(b => ({ ...b })))
    }
  }

  const handleSave = () => {
    onSave(beats)
  }

  if (!work || beats.length === 0) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        background: colors.paper, borderRadius: isMobile ? 0 : '12px',
        maxWidth: isMobile ? '100%' : '40rem', width: '100%', maxHeight: isMobile ? '100vh' : '90vh',
        height: isMobile ? '100vh' : 'auto',
        display: 'flex', flexDirection: 'column',
        boxShadow: isMobile ? 'none' : '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.3rem', color: colors.ink, margin: 0 }}>Edit Beats</h2>
            <p style={{ color: colors.faded, fontSize: '0.8rem', margin: '0.25rem 0 0' }}>"{work.title}" — {beats.length} beats, {work.chunks.length} chunks</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.muted, padding: '0.5rem' }}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>
          {beats.map((beat, beatIdx) => (
            <div key={beat.id} style={{ marginBottom: '0.5rem' }}>
              {/* Beat header */}
              <div style={{
                background: BEAT_COLORS[beatIdx % BEAT_COLORS.length],
                border: `1px solid ${BEAT_BORDERS[beatIdx % BEAT_BORDERS.length]}`,
                borderRadius: '8px', padding: '0.75rem 1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: colors.faded, fontWeight: 600, textTransform: 'uppercase' }}>Beat {beatIdx + 1}</span>
                  {beats.length > 1 && beatIdx < beats.length - 1 && (
                    <button onClick={() => mergeBeatWithNext(beat.id)} title="Merge with next beat" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: colors.faded, padding: '0.25rem' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <input
                  value={beat.label}
                  onChange={(e) => updateBeatField(beat.id, 'label', e.target.value)}
                  placeholder="Beat name..."
                  style={{
                    width: '100%', border: 'none', background: 'rgba(255,255,255,0.5)',
                    borderRadius: '4px', padding: '0.4rem 0.5rem', fontFamily: "'Cormorant', serif",
                    fontSize: '1.1rem', color: colors.ink, boxSizing: 'border-box'
                  }}
                />
                <input
                  value={beat.intention}
                  onChange={(e) => updateBeatField(beat.id, 'intention', e.target.value)}
                  placeholder="Acting intention..."
                  style={{
                    width: '100%', border: 'none', background: 'rgba(255,255,255,0.3)',
                    borderRadius: '4px', padding: '0.3rem 0.5rem', marginTop: '0.25rem',
                    fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.8rem',
                    color: colors.muted, fontStyle: 'italic', boxSizing: 'border-box'
                  }}
                />

                {/* Chunks in this beat */}
                <div style={{ marginTop: '0.5rem' }}>
                  {work.chunks.slice(beat.startChunk, beat.endChunk + 1).map((chunk, i) => {
                    const chunkIdx = beat.startChunk + i
                    const isLastInBeat = chunkIdx === beat.endChunk && chunkIdx < work.chunks.length - 1
                    return (
                      <div key={chunkIdx}>
                        <div style={{
                          padding: '0.3rem 0', fontSize: '0.8rem', color: colors.muted,
                          display: 'flex', alignItems: 'baseline', gap: '0.5rem'
                        }}>
                          <span style={{ color: colors.faded, fontSize: '0.7rem', minWidth: '1.5rem' }}>{chunkIdx + 1}</span>
                          <span>{chunk.front} <span style={{ color: colors.ink }}>{chunk.back}</span></span>
                        </div>
                        {/* Split button between chunks within a beat */}
                        {i < beat.endChunk - beat.startChunk && (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.1rem 0' }}>
                            <button
                              onClick={() => splitBeat(beat.id, chunkIdx)}
                              title="Split beat here"
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: colors.faded, fontSize: '0.65rem', padding: isMobile ? '0.4rem 0.6rem' : '0.1rem 0.5rem',
                                opacity: 0.5
                              }}
                              onMouseEnter={(e) => e.target.style.opacity = 1}
                              onMouseLeave={(e) => e.target.style.opacity = 0.5}
                            >
                              <Plus size={isMobile ? 16 : 10} /> split
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Boundary controls between beats */}
              {beatIdx < beats.length - 1 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.5rem', padding: '0.25rem 0'
                }}>
                  <button onClick={() => moveBoundaryUp(beat.id)} title="Move line up to this beat" style={{ background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px', cursor: 'pointer', color: colors.faded, padding: isMobile ? '0.5rem 0.6rem' : '0.15rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <ChevronUp size={isMobile ? 18 : 12} />
                  </button>
                  <span style={{ fontSize: '0.65rem', color: colors.faded }}>boundary</span>
                  <button onClick={() => moveBoundaryDown(beat.id)} title="Move line down to next beat" style={{ background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px', cursor: 'pointer', color: colors.faded, padding: isMobile ? '0.5rem 0.6rem' : '0.15rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <ChevronDown size={isMobile ? 18 : 12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <button onClick={resetToDefault} style={{
            background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px',
            padding: '0.5rem 0.75rem', cursor: 'pointer', color: colors.muted,
            fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', gap: '0.35rem'
          }}>
            <RotateCcw size={14} /> Reset
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onClose} style={{
              background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px',
              padding: '0.5rem 1rem', cursor: 'pointer', color: colors.muted,
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.85rem'
            }}>
              Cancel
            </button>
            <button onClick={handleSave} style={{
              background: colors.forest, border: 'none', borderRadius: '6px',
              padding: '0.5rem 1rem', cursor: 'pointer', color: colors.paper,
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: '0.35rem'
            }}>
              <Check size={14} /> Save Beats
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
