import { useState, useRef, useEffect } from 'react'
import { API } from '../config'
import './CoachPage.css'

const STAT_NAMES = {
  strength: 'Сила',
  intelligence: 'Интеллект',
  creativity: 'Креативность',
  discipline: 'Дисциплина',
  social: 'Социальность',
}

function toLocalDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function parseMessage(text) {
  const parts = []
  const taskRegex = /\[TASK:([^|]+)\|([^\]]+)\]/g
  let lastIndex = 0
  let match

  while ((match = taskRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'task', title: match[1].trim(), stat: match[2].trim() })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) })
  }

  return parts
}

function renderText(text) {
  return text.split(/(\*\*[^*]+\*\*)/).map((seg, i) => {
    if (seg.startsWith('**') && seg.endsWith('**')) {
      return <strong key={i}>{seg.slice(2, -2)}</strong>
    }
    return seg
  })
}

function CoachPage({ user, messages, setMessages, addedTasks, setAddedTasks }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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
        body: JSON.stringify({
          messages: newMessages
            .filter((m, idx) => !(m.role === 'assistant' && idx === 0))
            .map(m => ({ role: m.role, content: m.content }))
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка связи с наставником...' }])
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  const addTask = async (title, stat) => {
    const key = `${title}_${stat}`
    if (addedTasks[key]) return

    const today = toLocalDate(new Date())
    const form = new FormData()
    form.append('title', title)
    form.append('stat', stat)
    form.append('xp', '50')
    form.append('scheduled_date', today)

    try {
      await fetch(`${API}/users/${encodeURIComponent(user.username)}/tasks`, {
        method: 'POST',
        body: form,
      })
      setAddedTasks(prev => ({ ...prev, [key]: true }))
    } catch (err) {
      console.error(err)
    }
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
        {messages.map((m, i) => {
          const parts = m.role === 'assistant' ? parseMessage(m.content) : null

          return (
            <div key={i} className={`msg ${m.role}`}>
              {m.role === 'user' ? (
                <div className="msg-bubble">{m.content}</div>
              ) : (
                <div className="msg-bubble">
                  {parts.map((p, j) => {
                    if (p.type === 'text') {
                      return <span key={j}>{renderText(p.content)}</span>
                    }
                    const key = `${p.title}_${p.stat}`
                    const added = addedTasks[key]
                    return (
                      <div key={j} className="task-suggest">
                        <div className="task-suggest-info">
                          <span className="task-suggest-title">{p.title}</span>
                          <span className="task-suggest-stat mono">{STAT_NAMES[p.stat] || p.stat}</span>
                        </div>
                        <button
                          className={`task-suggest-btn ${added ? 'added' : ''}`}
                          onClick={() => addTask(p.title, p.stat)}
                          disabled={added}
                        >
                          {added ? 'Добавлено' : '+ Задача'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
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
