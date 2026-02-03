import { Link } from 'react-router-dom'
import { useAuth } from '../App'

/**
 * Shared layout wrapper for interior pages with sumi aesthetic
 */
export default function SumiLayout({ children, title, backLink = '/', backLabel = 'Home' }) {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      {/* Header */}
      <header className="flex justify-between items-baseline px-10 py-6 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="flex items-baseline gap-6">
          <Link to="/" className="sumi-heading text-xl" style={{ color: 'var(--ink)', textDecoration: 'none' }}>
            Soliloquy Master
          </Link>
          {title && (
            <>
              <span style={{ color: 'var(--ink-faint)' }}>/</span>
              <span className="sumi-heading text-lg" style={{ color: 'var(--ink-light)' }}>{title}</span>
            </>
          )}
        </div>
        <nav className="flex gap-8">
          <Link to="/inspired" className="sumi-nav-link">Performances</Link>
          <Link to="/fortune" className="sumi-nav-link">Daily Muse</Link>
          <button onClick={logout} className="sumi-nav-link cursor-pointer bg-transparent border-none">
            Sign out
          </button>
        </nav>
      </header>

      {/* Main content */}
      <main className="px-10 py-8 max-w-5xl mx-auto">
        {/* Back link */}
        {backLink && (
          <Link
            to={backLink}
            className="inline-flex items-center gap-2 mb-6 text-sm"
            style={{ color: 'var(--ink-light)', textDecoration: 'none' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {backLabel}
          </Link>
        )}

        {children}
      </main>

      {/* Footer */}
      <footer className="flex justify-between px-10 py-6 text-xs border-t mt-auto" style={{ color: 'var(--ink-faint)', borderColor: 'rgba(0,0,0,0.06)' }}>
        <span>Soliloquy Master</span>
        <span>A tool for the aspiring player</span>
      </footer>
    </div>
  )
}
