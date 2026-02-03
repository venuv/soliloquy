import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './components/Home'
import AuthorWorks from './components/AuthorWorks'
import Practice from './components/Practice'
import Stats from './components/Stats'
import Login from './components/Login'
import Visualize from './components/Visualize'
import GetInspired from './components/GetInspired'
import MorningMuse from './components/MorningMuse'
import ArtworkGallery from './components/ArtworkGallery'

// Auth Context
const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

// API helper with auth
export async function api(endpoint, options = {}) {
  const key = localStorage.getItem('userKey')
  const headers = {
    'Content-Type': 'application/json',
    ...(key && { 'X-User-Key': key }),
    ...options.headers
  }
  
  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
    credentials: 'include'
  })
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }
  
  return res.json()
}

function App() {
  const [userKey, setUserKey] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedKey = localStorage.getItem('userKey')
    if (savedKey) {
      // Validate the key
      api('/auth/validate', {
        method: 'POST',
        body: JSON.stringify({ key: savedKey })
      })
        .then(() => {
          setUserKey(savedKey)
        })
        .catch(() => {
          localStorage.removeItem('userKey')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = (key) => {
    localStorage.setItem('userKey', key)
    setUserKey(key)
  }

  const logout = () => {
    localStorage.removeItem('userKey')
    setUserKey(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-amber-400 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ userKey, login, logout }}>
      <Routes>
        <Route path="/login" element={userKey ? <Navigate to="/" /> : <Login />} />
        <Route path="/" element={userKey ? <Home /> : <Navigate to="/login" />} />
        <Route path="/author/:authorId" element={userKey ? <AuthorWorks /> : <Navigate to="/login" />} />
        <Route path="/practice/:authorId/:workId" element={userKey ? <Practice /> : <Navigate to="/login" />} />
        <Route path="/visualize/:authorId/:workId" element={userKey ? <Visualize /> : <Navigate to="/login" />} />
        <Route path="/stats" element={userKey ? <Stats /> : <Navigate to="/login" />} />
        <Route path="/inspired" element={userKey ? <GetInspired /> : <Navigate to="/login" />} />
        <Route path="/fortune" element={userKey ? <MorningMuse /> : <Navigate to="/login" />} />
        <Route path="/artwork" element={userKey ? <ArtworkGallery /> : <Navigate to="/login" />} />
      </Routes>
    </AuthContext.Provider>
  )
}

export default App
