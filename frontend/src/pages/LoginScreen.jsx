import { useState, useEffect, useCallback, useRef } from 'react'
import { API, isNative } from '../config'
import './LoginScreen.css'
const GOOGLE_CLIENT_ID = '855103585243-fqcdk0a5ces4i1b1gfd1vafvhlcrmpcu.apps.googleusercontent.com'

function LoginScreen({ onLogin, onAuthLogin, loading }) {
  const [username, setUsername] = useState('')
  const [tgLink, setTgLink] = useState(null)
  const [tgToken, setTgToken] = useState(null)
  const [tgWaiting, setTgWaiting] = useState(false)
  const [googleToken, setGoogleToken] = useState(null)
  const [googleWaiting, setGoogleWaiting] = useState(false)
  const pollRef = useRef(null)
  const googlePollRef = useRef(null)

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
    if (isNative) return
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

  const startGoogleAuth = async () => {
    try {
      const res = await fetch(`${API}/auth/google/init`, { method: 'POST' })
      const data = await res.json()
      setGoogleToken(data.token)
      setGoogleWaiting(true)
      window.location.href = data.url
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (!googleWaiting || !googleToken) return
    googlePollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/auth/google/check/${googleToken}`)
        const data = await res.json()
        if (data.status === 'ok' && data.user) {
          clearInterval(googlePollRef.current)
          setGoogleWaiting(false)
          onAuthLogin('telegram_done', data.user)
        }
      } catch {}
    }, 2000)
    return () => clearInterval(googlePollRef.current)
  }, [googleWaiting, googleToken, onAuthLogin])

  const startTelegramAuth = async () => {
    try {
      const res = await fetch(`${API}/auth/telegram/init`, { method: 'POST' })
      const data = await res.json()
      setTgLink(data.link)
      setTgToken(data.token)
      setTgWaiting(true)
      if (isNative) {
        window.location.href = data.link
      } else {
        window.open(data.link, '_blank')
      }
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

        <div className="login-divider">
          <span>или</span>
        </div>

        <div className="login-auth">
          {isNative ? (
            <button className="google-native-btn" onClick={startGoogleAuth}>
              Войти через Google
            </button>
          ) : (
            <div id="google-btn" className="google-btn-wrap"></div>
          )}

          {!tgWaiting ? (
            <button className="tg-login-btn" onClick={startTelegramAuth}>
              Войти через Telegram
            </button>
          ) : (
            <div className="tg-waiting">
              <p className="tg-waiting-text">Нажми Start в боте...</p>
              <a href={tgLink} className="tg-link" onClick={(e) => {
                if (isNative) {
                  e.preventDefault()
                  window.location.href = tgLink
                }
              }}>
                Открыть бота снова
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LoginScreen
