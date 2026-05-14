import { useState, useEffect } from 'react'
import { API } from '../config'
import './TasksPage.css'

const STATS = [
  { id: 'strength', label: 'Сила' },
  { id: 'intelligence', label: 'Интеллект' },
  { id: 'creativity', label: 'Креативность' },
  { id: 'discipline', label: 'Дисциплина' },
  { id: 'social', label: 'Социальность' },
]

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

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (dateStr === toLocalDate(today)) return 'Сегодня'
  if (dateStr === toLocalDate(tomorrow)) return 'Завтра'

  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function TasksPage({ user }) {
  const customStats = (user.custom_stats || []).map(cs => ({ id: cs.key, label: cs.name }))
  const allStats = [...STATS, ...customStats]
  const allStatNames = { ...STAT_NAMES }
  ;(user.custom_stats || []).forEach(cs => { allStatNames[cs.key] = cs.name })
  const [tasks, setTasks] = useState([])
  const [selectedDate, setSelectedDate] = useState(toLocalDate(new Date()))
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [stat, setStat] = useState('discipline')
  const [loading, setLoading] = useState(false)

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API}/users/${encodeURIComponent(user.username)}/tasks`)
      setTasks(await res.json())
    } catch (err) { console.error(err) }
  }

  useEffect(() => { fetchTasks() }, [user.username])

  const handleCreate = async () => {
    if (!title.trim()) return
    setLoading(true)
    const form = new FormData()
    form.append('title', title.trim())
    form.append('description', description.trim())
    form.append('stat', stat)
    form.append('xp', '50')
    form.append('scheduled_date', selectedDate)

    try {
      await fetch(`${API}/users/${encodeURIComponent(user.username)}/tasks`, {
        method: 'POST',
        body: form,
      })
      setTitle('')
      setDescription('')
      setShowForm(false)
      await fetchTasks()
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleDelete = async (taskId) => {
    try {
      await fetch(`${API}/users/${encodeURIComponent(user.username)}/tasks/${taskId}`, {
        method: 'DELETE',
      })
      await fetchTasks()
    } catch (err) { console.error(err) }
  }

  const today = toLocalDate(new Date())
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    dates.push(toLocalDate(d))
  }

  const filteredTasks = tasks.filter(t => t.scheduled_date === selectedDate)

  return (
    <div className="tasks-page page-scroll animate-in">
      <h1 className="tasks-title">Задачи</h1>

      {/* Date selector */}
      <div className="date-row">
        {dates.map(d => (
          <button
            key={d}
            className={`date-btn ${d === selectedDate ? 'active' : ''}`}
            onClick={() => setSelectedDate(d)}
          >
            <span className="date-day">{new Date(d + 'T00:00:00').getDate()}</span>
            <span className="date-label">{formatDate(d)}</span>
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="task-list">
        {filteredTasks.length === 0 && (
          <p className="tasks-empty">Нет задач на {formatDate(selectedDate).toLowerCase()}</p>
        )}
        {filteredTasks.map(t => (
          <div key={t.id} className={`task-item ${t.is_completed ? 'done' : ''}`}>
            <div className="task-info">
              <span className="task-name">{t.title}</span>
              <span className="task-meta mono">
                +{t.xp} xp / {allStatNames[t.stat] || t.stat}
              </span>
            </div>
            <div className="task-actions">
              {t.is_completed && <span className="task-done-label mono">done</span>}
              {!t.is_completed && (
                <button className="task-del" onClick={() => handleDelete(t.id)}>x</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add task */}
      {!showForm ? (
        <button className="btn-add" onClick={() => setShowForm(true)}>
          + Добавить задачу
        </button>
      ) : (
        <div className="task-form animate-in">
          <input
            className="input"
            placeholder="Название задачи"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="input"
            placeholder="Описание (необязательно)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="stat-row">
            {allStats.map(s => (
              <button
                key={s.id}
                className={`stat-btn ${stat === s.id ? 'active' : ''}`}
                onClick={() => setStat(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="form-actions">
            <button className="btn" onClick={handleCreate} disabled={!title.trim() || loading}>
              {loading ? 'Создаю...' : 'Создать'}
            </button>
            <button className="btn-outline" onClick={() => { setShowForm(false); setTitle(''); setDescription('') }}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TasksPage
