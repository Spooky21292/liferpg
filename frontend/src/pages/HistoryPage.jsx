import { useState, useEffect } from 'react'
import './HistoryPage.css'

const API = '/api'

const STAT_ICONS = {
  strength: '💪',
  intelligence: '🧠',
  creativity: '🎨',
  discipline: '🎯',
  social: '👥',
}

function HistoryPage({ user }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/users/${encodeURIComponent(user.username)}/history`)
      .then(r => r.json())
      .then(data => {
        setHistory(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user.username])

  if (loading) {
    return (
      <div className="history-page">
        <div className="loading-spinner">⏳ Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="history-page animate-fade-in">
      <h2 className="history-title">📜 История заданий</h2>

      {history.length === 0 && (
        <div className="empty-history">
          <span>📋</span>
          <p>Пока пусто</p>
          <p className="empty-hint">Выполни первый квест, чтобы начать историю!</p>
        </div>
      )}

      <div className="history-list">
        {history.map((item, i) => (
          <div
            key={i}
            className={`history-item ${item.ai_approved ? 'approved' : 'rejected'}`}
          >
            <div className="history-status">
              {item.ai_approved ? '✅' : '❌'}
            </div>

            <div className="history-content">
              <div className="history-quest-id">{item.quest_id}</div>
              {item.comment && (
                <p className="history-comment">{item.comment}</p>
              )}
              <p className="history-verdict">{item.ai_verdict}</p>

              <div className="history-meta">
                {item.ai_approved && (
                  <>
                    <span className="history-xp">+{item.xp_earned} XP</span>
                    <span className="history-coins">+{item.coins_earned} 🪙</span>
                    {item.stat_type && (
                      <span className="history-stat">
                        {STAT_ICONS[item.stat_type]} +1
                      </span>
                    )}
                  </>
                )}
                <span className="history-date">
                  {item.completed_at
                    ? new Date(item.completed_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HistoryPage
