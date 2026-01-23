import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, api } from '../App'
import { LogOut, BarChart2, KeyRound, BookOpen, Play, Sparkles, Coffee } from 'lucide-react'

export default function Home() {
  const { userKey, logout } = useAuth()
  const [authors, setAuthors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/authors')
      .then(setAuthors)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Get total works count
  const totalWorks = authors.reduce((sum, a) => sum + (a.worksCount || 0), 0)

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-amber-400">🎭 Soliloquy Master</h1>
          <div className="flex items-center gap-4">
            <Link
              to="/stats"
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <BarChart2 size={20} />
              <span className="hidden sm:inline">Stats</span>
            </Link>
            <div className="text-gray-500 flex items-center gap-1">
              <KeyRound size={14} />
              <span className="text-sm">{userKey}</span>
            </div>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-white"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 2x2 Card Dashboard */}
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Card 1: Memorize & Test */}
          <Link
            to={authors.length > 0 ? `/author/${authors[0]?.id}` : '#'}
            className="block p-6 bg-gray-800 hover:bg-gray-750 rounded-xl transition-all group border border-gray-700 hover:border-amber-500/50"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/20 rounded-lg">
                <BookOpen size={28} className="text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white group-hover:text-amber-400 transition-colors">
                  Memorize & Test
                </h3>
                <p className="text-gray-400 mt-1 text-sm">
                  Practice and master Shakespeare's greatest soliloquies
                </p>
                <div className="mt-4 flex items-center gap-2 text-gray-500 text-sm">
                  <span className="text-4xl">{authors[0]?.portrait || '🎭'}</span>
                  <span>{totalWorks} works available</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Card 2: Get Inspired */}
          <Link
            to="/inspired"
            className="block p-6 bg-gray-800 hover:bg-gray-750 rounded-xl transition-all group border border-gray-700 hover:border-amber-500/50"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Play size={28} className="text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white group-hover:text-purple-400 transition-colors">
                  Get Inspired
                </h3>
                <p className="text-gray-400 mt-1 text-sm">
                  Watch master performances from legendary actors
                </p>
                <div className="mt-4 text-gray-500 text-sm">
                  Ian McKellen, Judi Dench, Kenneth Branagh & more
                </div>
              </div>
            </div>
          </Link>

          {/* Card 3: Fortune Cookie */}
          <Link
            to="/fortune"
            className="block p-6 bg-gray-800 hover:bg-gray-750 rounded-xl transition-all group border border-gray-700 hover:border-amber-500/50"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Coffee size={28} className="text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white group-hover:text-green-400 transition-colors">
                  Morning Muse
                </h3>
                <p className="text-gray-400 mt-1 text-sm">
                  A Shakespearean fortune cookie for your mood
                </p>
                <div className="mt-4 text-gray-500 text-sm italic">
                  "What's past is prologue..."
                </div>
              </div>
            </div>
          </Link>

          {/* Card 4: Coming Soon */}
          <div className="block p-6 bg-gray-800/50 rounded-xl border border-gray-700/50 opacity-60">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gray-600/20 rounded-lg">
                <Sparkles size={28} className="text-gray-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-400">
                  Coming Soon
                </h3>
                <p className="text-gray-500 mt-1 text-sm">
                  More features on the way
                </p>
                <div className="mt-4 text-gray-600 text-sm">
                  Stay tuned...
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
