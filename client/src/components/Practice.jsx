import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../App'
import {
  Home, BookOpen, GraduationCap, ChevronLeft, ChevronRight,
  CheckCircle2, Mic, MicOff, RotateCcw, ArrowLeft, Image
} from 'lucide-react'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

const normalizeText = (text) => {
  return text.toLowerCase()
    .replace(/[''\']/g, '')  // Remove all apostrophes for comparison
    .replace(/[—–-]/g, '-')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const similarityScore = (str1, str2) => {
  const s1 = normalizeText(str1)
  const s2 = normalizeText(str2)
  const words1 = s1.split(' ')
  const words2 = s2.split(' ')
  let matches = 0
  words1.forEach(w1 => {
    if (words2.some(w2 => w2.includes(w1) || w1.includes(w2))) matches++
  })
  return matches / Math.max(words1.length, words2.length)
}

// Check if answer contains the expected text (user typed more than needed)
const containsExpected = (userAnswer, expected) => {
  const normUser = normalizeText(userAnswer)
  const normExpected = normalizeText(expected)
  return normUser.includes(normExpected) || normUser.startsWith(normExpected)
}

const wordCount = (text) => text.trim().split(/\s+/).length

export default function Practice() {
  const { authorId, workId } = useParams()
  const navigate = useNavigate()
  
  const [work, setWork] = useState(null)
  const [mode, setMode] = useState(null) // 'memorize' | 'test'
  const [loading, setLoading] = useState(true)
  const [startTime, setStartTime] = useState(null)
  
  // Memorize mode state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [mastered, setMastered] = useState(new Set())
  
  // Test mode state
  const [testOrder, setTestOrder] = useState([])
  const [testIndex, setTestIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [isListening, setIsListening] = useState(false)
  
  const recognitionRef = useRef(null)

  // Load work data and progress
  useEffect(() => {
    Promise.all([
      api(`/authors/${authorId}/works/${workId}`),
      api('/analytics/progress')
    ])
      .then(([workData, progressData]) => {
        setWork(workData)
        const key = `${authorId}/${workId}`
        const savedProgress = progressData.progress?.[key]
        if (savedProgress?.mastered) {
          setMastered(new Set(savedProgress.mastered))
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [authorId, workId])

  // Initialize speech recognition
  useEffect(() => {
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setUserAnswer(transcript)
        setIsListening(false)
      }
      recognitionRef.current.onerror = () => setIsListening(false)
      recognitionRef.current.onend = () => setIsListening(false)
    }
  }, [])

  // Save mastered progress
  const saveMastered = async (newMastered) => {
    try {
      await api('/analytics/mastered', {
        method: 'POST',
        body: JSON.stringify({
          authorId,
          workId,
          masteredChunks: Array.from(newMastered)
        })
      })
    } catch (err) {
      console.error('Failed to save progress:', err)
    }
  }

  // Record session
  const recordSession = async (sessionScore) => {
    const duration = Math.round((Date.now() - startTime) / 1000)
    try {
      await api('/analytics/session', {
        method: 'POST',
        body: JSON.stringify({
          authorId,
          workId,
          mode,
          duration,
          chunksReviewed: mode === 'memorize' ? currentIndex + 1 : testOrder.length,
          correct: sessionScore?.correct || 0,
          total: sessionScore?.total || 0
        })
      })
    } catch (err) {
      console.error('Failed to record session:', err)
    }
  }

  // Record individual test attempt
  const recordAttempt = async (chunkIndex, correct, userAns, expected) => {
    try {
      await api('/analytics/attempt', {
        method: 'POST',
        body: JSON.stringify({
          authorId,
          workId,
          chunkIndex,
          correct,
          userAnswer: userAns,
          expectedAnswer: expected
        })
      })
    } catch (err) {
      console.error('Failed to record attempt:', err)
    }
  }

  const startMode = (m) => {
    setMode(m)
    setStartTime(Date.now())
    setCurrentIndex(0)
    setFlipped(false)
    setScore({ correct: 0, total: 0 })
    
    if (m === 'test') {
      const order = [...Array(work.chunks.length).keys()].sort(() => Math.random() - 0.5)
      setTestOrder(order)
      setTestIndex(0)
      setUserAnswer('')
      setShowResult(false)
    }
  }

  const toggleMastered = () => {
    const newMastered = new Set(mastered)
    if (newMastered.has(currentIndex)) {
      newMastered.delete(currentIndex)
    } else {
      newMastered.add(currentIndex)
    }
    setMastered(newMastered)
    saveMastered(newMastered)
  }

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setUserAnswer('')
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const checkAnswer = () => {
    const chunk = work.chunks[testOrder[testIndex]]
    const similarity = similarityScore(userAnswer, chunk.back)
    // Also accept if user typed the correct text (possibly with more)
    const hasExpected = containsExpected(userAnswer, chunk.back)
    const correct = similarity >= 0.5 || hasExpected
    setIsCorrect(correct)
    setShowResult(true)
    const newScore = { correct: score.correct + (correct ? 1 : 0), total: score.total + 1 }
    setScore(newScore)
    recordAttempt(testOrder[testIndex], correct, userAnswer, chunk.back)
  }

  const nextTest = () => {
    if (testIndex < testOrder.length - 1) {
      setTestIndex(testIndex + 1)
      setUserAnswer('')
      setShowResult(false)
    } else {
      recordSession(score)
      setMode('results')
    }
  }

  const exitPractice = () => {
    if (mode === 'memorize') {
      recordSession()
    }
    setMode(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-amber-400">Loading...</div>
      </div>
    )
  }

  if (!work) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400">Work not found</div>
      </div>
    )
  }

  // Mode Selection
  if (!mode) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
        <Link 
          to={`/author/${authorId}`}
          className="absolute top-4 left-4 text-gray-400 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft size={20} /> Back
        </Link>
        
        <h2 className="text-2xl font-bold text-white mb-2">"{work.title}"</h2>
        <p className="text-gray-400 mb-2">{work.character} • {work.source}</p>
        <p className="text-gray-500 mb-8">{work.act} • {work.chunks.length} chunks</p>
        
        <div className="flex gap-4 flex-wrap justify-center">
          <button
            onClick={() => startMode('memorize')}
            className="flex flex-col items-center gap-3 p-8 bg-gray-800 hover:bg-gray-700 rounded-2xl transition-all w-48"
          >
            <BookOpen size={48} className="text-amber-400" />
            <span className="text-white font-medium text-lg">Memorize</span>
            <span className="text-gray-400 text-sm text-center">Walk through chunks</span>
          </button>
          <button
            onClick={() => startMode('test')}
            className="flex flex-col items-center gap-3 p-8 bg-gray-800 hover:bg-gray-700 rounded-2xl transition-all w-48"
          >
            <GraduationCap size={48} className="text-green-400" />
            <span className="text-white font-medium text-lg">Test</span>
            <span className="text-gray-400 text-sm text-center">Voice or type answers</span>
          </button>
          <Link
            to={`/visualize/${authorId}/${workId}`}
            className="flex flex-col items-center gap-3 p-8 bg-gray-800 hover:bg-gray-700 rounded-2xl transition-all w-48"
          >
            <Image size={48} className="text-purple-400" />
            <span className="text-white font-medium text-lg">Visualize</span>
            <span className="text-gray-400 text-sm text-center">Text analysis & images</span>
          </Link>
        </div>
        
        <div className="mt-8 text-gray-500 text-sm">
          {mastered.size > 0 && `${mastered.size} of ${work.chunks.length} chunks mastered`}
        </div>
      </div>
    )
  }

  // Memorize Mode
  if (mode === 'memorize') {
    const chunk = work.chunks[currentIndex]
    const isMastered = mastered.has(currentIndex)

    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
        <button 
          onClick={exitPractice}
          className="absolute top-4 left-4 text-gray-400 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft size={20} /> Exit
        </button>
        
        <h2 className="text-amber-400 text-lg mb-4">"{work.title}"</h2>
        
        {/* Progress bar */}
        <div className="flex gap-1 mb-4 max-w-xl w-full">
          {work.chunks.map((_, idx) => (
            <div
              key={idx}
              onClick={() => { setCurrentIndex(idx); setFlipped(false) }}
              className={`h-2 flex-1 rounded cursor-pointer transition-all ${
                idx === currentIndex ? 'bg-amber-400' : mastered.has(idx) ? 'bg-green-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Flashcard */}
        <div
          onClick={() => setFlipped(!flipped)}
          className={`flip-card w-full max-w-xl h-64 cursor-pointer`}
        >
          <div className={`flip-card-inner w-full h-full ${flipped ? 'flipped' : ''}`}>
            {/* Front */}
            <div className={`flip-card-front absolute inset-0 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 ${isMastered ? 'bg-green-900' : 'bg-gray-800'}`}>
              <p className="text-amber-300 text-sm mb-2">What comes next?</p>
              <h3 className="text-2xl text-white text-center leading-relaxed">"{chunk.front}..."</h3>
              <p className="text-gray-500 mt-auto text-sm">Click to reveal</p>
            </div>
            
            {/* Back */}
            <div className={`flip-card-back absolute inset-0 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 ${isMastered ? 'bg-green-900' : 'bg-gray-800'}`}>
              <p className="text-gray-400 text-center mb-2">{chunk.front}</p>
              <h3 className="text-2xl text-amber-400 text-center font-bold leading-relaxed">{chunk.back}</h3>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-6">
          <button 
            onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setFlipped(false) }} 
            disabled={currentIndex === 0} 
            className="p-3 bg-gray-800 rounded-full disabled:opacity-50 text-white hover:bg-gray-700"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={toggleMastered}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${isMastered ? 'bg-green-600' : 'bg-gray-800 hover:bg-gray-700'} text-white`}
          >
            <CheckCircle2 size={18} /> {isMastered ? 'Mastered' : 'Mark Mastered'}
          </button>
          <button 
            onClick={() => { setCurrentIndex(Math.min(work.chunks.length - 1, currentIndex + 1)); setFlipped(false) }} 
            disabled={currentIndex === work.chunks.length - 1} 
            className="p-3 bg-gray-800 rounded-full disabled:opacity-50 text-white hover:bg-gray-700"
          >
            <ChevronRight size={24} />
          </button>
        </div>
        
        <p className="text-gray-500 mt-4">{currentIndex + 1} / {work.chunks.length}</p>
      </div>
    )
  }

  // Test Mode
  if (mode === 'test') {
    const chunk = work.chunks[testOrder[testIndex]]

    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
        <button 
          onClick={exitPractice}
          className="absolute top-4 left-4 text-gray-400 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft size={20} /> Exit
        </button>
        
        <div className="absolute top-4 right-4 text-gray-400">
          Score: {score.correct}/{score.total}
        </div>
        
        <h2 className="text-amber-400 text-lg mb-6">"{work.title}" • Test Mode</h2>
        
        <div className="w-full max-w-xl bg-gray-800 rounded-2xl p-8 mb-6">
          <p className="text-amber-300 text-sm mb-2 text-center">Complete this line:</p>
          <h3 className="text-2xl text-white text-center mb-4 leading-relaxed">"{chunk.front}..."</h3>
          <p className="text-gray-500 text-sm text-center mb-4">({wordCount(chunk.back)} words expected)</p>
          
          {!showResult ? (
            <>
              <div className="relative">
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type or speak your answer..."
                  className="w-full p-4 bg-gray-700 text-white rounded-xl resize-none h-24 pr-14"
                />
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`absolute right-3 top-3 p-2 rounded-full transition-all ${
                    isListening 
                      ? 'bg-red-500 listening-pulse' 
                      : 'bg-amber-600 hover:bg-amber-500'
                  }`}
                >
                  {isListening ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
                </button>
              </div>
              {isListening && <p className="text-amber-400 text-center mt-2 animate-pulse">Listening...</p>}
              {!SpeechRecognition && (
                <p className="text-yellow-500 text-sm text-center mt-2">Voice input not available in this browser</p>
              )}
              <button
                onClick={checkAnswer}
                disabled={!userAnswer.trim()}
                className="w-full mt-4 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
              >
                Check Answer
              </button>
            </>
          ) : (
            <>
              <div className={`p-4 rounded-xl mb-4 ${isCorrect ? 'bg-green-900' : 'bg-red-900'}`}>
                <p className={`font-medium ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {isCorrect ? '✓ Correct!' : '✗ Not quite'}
                </p>
                <p className="text-gray-300 mt-2">Your answer: "{userAnswer}"</p>
                <p className="text-white mt-2">
                  Correct: <span className="text-amber-400 font-medium">{chunk.back}</span>
                </p>
              </div>
              <button 
                onClick={nextTest} 
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-medium transition-colors"
              >
                {testIndex < testOrder.length - 1 ? 'Next Question' : 'See Results'}
              </button>
            </>
          )}
        </div>
        
        <p className="text-gray-500">Question {testIndex + 1} / {testOrder.length}</p>
      </div>
    )
  }

  // Results
  if (mode === 'results') {
    const pct = Math.round((score.correct / score.total) * 100)
    
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
        <h2 className="text-3xl font-bold text-white mb-2">Test Complete!</h2>
        <p className="text-gray-400 mb-6">"{work.title}"</p>
        
        <div className="text-6xl font-bold text-amber-400 mb-2">{pct}%</div>
        <p className="text-gray-400 mb-8">{score.correct} of {score.total} correct</p>
        
        <div className="flex gap-4 flex-wrap justify-center">
          <button 
            onClick={() => startMode('test')} 
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl flex items-center gap-2 transition-colors"
          >
            <RotateCcw size={18} /> Try Again
          </button>
          <button 
            onClick={() => startMode('memorize')} 
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl flex items-center gap-2 transition-colors"
          >
            <BookOpen size={18} /> Practice More
          </button>
          <Link 
            to={`/author/${authorId}`}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl flex items-center gap-2 transition-colors"
          >
            <Home size={18} /> Back to Works
          </Link>
        </div>
      </div>
    )
  }

  return null
}
