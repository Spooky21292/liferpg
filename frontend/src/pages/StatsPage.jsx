import { useState, useEffect } from 'react'
import { API } from '../config'
import './StatsPage.css'

const STAT_LABELS = {
  strength: 'Сила',
  intelligence: 'Интеллект',
  creativity: 'Креативность',
  discipline: 'Дисциплина',
  social: 'Социальность',
}

const STAT_KEYS = ['strength', 'intelligence', 'creativity', 'discipline', 'social']

function MiniChart({ data, maxVal }) {
  if (!data.length) return null
  const h = 60
  const w = 100
  const max = maxVal || Math.max(...data, 1)
  const step = w / Math.max(data.length - 1, 1)

  const points = data.map((v, i) => `${i * step},${h - (v / max) * h}`).join(' ')
  const areaPoints = `0,${h} ${points} ${(data.length - 1) * step},${h}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mini-chart" preserveAspectRatio="none">
      <polygon points={areaPoints} fill="rgba(255,255,255,0.05)" />
      <polyline points={points} fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
      {data.length > 0 && (
        <circle cx={(data.length - 1) * step} cy={h - (data[data.length - 1] / max) * h} r="2.5" fill="#fff" />
      )}
    </svg>
  )
}

function BarChart({ items, maxVal }) {
  if (!items.length) return null
  const max = maxVal || Math.max(...items.map(i => i.value), 1)

  return (
    <div className="bar-chart">
      {items.map((item, i) => (
        <div key={i} className="bar-col">
          <div className="bar-wrap">
            <div className="bar-fill" style={{ height: `${(item.value / max) * 100}%` }} />
          </div>
          <span className="bar-label mono">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function StatsPage({ user }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/users/${encodeURIComponent(user.username)}/stats`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user.username])

  if (loading) return <div className="stats-page page-scroll"><p className="stats-empty">Загрузка...</p></div>
  if (!data) return <div className="stats-page page-scroll"><p className="stats-empty">Ошибка загрузки</p></div>

  const taskDays = data.tasks_by_day || []
  const barItems = taskDays.map(([date, count]) => ({
    label: date.slice(5),
    value: count,
  }))

  const snapshots = data.snapshots || []

  return (
    <div className="stats-page page-scroll animate-in">
      <h1 className="stats-title">Статистика</h1>

      {/* Summary cards */}
      <div className="stats-summary">
        <div className="summary-card">
          <span className="summary-val mono">{data.total_tasks}</span>
          <span className="summary-label">Задач выполнено</span>
        </div>
        <div className="summary-card">
          <span className="summary-val mono">{data.streak_current}</span>
          <span className="summary-label">Серия дней</span>
        </div>
        <div className="summary-card">
          <span className="summary-val mono">{data.streak_max}</span>
          <span className="summary-label">Рекорд серии</span>
        </div>
      </div>

      {/* Stat progression charts */}
      <div className="stats-section">
        <h2 className="stats-section-title">Прогресс статов</h2>
        <div className="stat-charts">
          {STAT_KEYS.map(key => {
            const values = snapshots.map(s => s[key])
            const current = user.stats[key]
            return (
              <div className="stat-chart-card" key={key}>
                <div className="stat-chart-header">
                  <span className="stat-chart-name">{STAT_LABELS[key]}</span>
                  <span className="stat-chart-val mono">{current}</span>
                </div>
                {values.length > 1 ? (
                  <MiniChart data={values} maxVal={Math.max(...values) + 2} />
                ) : (
                  <div className="stat-chart-empty">Нужно больше данных</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tasks per day */}
      {barItems.length > 0 && (
        <div className="stats-section">
          <h2 className="stats-section-title">Задачи по дням</h2>
          <BarChart items={barItems} />
        </div>
      )}

      {/* Tasks by stat type */}
      {Object.keys(data.tasks_by_stat || {}).length > 0 && (
        <div className="stats-section">
          <h2 className="stats-section-title">Задачи по статам</h2>
          <div className="stat-dist">
            {Object.entries(data.tasks_by_stat).map(([stat, count]) => {
              const total = Object.values(data.tasks_by_stat).reduce((a, b) => a + b, 0)
              const pct = Math.round((count / total) * 100)
              return (
                <div className="stat-dist-row" key={stat}>
                  <span className="stat-dist-name">{STAT_LABELS[stat] || stat}</span>
                  <div className="stat-dist-bar-wrap">
                    <div className="stat-dist-bar" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="stat-dist-val mono">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* XP progression */}
      {snapshots.length > 1 && (
        <div className="stats-section">
          <h2 className="stats-section-title">Прогресс XP</h2>
          <MiniChart data={snapshots.map(s => s.xp)} />
        </div>
      )}
    </div>
  )
}

export default StatsPage
