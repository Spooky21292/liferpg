import './Dashboard.css'

const STATS = [
  { key: 'strength', name: 'Сила' },
  { key: 'intelligence', name: 'Интеллект' },
  { key: 'creativity', name: 'Креативность' },
  { key: 'discipline', name: 'Дисциплина' },
  { key: 'social', name: 'Социальность' },
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
      <div className="stats">
        {STATS.map(({ key, name }) => (
          <div className="stat-row" key={key}>
            <span className="stat-name">{name}</span>
            <div className="stat-right">
              <span className="stat-val mono">{user.stats[key]}</span>
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
