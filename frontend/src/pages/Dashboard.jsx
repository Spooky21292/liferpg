import { useState } from 'react'
import { API } from '../config'
import './Dashboard.css'

const STATS = [
  { key: 'strength', name: 'Сила', icon: '⚡' },
  { key: 'intelligence', name: 'Интеллект', icon: '◎' },
  { key: 'creativity', name: 'Креативность', icon: '✦' },
  { key: 'discipline', name: 'Дисциплина', icon: '→' },
  { key: 'social', name: 'Социальность', icon: '◈' },
]

function Dashboard({ user, onNavigate, onLogout, refreshUser }) {
  const xpPercent = Math.min(100, (user.xp_current_level / user.xp_for_next) * 100)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('⚡')

  const customStats = user.custom_stats || []

  const addStat = async () => {
    if (!newName.trim()) return
    const form = new FormData()
    form.append('name', newName.trim())
    form.append('icon', newIcon)
    try {
      await fetch(`${API}/users/${encodeURIComponent(user.username)}/custom-stats`, {
        method: 'POST',
        body: form,
      })
      setNewName('')
      setShowAdd(false)
      if (refreshUser) refreshUser()
    } catch (err) {
      console.error(err)
    }
  }

  const deleteStat = async (statId) => {
    try {
      await fetch(`${API}/users/${encodeURIComponent(user.username)}/custom-stats/${statId}`, {
        method: 'DELETE',
      })
      if (refreshUser) refreshUser()
    } catch (err) {
      console.error(err)
    }
  }

  const icons = ['⚡', '◎', '✦', '→', '◈', '♦', '★', '▲', '●', '♠', '♣', '♥']

  return (
    <div className="dash page-scroll animate-in">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-name">{user.username}</h1>
          <span className="dash-level mono">LVL {user.level}</span>
        </div>
        {user.streak_days > 0 && (
          <span className="dash-streak mono">{user.streak_days}d streak</span>
        )}
      </div>

      {/* XP Bar */}
      <div className="xp-section">
        <div className="xp-label">
          <span className="mono">{user.xp_current_level}</span>
          <span className="mono xp-max">/ {user.xp_for_next} XP</span>
        </div>
        <div className="xp-track">
          <div className="xp-bar" style={{ width: `${xpPercent}%` }} />
        </div>
      </div>

      {/* Stats */}
      <div className="stats-card">
        {STATS.map(({ key, name, icon }) => (
          <div className="stat-row" key={key}>
            <span className="stat-icon">{icon}</span>
            <div className="stat-info">
              <div className="stat-top">
                <span className="stat-name">{name}</span>
                <span className="stat-val mono">{user.stats[key]}</span>
              </div>
              <div className="stat-track">
                <div
                  className="stat-bar"
                  style={{ width: `${Math.min(100, user.stats[key] * 5)}%` }}
                />
              </div>
            </div>
          </div>
        ))}

        {customStats.map((cs) => (
          <div className="stat-row" key={cs.key}>
            <span className="stat-icon">{cs.icon}</span>
            <div className="stat-info">
              <div className="stat-top">
                <span className="stat-name">{cs.name}</span>
                <span className="stat-val mono">{cs.value}</span>
              </div>
              <div className="stat-track">
                <div
                  className="stat-bar"
                  style={{ width: `${Math.min(100, cs.value * 5)}%` }}
                />
              </div>
            </div>
            <button className="stat-delete" onClick={() => deleteStat(cs.id)}>×</button>
          </div>
        ))}
      </div>

      {/* Add custom stat */}
      {!showAdd ? (
        <button className="add-stat-btn" onClick={() => setShowAdd(true)}>
          + Добавить стат
        </button>
      ) : (
        <div className="add-stat-form">
          <div className="icon-picker">
            {icons.map(ic => (
              <button
                key={ic}
                className={`icon-opt ${newIcon === ic ? 'selected' : ''}`}
                onClick={() => setNewIcon(ic)}
              >{ic}</button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Название стата"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="input"
            maxLength={30}
          />
          <div className="add-stat-actions">
            <button className="btn" onClick={addStat} disabled={!newName.trim()}>Добавить</button>
            <button className="btn-cancel" onClick={() => { setShowAdd(false); setNewName('') }}>Отмена</button>
          </div>
        </div>
      )}

      {/* CTA */}
      <button className="cta" onClick={() => onNavigate('quest')}>
        Текущий квест →
      </button>

      <button className="logout-btn" onClick={onLogout}>
        Выйти
      </button>
    </div>
  )
}

export default Dashboard
