import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../App'
import {
  ArrowLeft, Sparkles, Save, Loader2, Check, Edit3, X,
  Grid3X3, List, ChevronDown, ChevronUp
} from 'lucide-react'

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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-400" size={32} />
      </div>
    )
  }

  if (!work) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400">Failed to load work</div>
      </div>
    )
  }

  const hasGenerated = Object.keys(generatedPictures).length > 0

  return (
    <div className="min-h-screen bg-gray-900 p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Link
          to={`/practice/${authorId}/${workId}`}
          className="text-gray-400 hover:text-white flex items-center gap-2 mb-4"
        >
          <ArrowLeft size={20} /> Back to Practice
        </Link>

        <h1 className="text-2xl font-bold text-white mb-1">
          Word Pictures
        </h1>
        <p className="text-gray-400 mb-4">
          "{work.title}" - {work.character}
        </p>

        {/* First Letters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="text-gray-400 text-sm mb-2">First Letters (by sentence)</div>
          <div className="font-mono text-amber-300 text-lg tracking-wider">
            {firstLetters || 'N/A'}
          </div>
          <div className="text-gray-500 text-xs mt-1">
            {firstLetters.length} sentences - memorize this sequence!
          </div>
        </div>

        {/* View Toggle & Actions */}
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setView('editor')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                view === 'editor'
                  ? 'bg-amber-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <List size={16} /> Editor
            </button>
            <button
              onClick={() => setView('bingo')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                view === 'bingo'
                  ? 'bg-amber-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid3X3 size={16} /> Floor Plan
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
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
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
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
          <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-lg p-4 mb-4">
            {error}
          </div>
        )}

        {/* Editor View */}
        {view === 'editor' && (
          <div className="space-y-4">
            {!hasGenerated && (
              <div className="text-center py-12 text-gray-500">
                <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
                <p>Click "Generate" to create word picture mnemonics for each chunk</p>
              </div>
            )}

            {chunks.map((chunk, idx) => {
              const options = generatedPictures[idx] || []
              const selected = selectedPictures[idx]
              const isEditing = editingChunk === idx
              const isExpanded = expandedChunk === idx

              return (
                <div key={idx} className="bg-gray-800 rounded-xl overflow-hidden">
                  {/* Chunk Header */}
                  <button
                    onClick={() => setExpandedChunk(isExpanded ? null : idx)}
                    className="w-full p-4 flex items-start justify-between text-left hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-500 text-xs mb-1">Chunk {idx + 1}</div>
                      <div className="text-white">
                        <span className="text-gray-300">{chunk.front}</span>
                        {' '}
                        <span className="text-amber-400">{chunk.back}</span>
                      </div>
                      {selected && !isExpanded && (
                        <div className="mt-2 text-sm text-purple-300 truncate">
                          <Check size={14} className="inline mr-1" />
                          {selected}
                        </div>
                      )}
                    </div>
                    {options.length > 0 && (
                      <div className="ml-4 text-gray-500">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    )}
                  </button>

                  {/* Expanded Options */}
                  {isExpanded && options.length > 0 && (
                    <div className="px-4 pb-4 space-y-2">
                      {/* Edit Mode */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full bg-gray-700 text-white rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                            rows={3}
                            placeholder="Write your custom word picture..."
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg"
                            >
                              <Check size={14} /> Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg"
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
                              className={`w-full text-left p-3 rounded-lg transition-all ${
                                selected === option
                                  ? 'bg-purple-600/30 border-2 border-purple-500 text-white'
                                  : 'bg-gray-700/50 border-2 border-transparent text-gray-300 hover:bg-gray-700 hover:text-white'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                  selected === option
                                    ? 'border-purple-400 bg-purple-500'
                                    : 'border-gray-500'
                                }`}>
                                  {selected === option && <Check size={12} className="text-white" />}
                                </div>
                                <span className="text-sm">{option}</span>
                              </div>
                            </button>
                          ))}

                          {/* Custom Edit Button */}
                          {selected && (
                            <button
                              onClick={() => handleStartEdit(idx)}
                              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mt-2"
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
              <div className="text-center py-12 text-gray-500">
                <Grid3X3 size={48} className="mx-auto mb-4 opacity-50" />
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
                  className="max-w-4xl mx-auto p-4 overflow-x-auto"
                  style={{ backgroundColor: '#faf8f5' }}
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
                  className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                  onClick={() => setExpandedChunk(null)}
                >
                  <div
                    className="max-w-lg w-full p-6 border border-gray-400 shadow-xl"
                    style={{
                      backgroundColor: '#faf8f5',
                      fontFamily: 'Georgia, "Times New Roman", serif'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Room Header */}
                    <div className="flex items-baseline gap-3 mb-4 pb-3 border-b border-gray-300">
                      <span className="text-3xl text-gray-400">
                        {expandedChunk + 1}
                      </span>
                      <span className="text-sm tracking-widest text-gray-500 uppercase">
                        The {room}
                      </span>
                    </div>

                    {/* Original Text */}
                    <div className="mb-4">
                      <div className="text-[10px] tracking-wider text-gray-400 uppercase mb-2">
                        Original Text
                      </div>
                      <div className="text-base text-gray-700 italic leading-relaxed">
                        {chunks[expandedChunk]?.front}{' '}
                        <span className="not-italic font-medium text-gray-900">
                          {chunks[expandedChunk]?.back}
                        </span>
                      </div>
                    </div>

                    {/* Mnemonic */}
                    <div className="mb-6">
                      <div className="text-[10px] tracking-wider text-gray-400 uppercase mb-2">
                        Word Picture
                      </div>
                      <div className="text-base text-gray-900 leading-relaxed">
                        {selectedPictures[expandedChunk]}
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedChunk(null)}
                      className="w-full py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors tracking-wider"
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
