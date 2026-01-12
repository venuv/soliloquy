import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../App'
import {
  ArrowLeft, Image, RefreshCw, Check, Loader2,
  BookOpen, Hash, FileText
} from 'lucide-react'

export default function Visualize() {
  const { authorId, workId } = useParams()

  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [images, setImages] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [error, setError] = useState(null)

  // Load text analysis
  useEffect(() => {
    api(`/visualize/analyze/${authorId}/${workId}`)
      .then(setAnalysis)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [authorId, workId])

  // Generate images
  const handleGenerate = async () => {
    if (!analysis) return

    setGenerating(true)
    setError(null)
    setImages([])
    setSelectedImage(null)

    try {
      const result = await api('/visualize/generate', {
        method: 'POST',
        body: JSON.stringify({
          workTitle: analysis.work.title,
          character: analysis.work.character,
          source: analysis.work.source
        })
      })

      if (result.success && result.images) {
        setImages(result.images)
      } else {
        throw new Error('No images returned')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  // Format first letters for display (group by chunk boundaries)
  const formatFirstLetters = (letters, groupSize = 10) => {
    const groups = []
    for (let i = 0; i < letters.length; i += groupSize) {
      groups.push(letters.slice(i, i + groupSize))
    }
    return groups.join(' ')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-400" size={32} />
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400">Failed to load work</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <Link
          to={`/practice/${authorId}/${workId}`}
          className="text-gray-400 hover:text-white flex items-center gap-2 mb-6"
        >
          <ArrowLeft size={20} /> Back to Practice
        </Link>

        <h1 className="text-2xl font-bold text-white mb-2">
          "{analysis.work.title}"
        </h1>
        <p className="text-gray-400 mb-6">
          {analysis.work.character} - {analysis.work.source}, {analysis.work.act}
        </p>

        {/* Top Analysis Panel - Entire Soliloquy Stats */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-amber-400 font-medium mb-4 flex items-center gap-2">
            <BookOpen size={18} /> Soliloquy Analysis
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Hash size={14} /> Total Words
              </div>
              <div className="text-2xl font-bold text-white">
                {analysis.soliloquy.wordCount}
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <FileText size={14} /> Chunks
              </div>
              <div className="text-2xl font-bold text-white">
                {analysis.soliloquy.chunkCount}
              </div>
            </div>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-2">First Letters Sequence (Full Soliloquy)</div>
            <div className="font-mono text-amber-300 text-sm leading-relaxed break-all">
              {formatFirstLetters(analysis.soliloquy.firstLetters)}
            </div>
            <div className="text-gray-500 text-xs mt-2">
              {analysis.soliloquy.firstLetters.length} letters total - Use as memory aid!
            </div>
          </div>
        </div>

        {/* 2x2 Image Grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-amber-400 font-medium flex items-center gap-2">
              <Image size={18} /> Visual Inspiration
            </h2>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Generate Images
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-lg p-4 mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {images.length > 0 ? (
              images.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all ${
                    selectedImage === idx
                      ? 'ring-4 ring-amber-400 scale-[1.02]'
                      : 'ring-2 ring-gray-700 hover:ring-gray-500'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={`Visualization ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {selectedImage === idx && (
                    <div className="absolute top-3 right-3 bg-amber-400 text-gray-900 rounded-full p-1">
                      <Check size={16} />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <span className="text-white text-sm">Option {idx + 1}</span>
                  </div>
                </div>
              ))
            ) : (
              // Placeholder grid
              [0, 1].map((idx) => (
                <div
                  key={idx}
                  className="aspect-square rounded-xl bg-gray-800 border-2 border-dashed border-gray-700 flex items-center justify-center"
                >
                  {generating ? (
                    <Loader2 size={32} className="text-gray-600 animate-spin" />
                  ) : (
                    <div className="text-center text-gray-600">
                      <Image size={32} className="mx-auto mb-2" />
                      <span className="text-sm">Option {idx + 1}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {selectedImage !== null && (
            <div className="mt-4 text-center text-green-400">
              Selected Option {selectedImage + 1}
            </div>
          )}
        </div>

        {/* Bottom Analysis Panel - Per-Chunk Breakdown */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-amber-400 font-medium mb-4 flex items-center gap-2">
            <FileText size={18} /> Per-Chunk Analysis
          </h2>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {analysis.chunks.map((chunk, idx) => (
              <div key={idx} className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-400 text-xs mb-1">Chunk {idx + 1}</div>
                    <div className="text-white text-sm truncate">
                      {chunk.front} <span className="text-amber-400">{chunk.back}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-center">
                      <div className="text-gray-500 text-xs">Words</div>
                      <div className="text-white font-medium">{chunk.wordCount}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 text-xs">Letters</div>
                      <div className="font-mono text-amber-300 text-sm">{chunk.firstLetters}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary row */}
          <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between text-sm">
            <span className="text-gray-400">
              Average words per chunk: {Math.round(analysis.soliloquy.wordCount / analysis.soliloquy.chunkCount)}
            </span>
            <span className="text-gray-400">
              Average letters per chunk: {Math.round(analysis.soliloquy.firstLetters.length / analysis.soliloquy.chunkCount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
