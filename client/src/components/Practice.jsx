import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../App'
import {
  Home, BookOpen, GraduationCap, ChevronLeft, ChevronRight,
  CheckCircle2, Mic, MicOff, RotateCcw, ArrowLeft, Image,
  Sparkles, Loader2, Check, Edit3, Map, Square, Shuffle, Target
} from 'lucide-react'
import { similarityScore, containsExpected, wordCount, getBeatText, getBeatPrompt, getBeatCue } from '../utils/memoryCard'
import BeatEditor from './BeatEditor'
import useIsMobile from '../hooks/useIsMobile'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

// Memory palace room names
const ROOMS = [
  'Foyer', 'Great Hall', 'Parlor', 'Library', 'Study', 'Gallery',
  'Staircase', 'Ballroom', 'Tower', 'Chapel', 'Garden', 'Cellar',
  'Kitchen', 'Attic', 'Conservatory', 'Drawing Room', 'Armory',
  'Crypt', 'Observatory', 'Throne Room', 'Courtyard', 'Dungeon',
  'Balcony', 'Vestibule', 'Antechamber', 'Solar', 'Scullery',
  'Buttery', 'Minstrel Gallery', 'Keep', 'Gatehouse', 'Cloister'
]

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
  const isMobile = useIsMobile()

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
  const [score, setScore] = useState({ points: 0, total: 0 })
  const [lastLikert, setLastLikert] = useState(0)
  const [isListening, setIsListening] = useState(false)

  // Tab state within memorize mode
  const [memTab, setMemTab] = useState('learn') // 'learn' | 'drill' | 'tools'

  // Drill mode state
  const [drillChunks, setDrillChunks] = useState([]) // weighted queue of chunk indices
  const [drillIndex, setDrillIndex] = useState(0)
  const [drillRevealed, setDrillRevealed] = useState(false)
  const [drillStats, setDrillStats] = useState({}) // { chunkIndex: { attempts, errors, lastSeen } }
  const [drillScore, setDrillScore] = useState({ correct: 0, struggled: 0, missed: 0 })
  const [drillAnswer, setDrillAnswer] = useState('')
  const [drillListening, setDrillListening] = useState(false)
  const drillRecognitionRef = useRef(null)
  const [wordPictures, setWordPictures] = useState({ generated: {}, selected: {}, rooms: {} })
  const [generatingPicture, setGeneratingPicture] = useState(false)
  const [editingPicture, setEditingPicture] = useState(false)
  const [editText, setEditText] = useState('')

  // Beat mode state
  const [practiceUnit, setPracticeUnit] = useState('lines') // 'lines' | 'beats'
  const [beats, setBeats] = useState([]) // resolved beats array
  const [defaultBeats, setDefaultBeats] = useState([]) // from work data (for reset)
  const [showBeatEditor, setShowBeatEditor] = useState(false)
  const [generatingBeats, setGeneratingBeats] = useState(false)
  const [masteredBeats, setMasteredBeats] = useState(new Set())

  // Recite mode state
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [reciteAnalyzing, setReciteAnalyzing] = useState(false)
  const [reciteResult, setReciteResult] = useState(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)

  const recognitionRef = useRef(null)

  useEffect(() => {
    Promise.all([
      api(`/authors/${authorId}/works/${workId}`),
      api('/analytics/progress'),
      api(`/visualize/word-pictures/${authorId}/${workId}`),
      api(`/beats/${authorId}/${workId}`),
      api('/analytics/preferences')
    ])
      .then(([workData, progressData, vizData, beatsData, prefs]) => {
        setWork(workData)
        const key = `${authorId}/${workId}`
        const savedProgress = progressData.progress?.[key]
        if (savedProgress?.mastered) {
          setMastered(new Set(savedProgress.mastered))
        }
        if (savedProgress?.masteredBeats) {
          setMasteredBeats(new Set(savedProgress.masteredBeats))
        }
        // Load word pictures
        if (vizData.wordPictures) {
          setWordPictures({
            generated: vizData.wordPictures.generated || {},
            selected: vizData.wordPictures.selected || {},
            rooms: vizData.wordPictures.rooms || {}
          })
        }
        // Load beats
        if (beatsData.beats) {
          setBeats(beatsData.beats)
          // Store defaults from work data (not user overrides)
          if (beatsData.source === 'user' && workData.beats) {
            setDefaultBeats(workData.beats)
          } else {
            setDefaultBeats(beatsData.beats)
          }
        }
        // Load practice unit preference
        const unitPref = prefs?.practiceUnit?.[key]
        if (unitPref && (beatsData.beats || unitPref === 'lines')) {
          setPracticeUnit(unitPref)
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

  // Compute drill stats from attempts when work loads
  useEffect(() => {
    if (!work) return
    api('/analytics/progress').then(analytics => {
      const key = `${authorId}/${workId}`
      const workProgress = analytics.progress?.[key]
      if (!workProgress?.attempts) return

      // Build stats per chunk
      const stats = {}
      for (let i = 0; i < work.chunks.length; i++) {
        stats[i] = { attempts: 0, errors: 0, lastSeen: null }
      }
      workProgress.attempts.forEach(a => {
        if (stats[a.chunkIndex]) {
          stats[a.chunkIndex].attempts++
          if (!a.correct) stats[a.chunkIndex].errors++
          stats[a.chunkIndex].lastSeen = a.timestamp
        }
      })
      setDrillStats(stats)
    }).catch(console.error)
  }, [work, authorId, workId])

  // Initialize drill queue with weighted selection
  const initDrillQueue = () => {
    if (!work) return
    const now = Date.now()

    if (practiceUnit === 'beats' && beats.length > 0) {
      // Beat-mode drill: weight per beat (aggregate chunk stats)
      const weights = beats.map((beat) => {
        let totalAttempts = 0, totalErrors = 0, oldestSeen = null
        for (let c = beat.startChunk; c <= beat.endChunk; c++) {
          const stat = drillStats[c] || { attempts: 0, errors: 0, lastSeen: null }
          totalAttempts += stat.attempts
          totalErrors += stat.errors
          if (stat.lastSeen && (!oldestSeen || new Date(stat.lastSeen) < oldestSeen)) {
            oldestSeen = new Date(stat.lastSeen)
          }
        }
        const errorRate = totalAttempts > 0 ? totalErrors / totalAttempts : 0.5
        const daysSince = oldestSeen
          ? Math.min(30, (now - oldestSeen.getTime()) / (1000 * 60 * 60 * 24))
          : 15
        const coverageBoost = totalAttempts === 0 ? 1 : 0
        return (errorRate * 2) + (daysSince / 30) + coverageBoost + 0.1
      })

      const queue = []
      const totalRounds = Math.min(beats.length, 10)
      const weightsCopy = [...weights]

      for (let r = 0; r < totalRounds; r++) {
        const totalWeight = weightsCopy.reduce((sum, w) => sum + w, 0)
        let rand = Math.random() * totalWeight
        for (let i = 0; i < weightsCopy.length; i++) {
          rand -= weightsCopy[i]
          if (rand <= 0) {
            queue.push(i)
            weightsCopy[i] *= 0.3
            break
          }
        }
      }
      setDrillChunks(queue)
    } else {
      // Line-mode drill (existing logic)
      const weights = work.chunks.map((_, idx) => {
        const stat = drillStats[idx] || { attempts: 0, errors: 0, lastSeen: null }
        const errorRate = stat.attempts > 0 ? stat.errors / stat.attempts : 0.5
        const daysSince = stat.lastSeen
          ? Math.min(30, (now - new Date(stat.lastSeen).getTime()) / (1000 * 60 * 60 * 24))
          : 15
        const coverageBoost = stat.attempts === 0 ? 1 : 0
        return (errorRate * 2) + (daysSince / 30) + coverageBoost + 0.1
      })

      const queue = []
      const available = work.chunks.map((_, i) => i)
      const totalRounds = Math.min(work.chunks.length, 10)

      for (let r = 0; r < totalRounds; r++) {
        const totalWeight = available.reduce((sum, i) => sum + weights[i], 0)
        let rand = Math.random() * totalWeight
        for (const i of available) {
          rand -= weights[i]
          if (rand <= 0) {
            queue.push(i)
            weights[i] *= 0.3
            break
          }
        }
      }
      setDrillChunks(queue)
    }

    setDrillIndex(0)
    setDrillRevealed(false)
    setDrillScore({ correct: 0, struggled: 0, missed: 0 })
    setDrillAnswer('')
  }

  // Speech recognition for drill
  const startDrillListening = () => {
    if (!SpeechRecognition) return
    if (!drillRecognitionRef.current) {
      drillRecognitionRef.current = new SpeechRecognition()
      drillRecognitionRef.current.continuous = false
      drillRecognitionRef.current.interimResults = false
      drillRecognitionRef.current.lang = 'en-US'
      drillRecognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setDrillAnswer(transcript)
        setDrillListening(false)
      }
      drillRecognitionRef.current.onerror = () => setDrillListening(false)
      drillRecognitionRef.current.onend = () => setDrillListening(false)
    }
    setDrillAnswer('')
    setDrillListening(true)
    drillRecognitionRef.current.start()
  }

  const stopDrillListening = () => {
    if (drillRecognitionRef.current && drillListening) {
      drillRecognitionRef.current.stop()
      setDrillListening(false)
    }
  }

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
          authorId, workId, mode, duration, practiceUnit,
          chunksReviewed: mode === 'memorize' ? currentIndex + 1 : testOrder.length,
          correct: sessionScore?.points || 0,
          total: sessionScore?.total || 0
        })
      })
    } catch (err) {
      console.error('Failed to record session:', err)
    }
  }

  const recordAttempt = async (index, correct, userAns, expected, likertScore) => {
    const payload = { authorId, workId, correct, userAnswer: userAns, expectedAnswer: expected }
    if (likertScore != null) payload.likert = likertScore
    if (practiceUnit === 'beats') {
      payload.beatIndex = index
    } else {
      payload.chunkIndex = index
    }
    try {
      await api('/analytics/attempt', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
    } catch (err) {
      console.error('Failed to record attempt:', err)
    }
  }

  const toLikert = (raw, fine) => fine
    ? Math.round(raw * 10) / 10   // beats: 0.1 steps — 1.0 requires ≥0.95
    : Math.round(raw * 5) / 5     // lines: 0.2 steps — 0, 0.2, 0.4, 0.6, 0.8, 1.0

  const likertColor = (l) =>
    l >= 1.0 ? colors.forest : l >= 0.8 ? colors.blue : l >= 0.6 ? colors.gold : colors.crimson

  const startMode = (m) => {
    setMode(m)
    setStartTime(Date.now())
    setCurrentIndex(0)
    setFlipped(false)
    setScore({ points: 0, total: 0 })
    setLastLikert(0)
    if (m === 'test') {
      const itemCount = practiceUnit === 'beats' ? beats.length : work.chunks.length
      const order = [...Array(itemCount).keys()].sort(() => Math.random() - 0.5)
      setTestOrder(order)
      setTestIndex(0)
      setUserAnswer('')
      setShowResult(false)
    }
  }

  // Beat-specific helpers
  const generateBeatsForWork = async () => {
    setGeneratingBeats(true)
    try {
      const result = await api(`/beats/generate/${authorId}/${workId}`, { method: 'POST' })
      if (result.success && result.beats) {
        setBeats(result.beats)
        setDefaultBeats(result.beats)
      }
    } catch (err) {
      console.error('Failed to generate beats:', err)
    } finally {
      setGeneratingBeats(false)
    }
  }

  const saveBeatOverrides = async (newBeats) => {
    setBeats(newBeats)
    setShowBeatEditor(false)
    try {
      await api('/analytics/beat-overrides', {
        method: 'POST',
        body: JSON.stringify({ authorId, workId, beats: newBeats })
      })
    } catch (err) {
      console.error('Failed to save beat overrides:', err)
    }
  }

  const togglePracticeUnit = async (unit) => {
    setPracticeUnit(unit)
    const key = `${authorId}/${workId}`
    try {
      await api('/analytics/preferences', {
        method: 'POST',
        body: JSON.stringify({ key: `practiceUnit.${key}`, value: unit })
      })
    } catch (err) {
      console.error('Failed to save preference:', err)
    }
  }

  const saveMasteredBeatsToServer = async (newMasteredBeats) => {
    try {
      await api('/analytics/mastered', {
        method: 'POST',
        body: JSON.stringify({ authorId, workId, masteredBeats: Array.from(newMasteredBeats) })
      })
    } catch (err) {
      console.error('Failed to save mastered beats:', err)
    }
  }

  const toggleMasteredBeat = () => {
    const newMasteredBeats = new Set(masteredBeats)
    if (newMasteredBeats.has(currentIndex)) {
      newMasteredBeats.delete(currentIndex)
    } else {
      newMasteredBeats.add(currentIndex)
    }
    setMasteredBeats(newMasteredBeats)
    saveMasteredBeatsToServer(newMasteredBeats)
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

  // Generate word picture for current chunk
  const generatePicture = async () => {
    setGeneratingPicture(true)
    try {
      const result = await api(`/visualize/generate-chunk/${authorId}/${workId}/${currentIndex}`, {
        method: 'POST'
      })
      if (result.success && result.options) {
        setWordPictures(prev => ({
          ...prev,
          generated: { ...prev.generated, [currentIndex]: result.options }
        }))
      }
    } catch (err) {
      console.error('Failed to generate picture:', err)
    } finally {
      setGeneratingPicture(false)
    }
  }

  // Select a word picture option
  const selectPicture = async (option) => {
    const newSelected = { ...wordPictures.selected, [currentIndex]: option }
    setWordPictures(prev => ({ ...prev, selected: newSelected }))

    // Auto-assign room if not set
    const room = wordPictures.rooms[currentIndex] || ROOMS[currentIndex % ROOMS.length]

    try {
      await api('/visualize/save-chunk', {
        method: 'POST',
        body: JSON.stringify({
          authorId, workId,
          chunkIndex: currentIndex,
          selected: option,
          room
        })
      })
    } catch (err) {
      console.error('Failed to save picture:', err)
    }
  }

  // Save custom edited picture
  const saveEditedPicture = async () => {
    if (!editText.trim()) return
    await selectPicture(editText.trim())
    setEditingPicture(false)
    setEditText('')
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

  // --- Recite mode functions ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      })
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType })
        stream.getTracks().forEach(t => t.stop())
        analyzeRecitation(blob)
      }
      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setRecording(true)
      setRecordingTime(0)
      setReciteResult(null)
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch (err) {
      console.error('Mic access denied:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
    clearInterval(recordingTimerRef.current)
  }

  const analyzeRecitation = async (blob) => {
    setReciteAnalyzing(true)
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recitation.webm')
      const key = localStorage.getItem('userKey')
      const res = await fetch(`/api/recite/transcribe/${authorId}/${workId}`, {
        method: 'POST',
        headers: { 'X-User-Key': key },
        body: formData
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error)
      }
      setReciteResult(await res.json())
    } catch (err) {
      console.error('Recitation analysis failed:', err)
      setReciteResult({ error: err.message })
    } finally {
      setReciteAnalyzing(false)
    }
  }

  const formatRecordingTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const checkAnswer = () => {
    const itemIdx = testOrder[testIndex]
    let expected
    if (practiceUnit === 'beats') {
      expected = getBeatText(work.chunks, beats[itemIdx])
    } else {
      expected = work.chunks[itemIdx].back
    }
    const similarity = similarityScore(userAnswer, expected)
    const hasExpected = practiceUnit === 'beats' ? false : containsExpected(userAnswer, expected)
    const likert = hasExpected ? 1.0 : toLikert(similarity, practiceUnit === 'beats')
    const correct = practiceUnit === 'beats' ? likert >= 0.8 : likert >= 1.0
    setIsCorrect(correct)
    setLastLikert(likert)
    setShowResult(true)
    const newScore = { points: Math.round((score.points + likert) * 100) / 100, total: score.total + 1 }
    setScore(newScore)
    recordAttempt(itemIdx, correct, userAnswer, expected, likert)
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
    padding: isMobile ? '1rem' : '1.5rem',
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
        <p style={{ color: colors.faded, marginBottom: '1rem' }}>{work.act} • {work.chunks.length} chunks</p>

        {/* Practice Unit Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: colors.faded }}>Practice by:</span>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.04)', borderRadius: '6px', padding: '0.2rem' }}>
            <button
              onClick={() => togglePracticeUnit('lines')}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
                background: practiceUnit === 'lines' ? colors.crimson : 'transparent',
                color: practiceUnit === 'lines' ? colors.paper : colors.muted,
                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.8rem'
              }}
            >
              Lines
            </button>
            {beats.length > 0 ? (
              <button
                onClick={() => togglePracticeUnit('beats')}
                style={{
                  padding: '0.35rem 0.75rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
                  background: practiceUnit === 'beats' ? colors.blue : 'transparent',
                  color: practiceUnit === 'beats' ? colors.paper : colors.muted,
                  fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.8rem'
                }}
              >
                Beats ({beats.length})
              </button>
            ) : (
              <button
                onClick={generateBeatsForWork}
                disabled={generatingBeats}
                style={{
                  padding: '0.35rem 0.75rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
                  background: 'transparent', color: colors.faded,
                  fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.8rem',
                  opacity: generatingBeats ? 0.5 : 1
                }}
              >
                {generatingBeats ? 'Generating...' : 'Generate Beats'}
              </button>
            )}
          </div>
          {beats.length > 0 && (
            <button
              onClick={() => setShowBeatEditor(true)}
              style={{
                background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px',
                padding: '0.35rem 0.5rem', cursor: 'pointer', color: colors.faded,
                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.75rem'
              }}
            >
              Edit Beats
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => startMode('memorize')} style={{ ...cardStyle, cursor: 'pointer', textAlign: 'center', width: isMobile ? '100%' : '12rem', border: '1px solid rgba(155,45,48,0.15)', background: 'rgba(155,45,48,0.03)' }}>
            <BookOpen size={40} style={{ color: colors.crimson, marginBottom: '0.75rem' }} />
            <div style={{ fontFamily: "'Cormorant', serif", fontSize: '1.2rem', color: colors.ink }}>Memorize</div>
            <div style={{ color: colors.muted, fontSize: '0.85rem', marginTop: '0.25rem' }}>Walk through chunks</div>
          </button>
          <button onClick={() => startMode('test')} style={{ ...cardStyle, cursor: 'pointer', textAlign: 'center', width: isMobile ? '100%' : '12rem', border: '1px solid rgba(61,92,74,0.15)', background: 'rgba(61,92,74,0.03)' }}>
            <GraduationCap size={40} style={{ color: colors.forest, marginBottom: '0.75rem' }} />
            <div style={{ fontFamily: "'Cormorant', serif", fontSize: '1.2rem', color: colors.ink }}>Test</div>
            <div style={{ color: colors.muted, fontSize: '0.85rem', marginTop: '0.25rem' }}>Voice or type answers</div>
          </button>
          <button onClick={() => startMode('recite')} style={{ ...cardStyle, cursor: 'pointer', textAlign: 'center', width: isMobile ? '100%' : '12rem', border: '1px solid rgba(196,163,90,0.15)', background: 'rgba(196,163,90,0.03)' }}>
            <Mic size={40} style={{ color: colors.gold, marginBottom: '0.75rem' }} />
            <div style={{ fontFamily: "'Cormorant', serif", fontSize: '1.2rem', color: colors.ink }}>Recite</div>
            <div style={{ color: colors.muted, fontSize: '0.85rem', marginTop: '0.25rem' }}>Full poem recitation</div>
          </button>
          <Link to={`/visualize/${authorId}/${workId}`} style={{ ...cardStyle, textDecoration: 'none', textAlign: 'center', width: isMobile ? '100%' : '12rem', border: '1px solid rgba(90,74,106,0.15)', background: 'rgba(90,74,106,0.03)' }}>
            <Image size={40} style={{ color: '#5a4a6a', marginBottom: '0.75rem' }} />
            <div style={{ fontFamily: "'Cormorant', serif", fontSize: '1.2rem', color: colors.ink }}>Visualize</div>
            <div style={{ color: colors.muted, fontSize: '0.85rem', marginTop: '0.25rem' }}>Text analysis & images</div>
          </Link>
        </div>

        {practiceUnit === 'lines' && mastered.size > 0 && (
          <div style={{ marginTop: '2rem', color: colors.faded, fontSize: '0.9rem' }}>
            {mastered.size} of {work.chunks.length} chunks mastered
          </div>
        )}
        {practiceUnit === 'beats' && masteredBeats.size > 0 && (
          <div style={{ marginTop: '2rem', color: colors.faded, fontSize: '0.9rem' }}>
            {masteredBeats.size} of {beats.length} beats mastered
          </div>
        )}

        {showBeatEditor && (
          <BeatEditor
            work={work}
            beats={beats}
            defaultBeats={defaultBeats}
            onSave={saveBeatOverrides}
            onClose={() => setShowBeatEditor(false)}
          />
        )}
      </div>
    )
  }

  // Memorize Mode
  if (mode === 'memorize') {
    const inBeatsMode = practiceUnit === 'beats' && beats.length > 0
    const totalItems = inBeatsMode ? beats.length : work.chunks.length
    const chunk = inBeatsMode ? null : work.chunks[currentIndex]
    const beat = inBeatsMode ? beats[currentIndex] : null
    const isMastered = inBeatsMode ? masteredBeats.has(currentIndex) : mastered.has(currentIndex)
    const currentOptions = inBeatsMode ? [] : (wordPictures.generated[currentIndex] || [])
    const currentSelected = inBeatsMode ? null : wordPictures.selected[currentIndex]
    const currentRoom = inBeatsMode ? null : (wordPictures.rooms[currentIndex] || ROOMS[currentIndex % ROOMS.length])

    return (
      <div style={baseStyle}>
        <button onClick={exitPractice} style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <ArrowLeft size={18} /> Exit
        </button>

        <Link to={`/visualize/${authorId}/${workId}`} style={{ position: 'absolute', top: '1rem', right: '1rem', color: colors.muted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
          <Map size={16} /> Floor Plan
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <h2 style={{ color: inBeatsMode ? colors.blue : colors.crimson, fontFamily: "'Cormorant', serif", fontSize: '1.1rem', margin: 0 }}>"{work.title}"</h2>
          {beats.length > 0 && (
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.04)', borderRadius: '4px', padding: '0.15rem' }}>
              <button onClick={() => { togglePracticeUnit('lines'); setCurrentIndex(0); setFlipped(false) }} style={{ padding: '0.2rem 0.5rem', borderRadius: '3px', border: 'none', cursor: 'pointer', background: practiceUnit === 'lines' ? colors.crimson : 'transparent', color: practiceUnit === 'lines' ? colors.paper : colors.faded, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.7rem' }}>Lines</button>
              <button onClick={() => { togglePracticeUnit('beats'); setCurrentIndex(0); setFlipped(false) }} style={{ padding: '0.2rem 0.5rem', borderRadius: '3px', border: 'none', cursor: 'pointer', background: practiceUnit === 'beats' ? colors.blue : 'transparent', color: practiceUnit === 'beats' ? colors.paper : colors.faded, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.7rem' }}>Beats</button>
            </div>
          )}
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: '3px', marginBottom: '1rem', maxWidth: '32rem', width: '100%' }}>
          {Array.from({ length: totalItems }).map((_, idx) => (
            <div
              key={idx}
              onClick={() => { setCurrentIndex(idx); setFlipped(false); setEditingPicture(false) }}
              style={{
                height: '6px',
                flex: 1,
                borderRadius: '3px',
                cursor: 'pointer',
                background: idx === currentIndex
                  ? (inBeatsMode ? colors.blue : colors.crimson)
                  : (inBeatsMode ? masteredBeats.has(idx) : mastered.has(idx))
                    ? colors.forest
                    : (!inBeatsMode && wordPictures.selected[idx])
                      ? 'rgba(90,74,106,0.5)'
                      : 'rgba(0,0,0,0.1)',
                transition: 'all 0.2s'
              }}
            />
          ))}
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.04)', borderRadius: '8px', padding: '0.25rem', marginBottom: '1rem', maxWidth: '32rem', width: '100%' }}>
          <button
            onClick={() => setMemTab('learn')}
            style={{
              flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: memTab === 'learn' ? colors.crimson : 'transparent',
              color: memTab === 'learn' ? colors.paper : colors.muted,
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            <BookOpen size={16} /> Learn
          </button>
          <button
            onClick={() => { setMemTab('drill'); initDrillQueue() }}
            style={{
              flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: memTab === 'drill' ? colors.forest : 'transparent',
              color: memTab === 'drill' ? colors.paper : colors.muted,
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            <Target size={16} /> Drill
          </button>
          <button
            onClick={() => setMemTab('tools')}
            style={{
              flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: memTab === 'tools' ? '#5a4a6a' : 'transparent',
              color: memTab === 'tools' ? colors.paper : colors.muted,
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            <Sparkles size={16} /> Tools
          </button>
        </div>

        {/* Learn Tab - Flashcard */}
        {memTab === 'learn' && (
          <>
            {inBeatsMode && beat ? (
              /* Beats mode flashcard */
              <>
                <div onClick={() => setFlipped(!flipped)} style={{ ...cardStyle, cursor: 'pointer', minHeight: '16rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderColor: isMastered ? 'rgba(61,92,74,0.3)' : 'rgba(42,74,94,0.15)', background: isMastered ? 'rgba(61,92,74,0.04)' : 'rgba(42,74,94,0.03)' }}>
                  {!flipped ? (
                    <>
                      <p style={{ color: colors.blue, fontSize: '0.75rem', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Beat {currentIndex + 1}</p>
                      <h3 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.4rem', color: colors.ink, lineHeight: 1.4, marginBottom: '0.5rem' }}>{beat.label}</h3>
                      <p style={{ color: colors.muted, fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '1rem' }}>{beat.intention}</p>
                      <p style={{ fontFamily: "'Cormorant', serif", color: colors.ink, fontSize: '1.05rem', opacity: 0.7 }}>
                        "{getBeatCue(work.chunks, beat)}"
                      </p>
                      <p style={{ color: colors.faded, marginTop: 'auto', fontSize: '0.8rem' }}>Click to reveal full text</p>
                    </>
                  ) : (
                    <>
                      <p style={{ color: colors.blue, fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{beat.label}</p>
                      <div style={{ textAlign: 'left', width: '100%' }}>
                        {work.chunks.slice(beat.startChunk, beat.endChunk + 1).map((c, i) => (
                          <p key={i} style={{ fontFamily: "'Cormorant', serif", fontSize: '1.15rem', color: colors.ink, lineHeight: 1.6, margin: '0.15rem 0' }}>
                            {c.front} <span style={{ color: colors.blue }}>{c.back}</span>
                          </p>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                  <button onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setFlipped(false) }} disabled={currentIndex === 0} style={{ ...btnSecondary, opacity: currentIndex === 0 ? 0.4 : 1, padding: '0.75rem', minWidth: '44px', minHeight: '44px', justifyContent: 'center' }}>
                    <ChevronLeft size={22} />
                  </button>
                  <button onClick={toggleMasteredBeat} style={{ ...btnPrimary, background: isMastered ? colors.forest : colors.blue }}>
                    <CheckCircle2 size={18} /> {isMastered ? 'Mastered' : 'Mark Mastered'}
                  </button>
                  <button onClick={() => { setCurrentIndex(Math.min(totalItems - 1, currentIndex + 1)); setFlipped(false) }} disabled={currentIndex === totalItems - 1} style={{ ...btnSecondary, opacity: currentIndex === totalItems - 1 ? 0.4 : 1, padding: '0.75rem', minWidth: '44px', minHeight: '44px', justifyContent: 'center' }}>
                    <ChevronRight size={22} />
                  </button>
                </div>
              </>
            ) : (
              /* Lines mode flashcard (existing) */
              <>
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
                      {currentSelected && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(90,74,106,0.08)', borderRadius: '8px', width: '100%' }}>
                          <p style={{ fontSize: '0.75rem', color: '#5a4a6a', marginBottom: '0.25rem' }}>{currentRoom}</p>
                          <p style={{ fontSize: '0.85rem', color: colors.muted, fontStyle: 'italic' }}>{currentSelected}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                  <button onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setFlipped(false) }} disabled={currentIndex === 0} style={{ ...btnSecondary, opacity: currentIndex === 0 ? 0.4 : 1, padding: '0.75rem', minWidth: '44px', minHeight: '44px', justifyContent: 'center' }}>
                    <ChevronLeft size={22} />
                  </button>
                  <button onClick={toggleMastered} style={{ ...btnPrimary, background: isMastered ? colors.forest : colors.crimson }}>
                    <CheckCircle2 size={18} /> {isMastered ? 'Mastered' : 'Mark Mastered'}
                  </button>
                  <button onClick={() => { setCurrentIndex(Math.min(work.chunks.length - 1, currentIndex + 1)); setFlipped(false) }} disabled={currentIndex === work.chunks.length - 1} style={{ ...btnSecondary, opacity: currentIndex === work.chunks.length - 1 ? 0.4 : 1, padding: '0.75rem', minWidth: '44px', minHeight: '44px', justifyContent: 'center' }}>
                    <ChevronRight size={22} />
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Drill Tab - Adaptive Quiz */}
        {memTab === 'drill' && (
          <>
            {drillChunks.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', minHeight: '16rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Shuffle size={40} style={{ color: colors.forest, marginBottom: '1rem' }} />
                <p style={{ color: colors.muted, marginBottom: '1rem' }}>Adaptive drill targets your weak spots</p>
                <button onClick={initDrillQueue} style={{ ...btnPrimary, background: colors.forest }}>
                  <Target size={16} /> Start Drill
                </button>
              </div>
            ) : drillIndex >= drillChunks.length ? (
              // Drill complete
              <div style={{ ...cardStyle, textAlign: 'center', minHeight: '16rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={48} style={{ color: colors.forest, marginBottom: '1rem' }} />
                <h3 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.5rem', color: colors.ink, marginBottom: '0.5rem' }}>Drill Complete!</h3>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontFamily: "'Cormorant', serif", color: colors.forest }}>{drillScore.correct}</div>
                    <div style={{ fontSize: '0.75rem', color: colors.faded }}>Got it</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontFamily: "'Cormorant', serif", color: colors.gold }}>{drillScore.struggled}</div>
                    <div style={{ fontSize: '0.75rem', color: colors.faded }}>Struggled</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontFamily: "'Cormorant', serif", color: colors.crimson }}>{drillScore.missed}</div>
                    <div style={{ fontSize: '0.75rem', color: colors.faded }}>Missed</div>
                  </div>
                </div>
                <button onClick={initDrillQueue} style={{ ...btnPrimary, background: colors.forest }}>
                  <RotateCcw size={16} /> Drill Again
                </button>
              </div>
            ) : (
              // Active drill
              <div style={{ ...cardStyle, minHeight: '16rem' }}>
                {(() => {
                  const itemIdx = drillChunks[drillIndex]
                  const isDrillBeats = inBeatsMode
                  const drillBeat = isDrillBeats ? beats[itemIdx] : null
                  const chunk = isDrillBeats ? null : work.chunks[itemIdx]
                  const drillExpected = isDrillBeats ? getBeatText(work.chunks, drillBeat) : chunk.back

                  // Error rate for display
                  let errorRate = null
                  if (isDrillBeats && drillBeat) {
                    let totalA = 0, totalE = 0
                    for (let c = drillBeat.startChunk; c <= drillBeat.endChunk; c++) {
                      const s = drillStats[c]
                      if (s) { totalA += s.attempts; totalE += s.errors }
                    }
                    if (totalA > 0) errorRate = Math.round((totalE / totalA) * 100)
                  } else {
                    const stat = drillStats[itemIdx]
                    errorRate = stat?.attempts > 0 ? Math.round((stat.errors / stat.attempts) * 100) : null
                  }

                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', color: colors.faded }}>
                          {drillIndex + 1} / {drillChunks.length}
                        </span>
                        {errorRate !== null && (
                          <span style={{ fontSize: '0.75rem', color: errorRate > 50 ? colors.crimson : errorRate > 25 ? colors.gold : colors.forest }}>
                            {errorRate}% error rate
                          </span>
                        )}
                      </div>

                      {isDrillBeats ? (
                        <>
                          <p style={{ color: colors.blue, fontSize: '0.85rem', marginBottom: '0.5rem', textAlign: 'center' }}>Recite this beat:</p>
                          <h3 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.4rem', color: colors.ink, textAlign: 'center', marginBottom: '0.25rem', lineHeight: 1.4 }}>
                            {drillBeat.label}
                          </h3>
                          <p style={{ color: colors.muted, fontSize: '0.85rem', textAlign: 'center', fontStyle: 'italic', marginBottom: '0.5rem' }}>{drillBeat.intention}</p>
                          <p style={{ fontFamily: "'Cormorant', serif", color: colors.ink, fontSize: '1.05rem', textAlign: 'center', marginBottom: '0.5rem', opacity: 0.7 }}>"{getBeatCue(work.chunks, drillBeat)}"</p>
                          <p style={{ color: colors.faded, fontSize: '0.8rem', textAlign: 'center', marginBottom: '1rem' }}>({wordCount(drillExpected)} words)</p>
                        </>
                      ) : (
                        <>
                          <p style={{ color: colors.crimson, fontSize: '0.85rem', marginBottom: '0.5rem', textAlign: 'center' }}>Complete this line:</p>
                          <h3 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.4rem', color: colors.ink, textAlign: 'center', marginBottom: '1.5rem', lineHeight: 1.4 }}>
                            "{chunk.front}..."
                          </h3>
                        </>
                      )}

                      {!drillRevealed ? (
                        <>
                          <div style={{ position: 'relative', marginBottom: '1rem' }}>
                            <textarea
                              value={drillAnswer}
                              onChange={(e) => setDrillAnswer(e.target.value)}
                              placeholder={isDrillBeats ? "Type or speak the full beat..." : "Type or speak your answer..."}
                              style={{
                                width: '100%',
                                padding: '1rem',
                                paddingRight: '3.5rem',
                                background: 'rgba(0,0,0,0.03)',
                                border: '1px solid rgba(0,0,0,0.1)',
                                borderRadius: '8px',
                                resize: 'none',
                                height: isDrillBeats ? '10rem' : '5rem',
                                fontFamily: "'IBM Plex Sans', sans-serif",
                                fontSize: '0.95rem',
                                color: colors.ink,
                                boxSizing: 'border-box'
                              }}
                            />
                            <button
                              onClick={drillListening ? stopDrillListening : startDrillListening}
                              style={{
                                position: 'absolute',
                                right: '0.75rem',
                                top: '0.75rem',
                                padding: '0.5rem',
                                borderRadius: '50%',
                                border: 'none',
                                background: drillListening ? '#d64545' : colors.forest,
                                cursor: 'pointer'
                              }}
                            >
                              {drillListening ? <MicOff size={18} style={{ color: 'white' }} /> : <Mic size={18} style={{ color: 'white' }} />}
                            </button>
                          </div>
                          {drillListening && <p style={{ color: colors.forest, textAlign: 'center', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Listening...</p>}
                          <button
                            onClick={() => setDrillRevealed(true)}
                            style={{ ...btnPrimary, width: '100%', justifyContent: 'center', background: colors.forest }}
                          >
                            Check Answer
                          </button>
                        </>
                      ) : (
                        (() => {
                          const similarity = similarityScore(drillAnswer, drillExpected)
                          const hasExpected = isDrillBeats ? false : containsExpected(drillAnswer, drillExpected)
                          const likert = hasExpected ? 1.0 : toLikert(similarity, isDrillBeats)
                          const isCorrect = likert >= 0.8

                          return (
                            <>
                              {/* Score display */}
                              <div style={{
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                marginBottom: '1rem',
                                background: isCorrect ? 'rgba(61,92,74,0.1)' : likert >= 0.5 ? 'rgba(196,163,90,0.1)' : 'rgba(155,45,48,0.08)',
                                border: `1px solid ${isCorrect ? 'rgba(61,92,74,0.3)' : likert >= 0.5 ? 'rgba(196,163,90,0.3)' : 'rgba(155,45,48,0.2)'}`
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                  <p style={{ fontWeight: 500, color: likertColor(likert), margin: 0 }}>
                                    {likert >= 1.0 ? 'Perfect!' : likert >= 0.8 ? 'Great!' : likert >= 0.6 ? 'Close' : likert >= 0.4 ? 'Partial' : 'Keep practicing'}
                                  </p>
                                  <span style={{ fontFamily: "'Cormorant', serif", fontSize: '1.4rem', fontWeight: 600, color: likertColor(likert) }}>
                                    {Math.round(likert * 100)}%
                                  </span>
                                </div>
                                {drillAnswer && (
                                  <p style={{ color: colors.muted, fontSize: '0.85rem', margin: 0 }}>You said: "{drillAnswer}"</p>
                                )}
                              </div>

                              {/* Correct answer */}
                              <div style={{ background: 'rgba(61,92,74,0.08)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', textAlign: isDrillBeats ? 'left' : 'center' }}>
                                <p style={{ fontSize: '0.7rem', color: colors.faded, marginBottom: '0.25rem', textTransform: 'uppercase' }}>Correct answer</p>
                                {isDrillBeats ? (
                                  <div>
                                    {work.chunks.slice(drillBeat.startChunk, drillBeat.endChunk + 1).map((c, i) => (
                                      <p key={i} style={{ fontFamily: "'Cormorant', serif", fontSize: '1.05rem', color: colors.forest, lineHeight: 1.6, margin: '0.1rem 0' }}>
                                        {c.front} {c.back}
                                      </p>
                                    ))}
                                  </div>
                                ) : (
                                  <p style={{ fontFamily: "'Cormorant', serif", fontSize: '1.3rem', color: colors.forest, fontWeight: 500, margin: 0 }}>
                                    {drillExpected}
                                  </p>
                                )}
                              </div>

                              <p style={{ color: colors.muted, fontSize: '0.85rem', textAlign: 'center', marginBottom: '0.75rem' }}>Rate yourself:</p>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  onClick={() => {
                                    setDrillScore(s => ({ ...s, correct: s.correct + 1 }))
                                    recordAttempt(itemIdx, true, drillAnswer, drillExpected)
                                    setDrillIndex(i => i + 1)
                                    setDrillRevealed(false)
                                    setDrillAnswer('')
                                  }}
                                  style={{ ...btnPrimary, flex: 1, justifyContent: 'center', background: colors.forest }}
                                >
                                  Got it
                                </button>
                                <button
                                  onClick={() => {
                                    setDrillScore(s => ({ ...s, struggled: s.struggled + 1 }))
                                    recordAttempt(itemIdx, likert >= 0.5, drillAnswer, drillExpected)
                                    setDrillIndex(i => i + 1)
                                    setDrillRevealed(false)
                                    setDrillAnswer('')
                                  }}
                                  style={{ ...btnSecondary, flex: 1, justifyContent: 'center', borderColor: colors.gold, color: colors.gold }}
                                >
                                  Struggled
                                </button>
                                <button
                                  onClick={() => {
                                    setDrillScore(s => ({ ...s, missed: s.missed + 1 }))
                                    recordAttempt(itemIdx, false, drillAnswer, drillExpected)
                                    setDrillIndex(i => i + 1)
                                    setDrillRevealed(false)
                                    setDrillAnswer('')
                                  }}
                                  style={{ ...btnSecondary, flex: 1, justifyContent: 'center', borderColor: colors.crimson, color: colors.crimson }}
                                >
                                  Missed
                                </button>
                              </div>
                            </>
                          )
                        })()
                      )}
                    </>
                  )
                })()}
              </div>
            )}

            {/* Drill progress indicator */}
            {drillChunks.length > 0 && drillIndex < drillChunks.length && (
              <div style={{ display: 'flex', gap: '3px', marginTop: '1rem', maxWidth: '32rem', width: '100%' }}>
                {drillChunks.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: '4px',
                      flex: 1,
                      borderRadius: '2px',
                      background: idx < drillIndex ? colors.forest : idx === drillIndex ? colors.gold : 'rgba(0,0,0,0.1)'
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Tools Tab - Word Pictures */}
        {memTab === 'tools' && (
          <>
            <div style={{ ...cardStyle, minHeight: '16rem' }}>
              {/* Chunk text */}
              <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                <p style={{ fontSize: '0.75rem', color: colors.faded, marginBottom: '0.25rem' }}>Chunk {currentIndex + 1} • {currentRoom}</p>
                <p style={{ color: colors.muted }}>{chunk.front} <span style={{ color: colors.crimson, fontWeight: 500 }}>{chunk.back}</span></p>
              </div>

              {/* Word Picture Section */}
              {currentSelected && !editingPicture ? (
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#5a4a6a', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Word Picture</p>
                  <div style={{ background: 'rgba(90,74,106,0.08)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <p style={{ color: colors.ink, lineHeight: 1.5 }}>{currentSelected}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => { setEditingPicture(true); setEditText(currentSelected) }} style={{ ...btnSecondary, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                      <Edit3 size={14} /> Edit
                    </button>
                    <button onClick={generatePicture} disabled={generatingPicture} style={{ ...btnSecondary, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                      <Sparkles size={14} /> Regenerate
                    </button>
                  </div>
                </div>
              ) : editingPicture ? (
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#5a4a6a', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Edit Word Picture</p>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    placeholder="Write your mnemonic..."
                    style={{ width: '100%', height: '5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', resize: 'none', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.9rem', color: colors.ink, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button onClick={saveEditedPicture} style={{ ...btnPrimary, background: colors.forest, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                      <Check size={14} /> Save
                    </button>
                    <button onClick={() => { setEditingPicture(false); setEditText('') }} style={{ ...btnSecondary, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : currentOptions.length > 0 ? (
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#5a4a6a', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Choose a Word Picture</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {currentOptions.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectPicture(option)}
                        style={{ width: '100%', textAlign: 'left', padding: '0.75rem', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.85rem', color: colors.ink }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setEditingPicture(true)} style={{ ...btnSecondary, marginTop: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                    <Edit3 size={14} /> Write my own
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <Sparkles size={32} style={{ color: colors.faded, marginBottom: '0.75rem' }} />
                  <p style={{ color: colors.muted, marginBottom: '1rem' }}>Create a vivid mnemonic image for this chunk</p>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button onClick={generatePicture} disabled={generatingPicture} style={{ ...btnPrimary, background: '#5a4a6a' }}>
                      {generatingPicture ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : <><Sparkles size={16} /> Generate Ideas</>}
                    </button>
                    <button onClick={() => setEditingPicture(true)} style={btnSecondary}>
                      <Edit3 size={16} /> Write my own
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setEditingPicture(false) }} disabled={currentIndex === 0} style={{ ...btnSecondary, opacity: currentIndex === 0 ? 0.4 : 1, padding: '0.75rem', minWidth: '44px', minHeight: '44px', justifyContent: 'center' }}>
                <ChevronLeft size={22} />
              </button>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <p style={{ color: colors.faded, fontSize: '0.85rem' }}>
                  {Object.keys(wordPictures.selected).length} of {work.chunks.length} chunks have mnemonics
                </p>
              </div>
              <button onClick={() => { setCurrentIndex(Math.min(work.chunks.length - 1, currentIndex + 1)); setEditingPicture(false) }} disabled={currentIndex === work.chunks.length - 1} style={{ ...btnSecondary, opacity: currentIndex === work.chunks.length - 1 ? 0.4 : 1, padding: '0.75rem', minWidth: '44px', minHeight: '44px', justifyContent: 'center' }}>
                <ChevronRight size={22} />
              </button>
            </div>
          </>
        )}

        <p style={{ color: colors.faded, marginTop: '1rem', fontSize: '0.9rem' }}>{currentIndex + 1} / {totalItems}{inBeatsMode ? ' beats' : ''}</p>
      </div>
    )
  }

  // Test Mode
  if (mode === 'test') {
    const itemIdx = testOrder[testIndex]
    const isTestBeats = practiceUnit === 'beats' && beats.length > 0
    const testBeat = isTestBeats ? beats[itemIdx] : null
    const chunk = isTestBeats ? null : work.chunks[itemIdx]
    const testExpected = isTestBeats ? getBeatText(work.chunks, testBeat) : chunk.back

    return (
      <div style={baseStyle}>
        <button onClick={exitPractice} style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <ArrowLeft size={18} /> Exit
        </button>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', color: colors.muted, fontSize: '0.9rem' }}>
          {score.points} / {score.total}
        </div>

        <h2 style={{ color: isTestBeats ? colors.blue : colors.crimson, fontFamily: "'Cormorant', serif", fontSize: '1.1rem', marginBottom: '1.5rem' }}>"{work.title}" • Test ({isTestBeats ? 'Beats' : 'Lines'})</h2>

        <div style={{ ...cardStyle }}>
          {isTestBeats ? (
            <>
              <p style={{ color: colors.blue, fontSize: '0.85rem', marginBottom: '0.5rem', textAlign: 'center' }}>Recite this beat:</p>
              <h3 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.4rem', color: colors.ink, textAlign: 'center', marginBottom: '0.25rem', lineHeight: 1.4 }}>{testBeat.label}</h3>
              <p style={{ color: colors.muted, fontSize: '0.85rem', textAlign: 'center', fontStyle: 'italic', marginBottom: '0.5rem' }}>{testBeat.intention}</p>
              <p style={{ fontFamily: "'Cormorant', serif", color: colors.ink, fontSize: '1.05rem', textAlign: 'center', marginBottom: '0.5rem', opacity: 0.7 }}>"{getBeatCue(work.chunks, testBeat)}"</p>
              <p style={{ color: colors.faded, fontSize: '0.8rem', textAlign: 'center', marginBottom: '1rem' }}>({wordCount(testExpected)} words)</p>
            </>
          ) : (
            <>
              <p style={{ color: colors.crimson, fontSize: '0.85rem', marginBottom: '0.5rem', textAlign: 'center' }}>Complete this line:</p>
              <h3 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.4rem', color: colors.ink, textAlign: 'center', marginBottom: '0.5rem', lineHeight: 1.4 }}>"{chunk.front}..."</h3>
              <p style={{ color: colors.faded, fontSize: '0.8rem', textAlign: 'center', marginBottom: '1rem' }}>({wordCount(chunk.back)} words expected)</p>
            </>
          )}

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
                    height: isTestBeats ? '10rem' : '6rem',
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
                    background: isListening ? '#d64545' : (isTestBeats ? colors.blue : colors.crimson),
                    cursor: 'pointer'
                  }}
                >
                  {isListening ? <MicOff size={18} style={{ color: 'white' }} /> : <Mic size={18} style={{ color: 'white' }} />}
                </button>
              </div>
              {isListening && <p style={{ color: isTestBeats ? colors.blue : colors.crimson, textAlign: 'center', marginTop: '0.5rem', fontSize: '0.9rem' }}>Listening...</p>}
              {!SpeechRecognition && <p style={{ color: colors.gold, textAlign: 'center', marginTop: '0.5rem', fontSize: '0.85rem' }}>Voice input not available</p>}
              <button onClick={checkAnswer} disabled={!userAnswer.trim()} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', marginTop: '1rem', opacity: !userAnswer.trim() ? 0.5 : 1 }}>
                Check Answer
              </button>
            </>
          ) : (
            <>
              <div style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1rem', background: isCorrect ? 'rgba(61,92,74,0.1)' : 'rgba(155,45,48,0.06)', border: `1px solid ${isCorrect ? 'rgba(61,92,74,0.3)' : 'rgba(155,45,48,0.15)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <p style={{ fontWeight: 500, color: likertColor(lastLikert) }}>
                    {lastLikert >= 1.0 ? 'Perfect' : lastLikert >= 0.8 ? 'Almost' : lastLikert >= 0.6 ? 'Partial' : lastLikert >= 0.4 ? 'Rough' : 'Needs work'}
                  </p>
                  <span style={{ fontFamily: "'Cormorant', serif", fontSize: '1.4rem', fontWeight: 600, color: likertColor(lastLikert) }}>{lastLikert.toFixed(1)}</span>
                </div>
                <p style={{ color: colors.muted, fontSize: '0.9rem' }}>Your answer: "{userAnswer}"</p>
                {isTestBeats ? (
                  <div style={{ marginTop: '0.5rem' }}>
                    <p style={{ fontSize: '0.8rem', color: colors.faded, marginBottom: '0.25rem' }}>Correct:</p>
                    {work.chunks.slice(testBeat.startChunk, testBeat.endChunk + 1).map((c, i) => (
                      <p key={i} style={{ fontSize: '0.85rem', color: colors.ink, lineHeight: 1.5, margin: '0.1rem 0' }}>
                        {c.front} <span style={{ color: colors.blue, fontWeight: 500 }}>{c.back}</span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: colors.ink, marginTop: '0.5rem', fontSize: '0.9rem' }}>Correct: <span style={{ color: colors.crimson, fontWeight: 500 }}>{testExpected}</span></p>
                )}
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

  // Recite Mode
  if (mode === 'recite') {
    return (
      <div style={baseStyle}>
        <button onClick={() => { stopRecording(); setMode(null) }} style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <ArrowLeft size={18} /> Exit
        </button>

        <h2 style={{ color: colors.gold, fontFamily: "'Cormorant', serif", fontSize: '1.3rem', marginBottom: '0.5rem' }}>Full Recitation</h2>
        <p style={{ color: colors.muted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>"{work.title}"</p>

        {/* Pre-recording / Recording */}
        {!reciteAnalyzing && !reciteResult && (
          <div style={{ ...cardStyle, textAlign: 'center', minHeight: '16rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {!recording ? (
              <>
                <p style={{ color: colors.muted, marginBottom: '1.5rem', maxWidth: '22rem', lineHeight: 1.5 }}>
                  Recite the entire soliloquy from memory. We'll analyze where you stop or struggle.
                </p>
                <button onClick={startRecording} style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: colors.crimson, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(155,45,48,0.3)' }}>
                  <Mic size={28} style={{ color: colors.paper }} />
                </button>
                <p style={{ color: colors.faded, fontSize: '0.8rem', marginTop: '1rem' }}>Tap to start recording</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2.5rem', fontFamily: "'Cormorant', serif", color: colors.crimson, marginBottom: '1rem' }}>
                  {formatRecordingTime(recordingTime)}
                </div>
                <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: 'rgba(155,45,48,0.08)', border: '3px solid ' + colors.crimson, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '1rem', height: '1rem', borderRadius: '50%', background: colors.crimson, animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
                <button onClick={stopRecording} style={{ ...btnPrimary, marginTop: '1.5rem' }}>
                  <Square size={16} /> Stop & Analyze
                </button>
              </>
            )}
          </div>
        )}

        {/* Analyzing spinner */}
        {reciteAnalyzing && (
          <div style={{ ...cardStyle, textAlign: 'center', minHeight: '16rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={40} style={{ color: colors.gold, animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
            <p style={{ color: colors.muted }}>Analyzing your recitation...</p>
            <p style={{ color: colors.faded, fontSize: '0.85rem', marginTop: '0.5rem' }}>Three expert analysts reviewing accuracy, fluency & dramatic quality</p>
          </div>
        )}

        {/* Results */}
        {reciteResult && !reciteResult.error && (
          <div style={{ ...cardStyle, maxWidth: '36rem' }}>
            {/* Drama coach summary */}
            {reciteResult.summaries?.drama && (
              <div style={{ background: 'rgba(196,163,90,0.08)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', borderLeft: '3px solid ' + colors.gold }}>
                <p style={{ color: colors.ink, fontSize: '0.9rem', lineHeight: 1.5, fontStyle: 'italic' }}>{reciteResult.summaries.drama}</p>
              </div>
            )}

            {/* Stats */}
            <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontFamily: "'Cormorant', serif", color: colors.crimson }}>{reciteResult.stats?.substitutions || 0}</div>
                <div style={{ fontSize: '0.7rem', color: colors.faded }}>Wrong words</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontFamily: "'Cormorant', serif", color: colors.crimson }}>{reciteResult.stats?.omissions || 0}</div>
                <div style={{ fontSize: '0.7rem', color: colors.faded }}>Omissions</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontFamily: "'Cormorant', serif", color: '#d4860a' }}>{reciteResult.stats?.hesitations || 0}</div>
                <div style={{ fontSize: '0.7rem', color: colors.faded }}>Hesitations</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontFamily: "'Cormorant', serif", color: '#d4860a' }}>{reciteResult.stats?.stumbles || 0}</div>
                <div style={{ fontSize: '0.7rem', color: colors.faded }}>Stumbles</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontFamily: "'Cormorant', serif", color: colors.ink }}>{reciteResult.stats?.totalWords || 0}</div>
                <div style={{ fontSize: '0.7rem', color: colors.faded }}>Total words</div>
              </div>
            </div>

            {/* Accuracy bar */}
            {reciteResult.stats && reciteResult.stats.totalWords > 0 && (() => {
              const spots = reciteResult.stats.troubleSpotCount || 0;
              const total = reciteResult.stats.totalWords;
              const pct = Math.max(0, Math.round(((total - spots) / total) * 100));
              return (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: colors.forest, borderRadius: '3px', transition: 'width 0.5s' }} />
                  </div>
                  <p style={{ textAlign: 'center', color: colors.faded, fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {pct}% clean — {spots} trouble {spots === 1 ? 'spot' : 'spots'} found by consensus
                  </p>
                </div>
              );
            })()}

            {/* Transcript */}
            <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: colors.faded, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Recitation</div>
              <p style={{ color: colors.ink, lineHeight: 1.6, fontSize: '0.9rem', fontStyle: 'italic' }}>"{reciteResult.transcript}"</p>
            </div>

            {/* Dramatic pauses (positive feedback) */}
            {reciteResult.dramaticPauses?.length > 0 && (
              <div style={{ background: 'rgba(61,92,74,0.06)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: colors.forest, marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Good dramatic pauses</div>
                {reciteResult.dramaticPauses.slice(0, 5).map((dp, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', color: colors.muted, padding: '0.15rem 0' }}>
                    <span style={{ color: colors.forest }}>&#10003;</span> {dp.note} {dp.seconds ? `(${dp.seconds}s)` : ''}
                  </div>
                ))}
              </div>
            )}

            {/* Trouble spots */}
            {reciteResult.troubleSpots?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: colors.faded, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Trouble Spots ({reciteResult.stats?.troubleSpotCount || 0} consensus)
                </div>
                <div style={{ maxHeight: '14rem', overflowY: 'auto' }}>
                  {reciteResult.troubleSpots.slice(0, 25).map((spot, i) => {
                    const isError = spot.type === 'substitution' || spot.type === 'omission';
                    const icon = spot.type === 'substitution' ? '\u2717'
                      : spot.type === 'omission' ? '\u2205'
                      : spot.type === 'hesitation' ? '||'
                      : '~';
                    return (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.3rem 0', fontSize: '0.82rem', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <span style={{ color: isError ? colors.crimson : '#d4860a', fontWeight: 600, width: '1.2rem', flexShrink: 0, textAlign: 'center' }}>
                          {icon}
                        </span>
                        <span style={{ color: colors.muted, flex: 1 }}>
                          {spot.type === 'substitution' && `"${spot.expected}" \u2192 "${spot.heard}" (line ${spot.chunkIdx + 1})`}
                          {spot.type === 'omission' && `Skipped "${spot.expected}" (line ${spot.chunkIdx + 1})`}
                          {spot.type === 'hesitation' && `Hesitated${spot.gapSeconds ? ` ${spot.gapSeconds}s` : ''} before "${spot.expected}" (line ${spot.chunkIdx + 1})`}
                          {(spot.type === 'stumble' || spot.type === 'filler') && `Stumbled on "${spot.expected}" (line ${spot.chunkIdx + 1})`}
                          {spot.note && <span style={{ display: 'block', fontSize: '0.75rem', color: colors.faded, fontStyle: 'italic' }}>{spot.note}</span>}
                        </span>
                        {spot.confidence >= 1 && <span style={{ fontSize: '0.65rem', color: colors.faded, flexShrink: 0 }} title="All analysts agreed">3/3</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Analyst summaries */}
            {reciteResult.summaries && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: colors.faded, marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analysis Notes</div>
                {reciteResult.summaries.accuracy && <p style={{ fontSize: '0.78rem', color: colors.muted, marginBottom: '0.2rem' }}><strong>Accuracy:</strong> {reciteResult.summaries.accuracy}</p>}
                {reciteResult.summaries.fluency && <p style={{ fontSize: '0.78rem', color: colors.muted, marginBottom: '0.2rem' }}><strong>Fluency:</strong> {reciteResult.summaries.fluency}</p>}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setReciteResult(null)} style={btnPrimary}>
                <RotateCcw size={16} /> Try Again
              </button>
              <Link to={`/visualize/${authorId}/${workId}`} style={{ ...btnSecondary, textDecoration: 'none' }}>
                <Map size={16} /> View Trouble Map
              </Link>
            </div>
          </div>
        )}

        {/* Error */}
        {reciteResult?.error && (
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <p style={{ color: colors.crimson, marginBottom: '1rem' }}>{reciteResult.error}</p>
            <button onClick={() => setReciteResult(null)} style={btnSecondary}>Try Again</button>
          </div>
        )}
      </div>
    )
  }

  // Results
  if (mode === 'results') {
    const maxPoints = score.total
    const pct = maxPoints > 0 ? Math.round((score.points / maxPoints) * 100) : 0

    return (
      <div style={baseStyle}>
        <h2 style={{ fontFamily: "'Cormorant', serif", fontSize: '2rem', color: colors.ink, fontWeight: 400, marginBottom: '0.5rem' }}>Test Complete!</h2>
        <p style={{ color: colors.muted, marginBottom: '1.5rem' }}>"{work.title}"</p>

        <div style={{ fontFamily: "'Cormorant', serif", fontSize: '4rem', color: likertColor(score.points / maxPoints), marginBottom: '0.5rem' }}>{pct}%</div>
        <p style={{ color: colors.muted, marginBottom: '2rem' }}>{score.points} / {maxPoints} points</p>

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
