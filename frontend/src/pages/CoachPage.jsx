import { useState, useRef, useEffect } from 'react'
import './CoachPage.css'

const API = '/api'

function CoachPage({ user }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Я твой наставник. Спроси совет, пожалуйся на лень или попроси план действий. Я знаю твои статы и буду строг.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API}/users/${encodeURIComponent(user.username)}/coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.filter(m => m.role !== 'assistant' || newMessages.indexOf(m) > 0).map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка связи с наставником...' }])
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="coach-page">
      <div className="coach-header">
        <h1 className="coach-title">Наставник</h1>
        <span className="coach-sub mono">lvl {user.level} / streak {user.streak_days}d</span>
      </div>

      <div className="chat-area">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="msg-bubble">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="msg assistant">
            <div className="msg-bubble typing">...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Напиши наставнику..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
        />
        <button className="send-btn" onClick={send} disabled={!input.trim() || loading}>
          &rarr;
        </button>
      </div>
    </div>
  )
}

export default CoachPage
