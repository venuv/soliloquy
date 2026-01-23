import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, api } from '../App'
import { LogOut, BarChart2, KeyRound, Sparkles } from 'lucide-react'

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

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-amber-400">🎭 Soliloquy Master</h1>
          <div className="flex items-center gap-4">
            <Link
              to="/inspired"
              className="text-gray-400 hover:text-amber-400 flex items-center gap-2"
            >
              <Sparkles size={20} />
              <span className="hidden sm:inline">Get Inspired</span>
            </Link>
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

      {/* Authors Grid */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-gray-400 mb-4">Select an author to begin</h2>
        
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : (
          <div className="space-y-3">
            {authors.map((author) => (
              <Link
                key={author.id}
                to={`/author/${author.id}`}
                className="block p-6 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{author.portrait}</span>
                  <div className="flex-1">
                    <h3 className="text-xl text-white group-hover:text-amber-400 transition-colors">
                      {author.name}
                    </h3>
                    <p className="text-gray-400">{author.subtitle}</p>
                  </div>
                  <span className="text-gray-500">
                    {author.worksCount} works
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && authors.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No authors available. Check server connection.
          </div>
        )}
      </div>
    </div>
  )
}
