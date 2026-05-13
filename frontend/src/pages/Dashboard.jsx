import './Dashboard.css'

const STAT_CONFIG = {
  strength: { name: 'Сила', icon: '💪', color: '#ef4444' },
  intelligence: { name: 'Интеллект', icon: '🧠', color: '#3b82f6' },
  creativity: { name: 'Креативность', icon: '🎨', color: '#a855f7' },
  discipline: { name: 'Дисциплина', icon: '🎯', color: '#22c55e' },
  social: { name: 'Социальность', icon: '👥', color: '#f59e0b' },
}

const BG_MAP = {
  bg_forest: { emoji: '🌲', gradient: 'linear-gradient(135deg, #064e3b, #065f46)' },
  bg_mountain: { emoji: '🏔️', gradient: 'linear-gradient(135deg, #1e3a5f, #2d5a87)' },
  bg_castle: { emoji: '🏰', gradient: 'linear-gradient(135deg, #4a1942, #6b2fa0)' },
  bg_space: { emoji: '🚀', gradient: 'linear-gradient(135deg, #0a0a2e, #1a1a4e)' },
}

function Dashboard({ user, onNavigate }) {
  const xpPercent = Math.min(100, (user.xp_current_level / user.xp_for_next) * 100)
  const totalStats = Object.values(user.stats).reduce((a, b) => a + b, 0)

  const bg = user.equipped?.background && BG_MAP[user.equipped.background]
  const avatarStyle = bg ? { background: bg.gradient } : {}

  return (
    <div className="dashboard animate-fade-in">
      {/* Avatar Card */}
      <div className="hero-card" style={avatarStyle}>
        <div className="hero-header">
          <div className="hero-avatar-area">
            <div className="hero-avatar animate-float">
              <span className="avatar-emoji">🧙</span>
              {user.equipped?.armor && <span className="equip-badge armor-badge">🛡️</span>}
              {user.equipped?.weapon && <span className="equip-badge weapon-badge">⚔️</span>}
              {user.equipped?.effect && <span className="equip-badge effect-badge">✨</span>}
            </div>
          </div>

          <div className="hero-info">
            <h2 className="hero-name">{user.username}</h2>
            <div className="hero-level">
              <span className="level-badge">LVL {user.level}</span>
              <span className="hero-title">{user.avatar_name}</span>
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="xp-section">
          <div className="xp-info">
            <span>XP</span>
            <span>{user.xp_current_level} / {user.xp_for_next}</span>
          </div>
          <div className="xp-bar">
            <div className="xp-fill" style={{ width: `${xpPercent}%` }}></div>
          </div>
        </div>

        {/* Coins & Streak */}
        <div className="hero-meta">
          <div className="meta-item coins">
            <span>🪙</span>
            <span>{user.coins}</span>
          </div>
          <div className="meta-item streak">
            <span>🔥</span>
            <span>{user.streak_days} дней</span>
          </div>
          <div className="meta-item power">
            <span>⚡</span>
            <span>{totalStats}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-section">
        <h3 className="section-title">Характеристики</h3>
        <div className="stats-grid">
          {Object.entries(user.stats).map(([key, value]) => {
            const config = STAT_CONFIG[key]
            return (
              <div className="stat-card" key={key}>
                <div className="stat-icon">{config.icon}</div>
                <div className="stat-info">
                  <span className="stat-name">{config.name}</span>
                  <span className="stat-value" style={{ color: config.color }}>{value}</span>
                </div>
                <div className="stat-bar-bg">
                  <div
                    className="stat-bar-fill"
                    style={{
                      width: `${Math.min(100, value * 5)}%`,
                      background: config.color,
                    }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="action-btn quest-btn animate-glow" onClick={() => onNavigate('quest')}>
          <span>⚔️</span>
          <span>Текущий квест</span>
        </button>
        <button className="action-btn shop-btn" onClick={() => onNavigate('shop')}>
          <span>🏪</span>
          <span>Магазин</span>
        </button>
      </div>
    </div>
  )
}

export default Dashboard
