import { useState, useEffect } from 'react'
import LoginScreen from './pages/LoginScreen'
import Dashboard from './pages/Dashboard'
import QuestPage from './pages/QuestPage'
import TasksPage from './pages/TasksPage'
import CoachPage from './pages/CoachPage'
import HistoryPage from './pages/HistoryPage'
import NavBar from './components/NavBar'
import { API } from './config'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [coachMessages, setCoachMessages] = useState([
    { role: 'assistant', content: 'Я твой наставник. Спроси совет, пожалуйся на лень или попроси план действий. Я знаю твои статы и буду строг.' }
  ])
  const [coachAddedTasks, setCoachAddedTasks] = useState({})

  const loginOrRegister = async (username) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/users?username=${encodeURIComponent(username)}`, {
        method: 'POST',
      })
      const data = await res.json()
      setUser(data)
      localStorage.setItem('liferpg_username', username)
      localStorage.setItem('liferpg_auth', 'username')
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const authLogin = async (provider, credential) => {
    if (provider === 'telegram_done') {
      setUser(credential)
      localStorage.setItem('liferpg_username', credential.username)
      localStorage.setItem('liferpg_auth', 'telegram')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(provider === 'google' ? { credential } : credential),
      })
      const data = await res.json()
      if (data.username) {
        setUser(data)
        localStorage.setItem('liferpg_username', data.username)
        localStorage.setItem('liferpg_auth', provider)
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const logout = () => {
    setUser(null)
    setPage('dashboard')
    setCoachMessages([{ role: 'assistant', content: 'Я твой наставник. Спроси совет, пожалуйся на лень или попроси план действий. Я знаю твои статы и буду строг.' }])
    setCoachAddedTasks({})
    localStorage.removeItem('liferpg_username')
    localStorage.removeItem('liferpg_auth')
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

  if (!user) return <LoginScreen onLogin={loginOrRegister} onAuthLogin={authLogin} loading={loading} />

  return (
    <div className="app-shell">
      <div className="app-content">
        {page === 'dashboard' && <Dashboard user={user} onNavigate={setPage} onLogout={logout} refreshUser={refreshUser} />}
        {page === 'quest' && <QuestPage user={user} setUser={setUser} refreshUser={refreshUser} />}
        {page === 'tasks' && <TasksPage user={user} />}
        {page === 'coach' && <CoachPage user={user} messages={coachMessages} setMessages={setCoachMessages} addedTasks={coachAddedTasks} setAddedTasks={setCoachAddedTasks} />}
        {page === 'history' && <HistoryPage user={user} />}
      </div>
      <NavBar currentPage={page} onNavigate={setPage} />
    </div>
  )
}

export default App
