import { useState } from 'react'
import './LoginScreen.css'

function LoginScreen({ onLogin, loading }) {
  const [username, setUsername] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (username.trim()) {
      onLogin(username.trim())
    }
  }

  return (
    <div className="login-screen">
      <div className="login-bg-effects">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      <div className="login-content animate-fade-in">
        <div className="login-logo animate-float">
          <span className="logo-emoji">⚔️</span>
        </div>

        <h1 className="login-title pixel-title">LifeRPG</h1>
        <p className="login-subtitle">Прокачай свою жизнь</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="text"
              placeholder="Введи имя героя..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="login-input"
              autoFocus
              maxLength={30}
            />
          </div>

          <button
            type="submit"
            className="login-btn animate-glow"
            disabled={!username.trim() || loading}
          >
            {loading ? '⏳ Загрузка...' : '🎮 Начать приключение'}
          </button>
        </form>

        <div className="login-features">
          <div className="feature">
            <span>📸</span>
            <span>AI проверяет фото</span>
          </div>
          <div className="feature">
            <span>🎮</span>
            <span>RPG прокачка</span>
          </div>
          <div className="feature">
            <span>🎁</span>
            <span>Лутбоксы</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen
