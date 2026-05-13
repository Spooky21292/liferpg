import { useState, useEffect } from 'react'
import LoginScreen from './pages/LoginScreen'
import Dashboard from './pages/Dashboard'
import QuestPage from './pages/QuestPage'
import HistoryPage from './pages/HistoryPage'
import NavBar from './components/NavBar'
import './App.css'

const API = '/api'

function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [loading, setLoading] = useState(false)

  const loginOrRegister = async (username) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/users?username=${encodeURIComponent(username)}`, {
        method: 'POST',
      })
      const data = await res.json()
      setUser(data)
      localStorage.setItem('liferpg_username', username)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const refreshUser = async () => {
    if (!user) return
    try {
      const res = await fetch(`${API}/users/${encodeURIComponent(user.username)}`)
      const data = await res.json()
      setUser(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('liferpg_username')
    if (saved) loginOrRegister(saved)
  }, [])

  if (!user) return <LoginScreen onLogin={loginOrRegister} loading={loading} />

  return (
    <div>
      {page === 'dashboard' && <Dashboard user={user} onNavigate={setPage} />}
      {page === 'quest' && <QuestPage user={user} setUser={setUser} refreshUser={refreshUser} />}
      {page === 'history' && <HistoryPage user={user} />}
      <NavBar
        currentPage={page}
        onNavigate={setPage}
        onLogout={() => { setUser(null); localStorage.removeItem('liferpg_username') }}
      />
    </div>
  )
}

export default App
