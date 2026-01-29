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
      <div style={{ minHeight: '100vh', background: '#fdfcf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#9b2d30', fontFamily: "'Cormorant', serif", fontSize: '1.25rem' }}>Loading...</div>
      </div>
    )
  }

  if (!author) {
    return (
      <div style={{ minHeight: '100vh', background: '#fdfcf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#9b2d30' }}>Author not found</div>
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
    <div style={{
      minHeight: '100vh',
      background: '#fdfcf8',
      fontFamily: "'IBM Plex Sans', sans-serif",
      padding: '1.5rem'
    }}>
      {/* Header */}
      <div style={{ maxWidth: '40rem', margin: '0 auto 2rem' }}>
        <Link to="/" style={{ color: '#4a4a4a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
          <Home size={18} />
          <span>Back to Home</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '3rem' }}>{author.portrait}</span>
          <div>
            <h1 style={{ fontFamily: "'Cormorant', serif", fontSize: '2rem', color: '#1a1a1a', fontWeight: 400, margin: 0 }}>{author.name}</h1>
            <p style={{ color: '#4a4a4a', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>{author.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Works List */}
      <div style={{ maxWidth: '40rem', margin: '0 auto' }}>
        <h2 style={{ color: '#4a4a4a', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 400 }}>{author.works.length} works available</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {author.works.map((work) => {
            const pct = getWorkProgress(work.id)
            return (
              <Link
                key={work.id}
                to={`/practice/${authorId}/${work.id}`}
                style={{
                  display: 'block',
                  padding: '1rem 1.25rem',
                  background: 'rgba(0,0,0,0.02)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(155, 45, 48, 0.04)'
                  e.currentTarget.style.borderColor = 'rgba(155, 45, 48, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.02)'
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontFamily: "'Cormorant', serif", fontSize: '1.1rem', color: '#1a1a1a', margin: 0, fontWeight: 400 }}>
                      "{work.title}"
                    </h3>
                    <p style={{ color: '#4a4a4a', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                      {work.character} • {work.source} • {work.act}
                    </p>
                    <p style={{ color: '#9a9a9a', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                      {work.chunks.length} chunks
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {pct > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#3d5c4a', fontSize: '0.85rem', fontWeight: 500 }}>{pct}%</div>
                        <div style={{ color: '#9a9a9a', fontSize: '0.7rem' }}>mastered</div>
                      </div>
                    )}
                    <ChevronRight size={18} style={{ color: '#9a9a9a' }} />
                  </div>
                </div>
                {pct > 0 && (
                  <div style={{ marginTop: '0.5rem', height: '3px', background: 'rgba(0,0,0,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        background: '#3d5c4a',
                        borderRadius: '2px',
                        width: `${pct}%`,
                        transition: 'width 0.3s'
                      }}
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
