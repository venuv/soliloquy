import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../App'
import {
  ArrowLeft, Sparkles, Save, Loader2, Check, Edit3, X,
  Grid3X3, List, ChevronDown, ChevronUp, Home
} from 'lucide-react'

const colors = {
  paper: '#fdfcf8',
  ink: '#1a1a1a',
  crimson: '#9b2d30',
  forest: '#3d5c4a',
  blue: '#2a4a5e',
  gold: '#c4a35a',
  purple: '#5a4a6a',
  muted: '#4a4a4a',
  faded: '#9a9a9a'
}

export default function Visualize() {
  const { authorId, workId } = useParams()

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [work, setWork] = useState(null)
  const [chunks, setChunks] = useState([])
  const [firstLetters, setFirstLetters] = useState('')

  const [generatedPictures, setGeneratedPictures] = useState({})
  const [selectedPictures, setSelectedPictures] = useState({})
  const [hasChanges, setHasChanges] = useState(false)

  const [editingChunk, setEditingChunk] = useState(null)
  const [editText, setEditText] = useState('')

  const [view, setView] = useState('editor') // 'editor' | 'bingo'
  const [expandedChunk, setExpandedChunk] = useState(null)

  // Load data on mount
  useEffect(() => {
    api(`/visualize/word-pictures/${authorId}/${workId}`)
      .then(data => {
        setWork(data.work)
        setChunks(data.chunks)
        setFirstLetters(data.firstLetters)

        if (data.wordPictures?.generated) {
          setGeneratedPictures(data.wordPictures.generated)
        }
        if (data.wordPictures?.selected) {
          setSelectedPictures(data.wordPictures.selected)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [authorId, workId])

  // Generate word pictures
  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)

    try {
      const result = await api(`/visualize/generate/${authorId}/${workId}`, {
        method: 'POST'
      })

      if (result.success && result.wordPictures) {
        setGeneratedPictures(result.wordPictures)
        // Auto-select first option for each chunk
        const autoSelected = {}
        Object.keys(result.wordPictures).forEach(idx => {
          if (result.wordPictures[idx]?.[0]) {
            autoSelected[idx] = result.wordPictures[idx][0]
          }
        })
        setSelectedPictures(autoSelected)
        setHasChanges(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  // Select an option
  const handleSelect = (chunkIndex, option) => {
    setSelectedPictures(prev => ({
      ...prev,
      [chunkIndex]: option
    }))
    setHasChanges(true)
  }

  // Start editing
  const handleStartEdit = (chunkIndex) => {
    setEditingChunk(chunkIndex)
    setEditText(selectedPictures[chunkIndex] || '')
  }

  // Save edit
  const handleSaveEdit = () => {
    if (editingChunk !== null && editText.trim()) {
      setSelectedPictures(prev => ({
        ...prev,
        [editingChunk]: editText.trim()
      }))
      setHasChanges(true)
    }
    setEditingChunk(null)
    setEditText('')
  }

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingChunk(null)
    setEditText('')
  }

  // Save to server
  const handleSave = async () => {
    setSaving(true)
    try {
      await api('/visualize/save', {
        method: 'POST',
        body: JSON.stringify({
          authorId,
          workId,
          selected: selectedPictures
        })
      })
      setHasChanges(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: colors.paper, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} style={{ color: colors.gold, animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (!work) {
    return (
      <div style={{ minHeight: '100vh', background: colors.paper, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: colors.crimson }}>Failed to load work</div>
      </div>
    )
  }

  const hasGenerated = Object.keys(generatedPictures).length > 0

  return (
    <div style={{ minHeight: '100vh', background: colors.paper, fontFamily: "'IBM Plex Sans', sans-serif", padding: '1.5rem', paddingBottom: '6rem' }}>
      <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <Link to={`/practice/${authorId}/${workId}`} style={{ color: colors.muted, textDecoration: 'none' }} title="Back to Practice">
            <ArrowLeft size={22} />
          </Link>
          <div>
            <h1 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.75rem', color: colors.purple, fontWeight: 400, margin: 0 }}>
              Memory Palace
            </h1>
            <p style={{ color: colors.muted, fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
              "{work.title}" - Floor Plan View
            </p>
          </div>
        </div>

        <p style={{ color: colors.faded, fontSize: '0.85rem', marginBottom: '1rem' }}>
          Review your complete journey. Build mnemonics chunk-by-chunk in Practice → Advanced tab.
        </p>

        {/* First Letters */}
        <div style={{ background: 'rgba(196,163,90,0.08)', border: '1px solid rgba(196,163,90,0.2)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ color: colors.muted, fontSize: '0.85rem', marginBottom: '0.5rem' }}>First Letters (by sentence)</div>
          <div style={{ fontFamily: 'monospace', color: colors.gold, fontSize: '1.1rem', letterSpacing: '0.1em' }}>
            {firstLetters || 'N/A'}
          </div>
          <div style={{ color: colors.faded, fontSize: '0.75rem', marginTop: '0.25rem' }}>
            {firstLetters.length} sentences - memorize this sequence!
          </div>
        </div>

        {/* View Toggle & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.04)', borderRadius: '8px', padding: '0.25rem' }}>
            <button
              onClick={() => setView('editor')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: view === 'editor' ? colors.gold : 'transparent',
                color: view === 'editor' ? colors.paper : colors.muted,
                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.9rem'
              }}
            >
              <List size={16} /> Editor
            </button>
            <button
              onClick={() => setView('bingo')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: view === 'bingo' ? colors.gold : 'transparent',
                color: view === 'bingo' ? colors.paper : colors.muted,
                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.9rem'
              }}
            >
              <Grid3X3 size={16} /> Floor Plan
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                background: generating ? 'rgba(0,0,0,0.1)' : colors.purple, color: generating ? colors.faded : colors.paper,
                cursor: generating ? 'not-allowed' : 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.9rem'
              }}
            >
              {generating ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Creating & Improving...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  {hasGenerated ? 'Regenerate' : 'Generate'}
                </>
              )}
            </button>

            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                  background: saving ? 'rgba(0,0,0,0.1)' : colors.forest, color: saving ? colors.faded : colors.paper,
                  cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.9rem'
                }}
              >
                {saving ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Save size={16} />
                )}
                Save
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(155,45,48,0.08)', border: '1px solid rgba(155,45,48,0.2)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', color: colors.crimson }}>
            {error}
          </div>
        )}

        {/* Editor View */}
        {view === 'editor' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!hasGenerated && (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: colors.faded }}>
                <Sparkles size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>Click "Generate" to create word picture mnemonics for each chunk</p>
              </div>
            )}

            {chunks.map((chunk, idx) => {
              const options = generatedPictures[idx] || []
              const selected = selectedPictures[idx]
              const isEditing = editingChunk === idx
              const isExpanded = expandedChunk === idx

              return (
                <div key={idx} style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                  {/* Chunk Header */}
                  <button
                    onClick={() => setExpandedChunk(isExpanded ? null : idx)}
                    style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: colors.faded, fontSize: '0.75rem', marginBottom: '0.25rem' }}>Chunk {idx + 1}</div>
                      <div style={{ color: colors.ink }}>
                        <span style={{ color: colors.muted }}>{chunk.front}</span>
                        {' '}
                        <span style={{ color: colors.gold }}>{chunk.back}</span>
                      </div>
                      {selected && !isExpanded && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: colors.purple, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Check size={14} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                          {selected}
                        </div>
                      )}
                    </div>
                    {options.length > 0 && (
                      <div style={{ marginLeft: '1rem', color: colors.faded }}>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    )}
                  </button>

                  {/* Expanded Options */}
                  {isExpanded && options.length > 0 && (
                    <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {/* Edit Mode */}
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            style={{ width: '100%', background: 'rgba(0,0,0,0.04)', color: colors.ink, border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.9rem', resize: 'none', fontFamily: "'IBM Plex Sans', sans-serif", boxSizing: 'border-box' }}
                            rows={3}
                            placeholder="Write your custom word picture..."
                            autoFocus
                          />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={handleSaveEdit}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', background: colors.forest, color: colors.paper, fontSize: '0.85rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}
                            >
                              <Check size={14} /> Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.1)', color: colors.muted, fontSize: '0.85rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}
                            >
                              <X size={14} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Option Cards */}
                          {options.map((option, optIdx) => (
                            <button
                              key={optIdx}
                              onClick={() => handleSelect(idx, option)}
                              style={{
                                width: '100%', textAlign: 'left', padding: '0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
                                background: selected === option ? 'rgba(90,74,106,0.15)' : 'rgba(0,0,0,0.03)',
                                outline: selected === option ? '2px solid rgba(90,74,106,0.5)' : 'none',
                                color: selected === option ? colors.ink : colors.muted
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                <div style={{
                                  width: '20px', height: '20px', borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px',
                                  borderColor: selected === option ? colors.purple : colors.faded,
                                  background: selected === option ? colors.purple : 'transparent'
                                }}>
                                  {selected === option && <Check size={12} style={{ color: colors.paper }} />}
                                </div>
                                <span style={{ fontSize: '0.9rem' }}>{option}</span>
                              </div>
                            </button>
                          ))}

                          {/* Custom Edit Button */}
                          {selected && (
                            <button
                              onClick={() => handleStartEdit(idx)}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: colors.muted, marginTop: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}
                            >
                              <Edit3 size={14} /> Edit selected
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Floor Plan View - SVG Memory Palace */}
        {view === 'bingo' && (
          <div>
            {Object.keys(selectedPictures).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: colors.faded }}>
                <Grid3X3 size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>Generate and select word pictures to see your floor plan</p>
              </div>
            ) : (() => {
              // Room names for memory palace
              const rooms = [
                'Foyer', 'Great Hall', 'Parlor', 'Library', 'Study', 'Gallery',
                'Staircase', 'Ballroom', 'Tower', 'Chapel', 'Garden', 'Cellar',
                'Kitchen', 'Attic', 'Conservatory', 'Drawing Room', 'Armory',
                'Crypt', 'Observatory', 'Throne Room', 'Courtyard', 'Dungeon',
                'Balcony', 'Vestibule', 'Antechamber', 'Solar', 'Scullery',
                'Buttery', 'Minstrel Gallery', 'Keep', 'Gatehouse', 'Cloister',
                'Refectory', 'Scriptorium', 'Undercroft'
              ]

              // SVG dimensions
              const ROOM_WIDTH = 180
              const ROOM_HEIGHT = 110
              const ROOMS_PER_ROW = 3
              const GAP_X = 30
              const GAP_Y = 40
              const PADDING = 40

              // Calculate room position in snaking layout
              const getRoomPosition = (idx) => {
                const row = Math.floor(idx / ROOMS_PER_ROW)
                const colInRow = idx % ROOMS_PER_ROW
                // Alternate direction each row for snaking path
                const col = row % 2 === 0 ? colInRow : (ROOMS_PER_ROW - 1 - colInRow)
                return {
                  x: PADDING + col * (ROOM_WIDTH + GAP_X),
                  y: PADDING + row * (ROOM_HEIGHT + GAP_Y)
                }
              }

              // Calculate SVG dimensions
              const numRows = Math.ceil(chunks.length / ROOMS_PER_ROW)
              const svgWidth = PADDING * 2 + ROOMS_PER_ROW * ROOM_WIDTH + (ROOMS_PER_ROW - 1) * GAP_X
              const svgHeight = PADDING * 2 + numRows * ROOM_HEIGHT + (numRows - 1) * GAP_Y + 60 // +60 for header

              // Word wrap helper for SVG text
              const wrapText = (text, maxChars) => {
                if (!text) return []
                const words = text.split(' ')
                const lines = []
                let currentLine = ''

                words.forEach(word => {
                  if ((currentLine + ' ' + word).trim().length <= maxChars) {
                    currentLine = (currentLine + ' ' + word).trim()
                  } else {
                    if (currentLine) lines.push(currentLine)
                    currentLine = word
                  }
                })
                if (currentLine) lines.push(currentLine)
                return lines.slice(0, 5) // Max 5 lines
              }

              // Get doorway positions between rooms
              const getDoorway = (idx) => {
                if (idx >= chunks.length - 1) return null
                const pos1 = getRoomPosition(idx)
                const pos2 = getRoomPosition(idx + 1)
                const row1 = Math.floor(idx / ROOMS_PER_ROW)
                const row2 = Math.floor((idx + 1) / ROOMS_PER_ROW)

                if (row1 === row2) {
                  // Same row - horizontal doorway
                  const rightRoom = pos1.x > pos2.x ? pos1 : pos2
                  const leftRoom = pos1.x > pos2.x ? pos2 : pos1
                  return {
                    x1: leftRoom.x + ROOM_WIDTH,
                    y1: leftRoom.y + ROOM_HEIGHT / 2,
                    x2: rightRoom.x,
                    y2: rightRoom.y + ROOM_HEIGHT / 2
                  }
                } else {
                  // Different row - vertical doorway
                  return {
                    x1: pos1.x + ROOM_WIDTH / 2,
                    y1: pos1.y + ROOM_HEIGHT,
                    x2: pos2.x + ROOM_WIDTH / 2,
                    y2: pos2.y
                  }
                }
              }

              return (
                <div
                  style={{ maxWidth: '56rem', margin: '0 auto', padding: '1rem', overflowX: 'auto', backgroundColor: colors.paper }}
                >
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full"
                    style={{
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      minWidth: '600px'
                    }}
                  >
                    {/* Header */}
                    <text
                      x={svgWidth / 2}
                      y={25}
                      textAnchor="middle"
                      fontSize="10"
                      letterSpacing="0.3em"
                      fill="#888"
                    >
                      A MEMORY PALACE IN {chunks.length} ROOMS
                    </text>
                    <text
                      x={svgWidth / 2}
                      y={48}
                      textAnchor="middle"
                      fontSize="18"
                      fontStyle="italic"
                      fill="#333"
                    >
                      {work.title}
                    </text>

                    {/* Rooms offset by header */}
                    <g transform="translate(0, 20)">
                      {/* Doorway connections */}
                      {chunks.map((_, idx) => {
                        const doorway = getDoorway(idx)
                        if (!doorway) return null

                        return (
                          <g key={`door-${idx}`}>
                            {/* Dotted path line */}
                            <line
                              x1={doorway.x1}
                              y1={doorway.y1}
                              x2={doorway.x2}
                              y2={doorway.y2}
                              stroke="#aaa"
                              strokeWidth="1"
                              strokeDasharray="4,4"
                            />
                            {/* Arrow at midpoint */}
                            <circle
                              cx={(doorway.x1 + doorway.x2) / 2}
                              cy={(doorway.y1 + doorway.y2) / 2}
                              r="3"
                              fill="#aaa"
                            />
                          </g>
                        )
                      })}

                      {/* Rooms */}
                      {chunks.map((chunk, idx) => {
                        const pos = getRoomPosition(idx)
                        const selected = selectedPictures[idx]
                        const room = rooms[idx % rooms.length]
                        const textLines = wrapText(selected, 28)

                        return (
                          <g
                            key={idx}
                            onClick={() => setExpandedChunk(expandedChunk === idx ? null : idx)}
                            style={{ cursor: 'pointer' }}
                          >
                            {/* Room rectangle - thin stroke, no fill */}
                            <rect
                              x={pos.x}
                              y={pos.y}
                              width={ROOM_WIDTH}
                              height={ROOM_HEIGHT}
                              fill="none"
                              stroke="#666"
                              strokeWidth="1.5"
                            />

                            {/* Room number */}
                            <text
                              x={pos.x + 8}
                              y={pos.y + 16}
                              fontSize="14"
                              fill="#999"
                            >
                              {idx + 1}
                            </text>

                            {/* Room name */}
                            <text
                              x={pos.x + 28}
                              y={pos.y + 16}
                              fontSize="9"
                              letterSpacing="0.1em"
                              fill="#888"
                              textTransform="uppercase"
                            >
                              {room.toUpperCase()}
                            </text>

                            {/* Separator line */}
                            <line
                              x1={pos.x + 6}
                              y1={pos.y + 22}
                              x2={pos.x + ROOM_WIDTH - 6}
                              y2={pos.y + 22}
                              stroke="#ddd"
                              strokeWidth="0.5"
                            />

                            {/* Mnemonic text */}
                            {selected ? (
                              textLines.map((line, lineIdx) => (
                                <text
                                  key={lineIdx}
                                  x={pos.x + 8}
                                  y={pos.y + 36 + lineIdx * 14}
                                  fontSize="10"
                                  fill="#444"
                                >
                                  {line}
                                </text>
                              ))
                            ) : (
                              <text
                                x={pos.x + ROOM_WIDTH / 2}
                                y={pos.y + ROOM_HEIGHT / 2 + 10}
                                fontSize="10"
                                fill="#ccc"
                                textAnchor="middle"
                                fontStyle="italic"
                              >
                                empty
                              </text>
                            )}
                          </g>
                        )
                      })}
                    </g>

                    {/* Footer */}
                    <text
                      x={PADDING}
                      y={svgHeight - 10}
                      fontSize="9"
                      fontStyle="italic"
                      fill="#888"
                    >
                      {work.source}
                    </text>
                    <text
                      x={svgWidth - PADDING}
                      y={svgHeight - 10}
                      fontSize="9"
                      letterSpacing="0.1em"
                      fill="#888"
                      textAnchor="end"
                    >
                      {chunks.length} ROOMS
                    </text>
                  </svg>
                </div>
              )
            })()}

            {/* Expanded Detail Modal */}
            {expandedChunk !== null && selectedPictures[expandedChunk] && (() => {
              const rooms = [
                'Foyer', 'Great Hall', 'Parlor', 'Library', 'Study', 'Gallery',
                'Staircase', 'Ballroom', 'Tower', 'Chapel', 'Garden', 'Cellar',
                'Kitchen', 'Attic', 'Conservatory', 'Drawing Room', 'Armory',
                'Crypt', 'Observatory', 'Throne Room', 'Courtyard', 'Dungeon',
                'Balcony', 'Vestibule', 'Antechamber', 'Solar', 'Scullery',
                'Buttery', 'Minstrel Gallery', 'Keep', 'Gatehouse', 'Cloister',
                'Refectory', 'Scriptorium', 'Undercroft'
              ]
              const room = rooms[expandedChunk % rooms.length]

              return (
                <div
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}
                  onClick={() => setExpandedChunk(null)}
                >
                  <div
                    style={{
                      maxWidth: '32rem', width: '100%', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.15)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      backgroundColor: colors.paper, borderRadius: '12px',
                      fontFamily: "'Cormorant', serif"
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Room Header */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                      <span style={{ fontSize: '1.75rem', color: colors.faded }}>
                        {expandedChunk + 1}
                      </span>
                      <span style={{ fontSize: '0.85rem', letterSpacing: '0.15em', color: colors.muted, textTransform: 'uppercase' }}>
                        The {room}
                      </span>
                    </div>

                    {/* Original Text */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: colors.faded, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        Original Text
                      </div>
                      <div style={{ fontSize: '1rem', color: colors.muted, fontStyle: 'italic', lineHeight: 1.6 }}>
                        {chunks[expandedChunk]?.front}{' '}
                        <span style={{ fontStyle: 'normal', fontWeight: 500, color: colors.ink }}>
                          {chunks[expandedChunk]?.back}
                        </span>
                      </div>
                    </div>

                    {/* Mnemonic */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: colors.faded, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        Word Picture
                      </div>
                      <div style={{ fontSize: '1rem', color: colors.ink, lineHeight: 1.6 }}>
                        {selectedPictures[expandedChunk]}
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedChunk(null)}
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem', color: colors.muted, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
