import './Dashboard.css'

const STATS = [
  { key: 'strength', name: 'Сила', icon: '⚡' },
  { key: 'intelligence', name: 'Интеллект', icon: '◎' },
  { key: 'creativity', name: 'Креативность', icon: '✦' },
  { key: 'discipline', name: 'Дисциплина', icon: '→' },
  { key: 'social', name: 'Социальность', icon: '◈' },
]

function Dashboard({ user, onNavigate, onLogout }) {
  const xpPercent = Math.min(100, (user.xp_current_level / user.xp_for_next) * 100)

  return (
    <div className="dash animate-in">
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
        {STATS.map(({ key, name, icon }, i) => (
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
      </div>

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
