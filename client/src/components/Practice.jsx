import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../App'
import {
  Home, BookOpen, GraduationCap, ChevronLeft, ChevronRight,
  CheckCircle2, Mic, MicOff, RotateCcw, ArrowLeft, Image
} from 'lucide-react'
import { similarityScore, containsExpected, wordCount } from '../utils/memoryCard'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

// Sumi-e color palette
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

export default function Practice() {
  const { authorId, workId } = useParams()
  const navigate = useNavigate()

  const [work, setWork] = useState(null)
  const [mode, setMode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [startTime, setStartTime] = useState(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [mastered, setMastered] = useState(new Set())

  const [testOrder, setTestOrder] = useState([])
  const [testIndex, setTestIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [isListening, setIsListening] = useState(false)

  const recognitionRef = useRef(null)

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

  const saveMastered = async (newMastered) => {
    try {
      await api('/analytics/mastered', {
        method: 'POST',
        body: JSON.stringify({ authorId, workId, masteredChunks: Array.from(newMastered) })
      })
    } catch (err) {
      console.error('Failed to save progress:', err)
    }
  }

  const recordSession = async (sessionScore) => {
    const duration = Math.round((Date.now() - startTime) / 1000)
    try {
      await api('/analytics/session', {
        method: 'POST',
        body: JSON.stringify({
          authorId, workId, mode, duration,
          chunksReviewed: mode === 'memorize' ? currentIndex + 1 : testOrder.length,
          correct: sessionScore?.correct || 0,
          total: sessionScore?.total || 0
        })
      })
    } catch (err) {
      console.error('Failed to record session:', err)
    }
  }

  const recordAttempt = async (chunkIndex, correct, userAns, expected) => {
    try {
      await api('/analytics/attempt', {
        method: 'POST',
        body: JSON.stringify({ authorId, workId, chunkIndex, correct, userAnswer: userAns, expectedAnswer: expected })
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
    if (mode === 'memorize') recordSession()
    setMode(null)
  }

  const baseStyle = {
    minHeight: '100vh',
    background: colors.paper,
    fontFamily: "'IBM Plex Sans', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    position: 'relative'
  }

  const cardStyle = {
    background: 'rgba(0,0,0,0.02)',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: '12px',
    padding: '2rem',
    width: '100%',
    maxWidth: '32rem'
  }

  const btnPrimary = {
    background: colors.crimson,
    color: colors.paper,
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    cursor: 'pointer',
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s'
  }

  const btnSecondary = {
    background: 'rgba(0,0,0,0.04)',
    color: colors.ink,
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    cursor: 'pointer',
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s'
  }

  if (loading) {
    return (
      <div style={baseStyle}>
        <div style={{ color: colors.crimson, fontFamily: "'Cormorant', serif", fontSize: '1.25rem' }}>Loading...</div>
      </div>
    )
  }

  if (!work) {
    return (
      <div style={baseStyle}>
        <div style={{ color: colors.crimson }}>Work not found</div>
      </div>
    )
  }

  // Mode Selection
  if (!mode) {
    return (
      <div style={baseStyle}>
        <Link to={`/author/${authorId}`} style={{ position: 'absolute', top: '1rem', left: '1rem', color: colors.muted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <ArrowLeft size={18} /> Back
        </Link>

        <h2 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.75rem', color: colors.ink, fontWeight: 400, marginBottom: '0.5rem' }}>"{work.title}"</h2>
        <p style={{ color: colors.muted, marginBottom: '0.25rem' }}>{work.character} • {work.source}</p>
        <p style={{ color: colors.faded, marginBottom: '2rem' }}>{work.act} • {work.chunks.length} chunks</p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => startMode('memorize')} style={{ ...cardStyle, cursor: 'pointer', textAlign: 'center', width: '12rem', border: '1px solid rgba(155,45,48,0.15)', background: 'rgba(155,45,48,0.03)' }}>
            <BookOpen size={40} style={{ color: colors.crimson, marginBottom: '0.75rem' }} />
            <div style={{ fontFamily: "'Cormorant', serif", fontSize: '1.2rem', color: colors.ink }}>Memorize</div>
            <div style={{ color: colors.muted, fontSize: '0.85rem', marginTop: '0.25rem' }}>Walk through chunks</div>
          </button>
          <button onClick={() => startMode('test')} style={{ ...cardStyle, cursor: 'pointer', textAlign: 'center', width: '12rem', border: '1px solid rgba(61,92,74,0.15)', background: 'rgba(61,92,74,0.03)' }}>
            <GraduationCap size={40} style={{ color: colors.forest, marginBottom: '0.75rem' }} />
            <div style={{ fontFamily: "'Cormorant', serif", fontSize: '1.2rem', color: colors.ink }}>Test</div>
            <div style={{ color: colors.muted, fontSize: '0.85rem', marginTop: '0.25rem' }}>Voice or type answers</div>
          </button>
          <Link to={`/visualize/${authorId}/${workId}`} style={{ ...cardStyle, textDecoration: 'none', textAlign: 'center', width: '12rem', border: '1px solid rgba(90,74,106,0.15)', background: 'rgba(90,74,106,0.03)' }}>
            <Image size={40} style={{ color: '#5a4a6a', marginBottom: '0.75rem' }} />
            <div style={{ fontFamily: "'Cormorant', serif", fontSize: '1.2rem', color: colors.ink }}>Visualize</div>
            <div style={{ color: colors.muted, fontSize: '0.85rem', marginTop: '0.25rem' }}>Text analysis & images</div>
          </Link>
        </div>

        {mastered.size > 0 && (
          <div style={{ marginTop: '2rem', color: colors.faded, fontSize: '0.9rem' }}>
            {mastered.size} of {work.chunks.length} chunks mastered
          </div>
        )}
      </div>
    )
  }

  // Memorize Mode
  if (mode === 'memorize') {
    const chunk = work.chunks[currentIndex]
    const isMastered = mastered.has(currentIndex)

    return (
      <div style={baseStyle}>
        <button onClick={exitPractice} style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <ArrowLeft size={18} /> Exit
        </button>

        <h2 style={{ color: colors.crimson, fontFamily: "'Cormorant', serif", fontSize: '1.1rem', marginBottom: '1rem' }}>"{work.title}"</h2>

        {/* Progress */}
        <div style={{ display: 'flex', gap: '3px', marginBottom: '1rem', maxWidth: '32rem', width: '100%' }}>
          {work.chunks.map((_, idx) => (
            <div
              key={idx}
              onClick={() => { setCurrentIndex(idx); setFlipped(false) }}
              style={{
                height: '6px',
                flex: 1,
                borderRadius: '3px',
                cursor: 'pointer',
                background: idx === currentIndex ? colors.crimson : mastered.has(idx) ? colors.forest : 'rgba(0,0,0,0.1)',
                transition: 'all 0.2s'
              }}
            />
          ))}
        </div>

        {/* Flashcard */}
        <div onClick={() => setFlipped(!flipped)} style={{ ...cardStyle, cursor: 'pointer', minHeight: '16rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderColor: isMastered ? 'rgba(61,92,74,0.3)' : 'rgba(0,0,0,0.08)', background: isMastered ? 'rgba(61,92,74,0.04)' : 'rgba(0,0,0,0.02)' }}>
          {!flipped ? (
            <>
              <p style={{ color: colors.crimson, fontSize: '0.85rem', marginBottom: '0.5rem' }}>What comes next?</p>
              <h3 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.5rem', color: colors.ink, lineHeight: 1.4 }}>"{chunk.front}..."</h3>
              <p style={{ color: colors.faded, marginTop: 'auto', fontSize: '0.8rem' }}>Click to reveal</p>
            </>
          ) : (
            <>
              <p style={{ color: colors.muted, fontSize: '0.9rem', marginBottom: '0.5rem' }}>{chunk.front}</p>
              <h3 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.5rem', color: colors.crimson, fontWeight: 500, lineHeight: 1.4 }}>{chunk.back}</h3>
            </>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setFlipped(false) }} disabled={currentIndex === 0} style={{ ...btnSecondary, opacity: currentIndex === 0 ? 0.4 : 1, padding: '0.75rem' }}>
            <ChevronLeft size={22} />
          </button>
          <button onClick={toggleMastered} style={{ ...btnPrimary, background: isMastered ? colors.forest : colors.crimson }}>
            <CheckCircle2 size={18} /> {isMastered ? 'Mastered' : 'Mark Mastered'}
          </button>
          <button onClick={() => { setCurrentIndex(Math.min(work.chunks.length - 1, currentIndex + 1)); setFlipped(false) }} disabled={currentIndex === work.chunks.length - 1} style={{ ...btnSecondary, opacity: currentIndex === work.chunks.length - 1 ? 0.4 : 1, padding: '0.75rem' }}>
            <ChevronRight size={22} />
          </button>
        </div>

        <p style={{ color: colors.faded, marginTop: '1rem', fontSize: '0.9rem' }}>{currentIndex + 1} / {work.chunks.length}</p>
      </div>
    )
  }

  // Test Mode
  if (mode === 'test') {
    const chunk = work.chunks[testOrder[testIndex]]

    return (
      <div style={baseStyle}>
        <button onClick={exitPractice} style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <ArrowLeft size={18} /> Exit
        </button>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', color: colors.muted, fontSize: '0.9rem' }}>
          Score: {score.correct}/{score.total}
        </div>

        <h2 style={{ color: colors.crimson, fontFamily: "'Cormorant', serif", fontSize: '1.1rem', marginBottom: '1.5rem' }}>"{work.title}" • Test</h2>

        <div style={{ ...cardStyle }}>
          <p style={{ color: colors.crimson, fontSize: '0.85rem', marginBottom: '0.5rem', textAlign: 'center' }}>Complete this line:</p>
          <h3 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.4rem', color: colors.ink, textAlign: 'center', marginBottom: '0.5rem', lineHeight: 1.4 }}>"{chunk.front}..."</h3>
          <p style={{ color: colors.faded, fontSize: '0.8rem', textAlign: 'center', marginBottom: '1rem' }}>({wordCount(chunk.back)} words expected)</p>

          {!showResult ? (
            <>
              <div style={{ position: 'relative' }}>
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type or speak your answer..."
                  style={{
                    width: '100%',
                    padding: '1rem',
                    paddingRight: '3.5rem',
                    background: 'rgba(0,0,0,0.03)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    resize: 'none',
                    height: '6rem',
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: '0.95rem',
                    color: colors.ink,
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  onClick={isListening ? stopListening : startListening}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '0.75rem',
                    padding: '0.5rem',
                    borderRadius: '50%',
                    border: 'none',
                    background: isListening ? '#d64545' : colors.crimson,
                    cursor: 'pointer'
                  }}
                >
                  {isListening ? <MicOff size={18} style={{ color: 'white' }} /> : <Mic size={18} style={{ color: 'white' }} />}
                </button>
              </div>
              {isListening && <p style={{ color: colors.crimson, textAlign: 'center', marginTop: '0.5rem', fontSize: '0.9rem' }}>Listening...</p>}
              {!SpeechRecognition && <p style={{ color: colors.gold, textAlign: 'center', marginTop: '0.5rem', fontSize: '0.85rem' }}>Voice input not available</p>}
              <button onClick={checkAnswer} disabled={!userAnswer.trim()} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', marginTop: '1rem', opacity: !userAnswer.trim() ? 0.5 : 1 }}>
                Check Answer
              </button>
            </>
          ) : (
            <>
              <div style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1rem', background: isCorrect ? 'rgba(61,92,74,0.1)' : 'rgba(155,45,48,0.1)', border: `1px solid ${isCorrect ? 'rgba(61,92,74,0.3)' : 'rgba(155,45,48,0.3)'}` }}>
                <p style={{ fontWeight: 500, color: isCorrect ? colors.forest : colors.crimson }}>{isCorrect ? '✓ Correct!' : '✗ Not quite'}</p>
                <p style={{ color: colors.muted, marginTop: '0.5rem', fontSize: '0.9rem' }}>Your answer: "{userAnswer}"</p>
                <p style={{ color: colors.ink, marginTop: '0.5rem', fontSize: '0.9rem' }}>Correct: <span style={{ color: colors.crimson, fontWeight: 500 }}>{chunk.back}</span></p>
              </div>
              <button onClick={nextTest} style={{ ...btnPrimary, width: '100%', justifyContent: 'center' }}>
                {testIndex < testOrder.length - 1 ? 'Next Question' : 'See Results'}
              </button>
            </>
          )}
        </div>

        <p style={{ color: colors.faded, marginTop: '1rem', fontSize: '0.9rem' }}>Question {testIndex + 1} / {testOrder.length}</p>
      </div>
    )
  }

  // Results
  if (mode === 'results') {
    const pct = Math.round((score.correct / score.total) * 100)

    return (
      <div style={baseStyle}>
        <h2 style={{ fontFamily: "'Cormorant', serif", fontSize: '2rem', color: colors.ink, fontWeight: 400, marginBottom: '0.5rem' }}>Test Complete!</h2>
        <p style={{ color: colors.muted, marginBottom: '1.5rem' }}>"{work.title}"</p>

        <div style={{ fontFamily: "'Cormorant', serif", fontSize: '4rem', color: colors.crimson, marginBottom: '0.5rem' }}>{pct}%</div>
        <p style={{ color: colors.muted, marginBottom: '2rem' }}>{score.correct} of {score.total} correct</p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => startMode('test')} style={btnPrimary}>
            <RotateCcw size={18} /> Try Again
          </button>
          <button onClick={() => startMode('memorize')} style={btnSecondary}>
            <BookOpen size={18} /> Practice More
          </button>
          <Link to={`/author/${authorId}`} style={{ ...btnSecondary, textDecoration: 'none' }}>
            <Home size={18} /> Back to Works
          </Link>
        </div>
      </div>
    )
  }

  return null
}
