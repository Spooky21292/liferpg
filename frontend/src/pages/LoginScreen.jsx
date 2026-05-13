import { useState, useEffect, useCallback, useRef } from 'react'
import './LoginScreen.css'

const GOOGLE_CLIENT_ID = '855103585243-fqcdk0a5ces4i1b1gfd1vafvhlcrmpcu.apps.googleusercontent.com'
const TELEGRAM_BOT_NAME = 'liferrpg_app_bot'

function LoginScreen({ onLogin, onAuthLogin, loading }) {
  const [username, setUsername] = useState('')
  const tgRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (username.trim()) onLogin(username.trim())
  }

  const handleGoogleResponse = useCallback(async (response) => {
    if (response.credential) {
      onAuthLogin('google', response.credential)
    }
  }, [onAuthLogin])

  useEffect(() => {
    window.onTelegramAuth = (tgUser) => {
      onAuthLogin('telegram', tgUser)
    }
    return () => { delete window.onTelegramAuth }
  }, [onAuthLogin])

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      })
      window.google?.accounts.id.renderButton(
        document.getElementById('google-btn'),
        {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          width: 320,
          text: 'continue_with',
          shape: 'rectangular',
          locale: 'ru',
        }
      )
    }
    document.head.appendChild(script)
    return () => {
      document.head.removeChild(script)
    }
  }, [handleGoogleResponse])

  useEffect(() => {
    if (!tgRef.current) return
    const container = tgRef.current
    container.innerHTML = ''
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', TELEGRAM_BOT_NAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-userpic', 'false')
    container.appendChild(script)
  }, [])

  return (
    <div className="login">
      <div className="login-content animate-in">
        <h1 className="login-title">LifeRPG</h1>
        <p className="login-sub">Прокачай себя в реальной жизни</p>

        <div className="login-auth">
          <div id="google-btn" className="google-btn-wrap"></div>
          <div ref={tgRef} className="tg-btn-wrap"></div>
        </div>

        <div className="login-divider">
          <span>или</span>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Имя героя"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input"
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
