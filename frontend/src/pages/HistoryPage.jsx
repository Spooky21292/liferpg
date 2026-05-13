import { useState, useEffect } from 'react'
import './HistoryPage.css'

const API = '/api'

const STAT_NAMES = {
  strength: 'Сила',
  intelligence: 'Интеллект',
  creativity: 'Креативность',
  discipline: 'Дисциплина',
  social: 'Социальность',
}

function HistoryPage({ user }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/users/${encodeURIComponent(user.username)}/history`)
      .then(r => r.json())
      .then(data => { setHistory(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user.username])

  if (loading) return <div className="history"><p className="history-empty">Загрузка...</p></div>

  return (
    <div className="history animate-in">
      <h2 className="history-title">История</h2>

      {history.length === 0 && (
        <p className="history-empty">Пока пусто. Выполни первый квест.</p>
      )}

      <div className="history-list">
        {history.map((item, i) => (
          <div key={i} className={`history-item ${item.ai_approved ? '' : 'rejected'}`}>
            <div className="history-top">
              <span className="history-status mono">
                {item.ai_approved ? 'OK' : 'X'}
              </span>
              <span className="history-date mono">
                {item.completed_at
                  ? new Date(item.completed_at).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'short',
                    })
                  : ''}
              </span>
            </div>
            {item.comment && <p className="history-comment">{item.comment}</p>}
            <p className="history-verdict">{item.ai_verdict}</p>
            {item.ai_approved && (
              <div className="history-rewards mono">
                +{item.xp_earned} xp
                {item.stat_type && <span> · +1 {STAT_NAMES[item.stat_type] || item.stat_type}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default HistoryPage
