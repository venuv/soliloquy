import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Home, Send, ThumbsUp, ThumbsDown, RefreshCw, Coffee, Loader2 } from 'lucide-react'
import { api } from '../App'

export default function MorningMuse() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [feedbackGiven, setFeedbackGiven] = useState(false)
  const [quotesCount, setQuotesCount] = useState(null)

  // Fetch quotes count on mount
  useEffect(() => {
    api('/muse/quotes/count')
      .then(data => setQuotesCount(data.count))
      .catch(() => setQuotesCount(0))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    setLoading(true)
    setError(null)
    setResponse(null)
    setFeedbackGiven(false)

    try {
      const data = await api('/muse', {
        method: 'POST',
        body: JSON.stringify({ input: input.trim() })
      })
      setResponse(data)
    } catch (err) {
      setError(err.message || 'The muse is momentarily silent. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleFeedback = async (liked) => {
    if (!response?.id || feedbackGiven) return

    try {
      await api('/muse/feedback', {
        method: 'POST',
        body: JSON.stringify({ responseId: response.id, liked })
      })
      setFeedbackGiven(true)
    } catch (err) {
      console.error('Feedback error:', err)
    }
  }

  const handleReset = () => {
    setInput('')
    setResponse(null)
    setError(null)
    setFeedbackGiven(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-gray-400 hover:text-white transition-colors"
            title="Home"
          >
            <Home size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-green-400 flex items-center gap-2">
              <Coffee size={24} />
              Morning Muse
            </h1>
            <p className="text-gray-400 text-sm">
              Share your morning mood, receive Shakespeare's wisdom
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Input Form */}
        {!response && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <label className="block text-gray-300 mb-3">
                How are you feeling this morning?
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="I woke up feeling anxious about the day ahead... / I'm grateful but a bit restless... / I can't shake this melancholy..."
                className="w-full h-32 bg-gray-900 text-white rounded-lg p-4 border border-gray-600 focus:border-green-500 focus:outline-none resize-none placeholder-gray-500"
                disabled={loading}
              />
              <div className="flex justify-between items-center mt-4">
                <span className="text-gray-500 text-sm">
                  {quotesCount !== null
                    ? `${quotesCount} Shakespeare quotes ready`
                    : 'Loading quotes...'}
                </span>
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Consulting the Bard...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Seek Wisdom
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-red-300">
            <p>{error}</p>
            <button
              onClick={handleReset}
              className="mt-4 text-red-400 hover:text-red-300 flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="space-y-6">
            {/* Main Response Card */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              {/* Meta info */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <span className="px-2 py-1 bg-gray-700 rounded">
                  {response.meta?.style}
                </span>
                <span className="px-2 py-1 bg-green-900/50 text-green-400 rounded">
                  {response.meta?.wisdomType}
                </span>
                {response.meta?.emotions?.map(e => (
                  <span key={e} className="px-2 py-1 bg-purple-900/50 text-purple-400 rounded">
                    {e}
                  </span>
                ))}
              </div>

              {/* Response text */}
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {response.response}
                </p>
              </div>

              {/* Quote source */}
              <div className="mt-6 pt-4 border-t border-gray-700">
                <p className="text-gray-400 text-sm">
                  <span className="text-amber-400">{response.quote?.character}</span>
                  {' '}in{' '}
                  <span className="text-amber-400 italic">{response.quote?.play}</span>
                </p>
                {response.quote?.situation && (
                  <p className="text-gray-500 text-sm mt-1">
                    {response.quote.situation}
                  </p>
                )}
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">
                  {feedbackGiven ? 'Thanks for your feedback!' : 'Did this resonate with you?'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFeedback(true)}
                    disabled={feedbackGiven}
                    className={`p-2 rounded-lg transition-colors ${
                      feedbackGiven
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-gray-400 hover:text-green-400 hover:bg-green-900/30'
                    }`}
                    title="This helped"
                  >
                    <ThumbsUp size={20} />
                  </button>
                  <button
                    onClick={() => handleFeedback(false)}
                    disabled={feedbackGiven}
                    className={`p-2 rounded-lg transition-colors ${
                      feedbackGiven
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-gray-400 hover:text-red-400 hover:bg-red-900/30'
                    }`}
                    title="Not quite right"
                  >
                    <ThumbsDown size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Try again button */}
            <button
              onClick={handleReset}
              className="w-full py-3 text-gray-400 hover:text-white flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw size={16} />
              Share another feeling
            </button>
          </div>
        )}

        {/* Prompt suggestions */}
        {!response && !loading && (
          <div className="mt-8">
            <p className="text-gray-500 text-sm mb-3">Not sure what to say? Try:</p>
            <div className="flex flex-wrap gap-2">
              {[
                "I'm feeling anxious about a big decision",
                "I woke up melancholy today",
                "I feel stuck and restless",
                "I'm grateful but uncertain about the future"
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="text-sm px-3 py-2 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
