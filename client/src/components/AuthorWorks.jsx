import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../App'
import { Home, BookOpen, GraduationCap, ChevronRight } from 'lucide-react'

export default function AuthorWorks() {
  const { authorId } = useParams()
  const [author, setAuthor] = useState(null)
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api(`/authors/${authorId}`),
      api('/analytics/progress')
    ])
      .then(([authorData, progressData]) => {
        setAuthor(authorData)
        setProgress(progressData.progress || {})
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [authorId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-amber-400">Loading...</div>
      </div>
    )
  }

  if (!author) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400">Author not found</div>
      </div>
    )
  }

  const getWorkProgress = (workId) => {
    const key = `${authorId}/${workId}`
    const workProgress = progress[key]
    if (!workProgress || !workProgress.mastered) return 0
    const work = author.works.find(w => w.id === workId)
    if (!work) return 0
    return Math.round((workProgress.mastered.length / work.chunks.length) * 100)
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <Link to="/" className="text-gray-400 hover:text-white flex items-center gap-2 mb-4">
          <Home size={20} />
          <span>Back to Authors</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <span className="text-5xl">{author.portrait}</span>
          <div>
            <h1 className="text-3xl font-bold text-white">{author.name}</h1>
            <p className="text-gray-400">{author.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Works List */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-gray-400 mb-4">{author.works.length} works available</h2>
        
        <div className="space-y-2">
          {author.works.map((work) => {
            const pct = getWorkProgress(work.id)
            return (
              <Link
                key={work.id}
                to={`/practice/${authorId}/${work.id}`}
                className="block p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg text-white group-hover:text-amber-400 transition-colors">
                      "{work.title}"
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {work.character} • {work.source} • {work.act}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      {work.chunks.length} chunks
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {pct > 0 && (
                      <div className="text-right">
                        <div className="text-green-400 text-sm font-medium">{pct}%</div>
                        <div className="text-gray-500 text-xs">mastered</div>
                      </div>
                    )}
                    <ChevronRight className="text-gray-500 group-hover:text-amber-400" size={20} />
                  </div>
                </div>
                {pct > 0 && (
                  <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
