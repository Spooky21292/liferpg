import { useState, useEffect, useCallback, useRef } from 'react'
import './LoginScreen.css'

const API = '/api'
const GOOGLE_CLIENT_ID = '855103585243-fqcdk0a5ces4i1b1gfd1vafvhlcrmpcu.apps.googleusercontent.com'

function LoginScreen({ onLogin, onAuthLogin, loading }) {
  const [username, setUsername] = useState('')
  const [tgLink, setTgLink] = useState(null)
  const [tgToken, setTgToken] = useState(null)
  const [tgWaiting, setTgWaiting] = useState(false)
  const pollRef = useRef(null)

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

  const startTelegramAuth = async () => {
    try {
      const res = await fetch(`${API}/auth/telegram/init`, { method: 'POST' })
      const data = await res.json()
      setTgLink(data.link)
      setTgToken(data.token)
      setTgWaiting(true)
      window.open(data.link, '_blank')
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (!tgWaiting || !tgToken) return

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/auth/telegram/check/${tgToken}`)
        const data = await res.json()
        if (data.status === 'ok' && data.user) {
          clearInterval(pollRef.current)
          setTgWaiting(false)
          onAuthLogin('telegram_done', data.user)
        }
      } catch {}
    }, 2000)

    return () => clearInterval(pollRef.current)
  }, [tgWaiting, tgToken, onAuthLogin])

  return (
    <div className="login">
      <div className="login-content animate-in">
        <h1 className="login-title">LifeRPG</h1>
        <p className="login-sub">Прокачай себя в реальной жизни</p>

        <div className="login-auth">
          <div id="google-btn" className="google-btn-wrap"></div>

          {!tgWaiting ? (
            <button className="tg-login-btn" onClick={startTelegramAuth}>
              Войти через Telegram
            </button>
          ) : (
            <div className="tg-waiting">
              <p className="tg-waiting-text">Нажми Start в боте...</p>
              <a href={tgLink} target="_blank" rel="noopener noreferrer" className="tg-link">
                Открыть бота снова
              </a>
            </div>
          )}
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
