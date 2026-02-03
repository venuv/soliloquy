import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../App'
import SumiLayout from './SumiLayout'

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper)' }}>
        <div className="sumi-heading text-xl" style={{ color: 'var(--ink-light)' }}>Loading...</div>
      </div>
    )
  }

  if (!author) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper)' }}>
        <div style={{ color: 'var(--crimson)' }}>Author not found</div>
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
    <SumiLayout title={author.name}>
      {/* Author header */}
      <div className="mb-10">
        <h1 className="sumi-heading text-3xl mb-2" style={{ color: 'var(--ink)' }}>
          {author.name}
        </h1>
        <p style={{ color: 'var(--ink-light)' }}>{author.subtitle}</p>
      </div>

      {/* Works count */}
      <p className="text-sm mb-6" style={{ color: 'var(--ink-faint)' }}>
        {author.works.length} works available
      </p>

      {/* Works List */}
      <div className="space-y-3">
        {author.works.map((work) => {
          const pct = getWorkProgress(work.id)
          return (
            <Link
              key={work.id}
              to={`/practice/${authorId}/${work.id}`}
              className="sumi-card block hover:border-gray-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="sumi-heading text-lg" style={{ color: 'var(--ink)' }}>
                    "{work.title}"
                  </h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--ink-light)' }}>
                    {work.character} · {work.source} · {work.act}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--ink-faint)' }}>
                    {work.chunks.length} passages
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {pct > 0 && (
                    <div className="text-right">
                      <div className="text-sm font-medium" style={{ color: 'var(--forest)' }}>{pct}%</div>
                      <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>mastered</div>
                    </div>
                  )}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    style={{ color: 'var(--ink-faint)' }}
                    className="group-hover:translate-x-1 transition-transform"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
              {pct > 0 && (
                <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: 'var(--forest)' }}
                  />
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </SumiLayout>
  )
}
