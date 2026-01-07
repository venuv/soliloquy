import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../App'
import { Home, Clock, Target, BookOpen, Trophy, Calendar } from 'lucide-react'

export default function Stats() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/analytics/summary')
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-amber-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-amber-400">Your Stats</h1>
          <Link to="/" className="text-gray-400 hover:text-white flex items-center gap-2">
            <Home size={20} />
            <span>Home</span>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="text-amber-400" size={24} />
              <span className="text-gray-400">Total Sessions</span>
            </div>
            <div className="text-3xl font-bold text-white">{summary?.totalSessions || 0}</div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-blue-400" size={24} />
              <span className="text-gray-400">Time Practiced</span>
            </div>
            <div className="text-3xl font-bold text-white">{summary?.totalTimeMinutes || 0} min</div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Target className="text-green-400" size={24} />
              <span className="text-gray-400">Tests Taken</span>
            </div>
            <div className="text-3xl font-bold text-white">{summary?.testSessions || 0}</div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="text-yellow-400" size={24} />
              <span className="text-gray-400">Avg Test Score</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {summary?.avgScore !== null ? `${summary.avgScore}%` : '—'}
            </div>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-medium text-white mb-4">Progress</h2>
          <div className="flex justify-between text-gray-400">
            <span>Works Started</span>
            <span className="text-white font-medium">{summary?.worksStarted || 0}</span>
          </div>
          <div className="flex justify-between text-gray-400 mt-2">
            <span>Works with Mastered Chunks</span>
            <span className="text-white font-medium">{summary?.worksMastered || 0}</span>
          </div>
        </div>

        {/* Member Info */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <Calendar className="text-gray-400" size={20} />
            <span className="text-gray-400">
              Member since {summary?.memberSince 
                ? new Date(summary.memberSince).toLocaleDateString() 
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
