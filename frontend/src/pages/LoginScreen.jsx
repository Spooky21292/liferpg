import { useState } from 'react'
import './LoginScreen.css'

function LoginScreen({ onLogin, loading }) {
  const [username, setUsername] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (username.trim()) onLogin(username.trim())
  }

  return (
    <div className="login">
      <div className="login-content animate-in">
        <h1 className="login-title">LifeRPG</h1>
        <p className="login-sub">Прокачай себя в реальной жизни</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Имя героя"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input"
            autoFocus
            maxLength={30}
          />
          <button type="submit" className="btn" disabled={!username.trim() || loading}>
            {loading ? 'Загрузка...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginScreen
