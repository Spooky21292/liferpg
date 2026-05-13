import { useState, useEffect, useRef } from 'react'
import './QuestPage.css'

const API = '/api'

const STAT_NAMES = {
  strength: 'Сила',
  intelligence: 'Интеллект',
  creativity: 'Креативность',
  discipline: 'Дисциплина',
  social: 'Социальность',
}

function QuestPage({ user, setUser, refreshUser }) {
  const [quest, setQuest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [comment, setComment] = useState('')
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  const fetchQuest = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/users/${encodeURIComponent(user.username)}/current-quest`)
      setQuest(await res.json())
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  useEffect(() => { fetchQuest() }, [user.username])

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhoto(file)
      const reader = new FileReader()
      reader.onload = (ev) => setPhotoPreview(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    if (!photo || !quest?.quest) return
    setSubmitting(true)
    setResult(null)

    const form = new FormData()
    form.append('quest_id', quest.quest.id)
    form.append('comment', comment)
    form.append('photo', photo)

    try {
      const res = await fetch(`${API}/users/${encodeURIComponent(user.username)}/submit-task`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      setResult(data)
      if (data.user) setUser(data.user)
      if (data.approved) {
        setTimeout(() => {
          setPhoto(null); setPhotoPreview(null); setComment(''); setResult(null)
          fetchQuest()
        }, 4000)
      }
    } catch (err) {
      setResult({ approved: false, verdict: 'Ошибка сети' })
    }
    setSubmitting(false)
  }

  if (loading) return <div className="quest-page"><p className="quest-empty">Загрузка...</p></div>

  if (quest?.completed_all) {
    return (
      <div className="quest-page animate-in">
        <div className="quest-done">
          <h2>Все главы пройдены</h2>
          <p>Ты прошёл весь путь. Продолжай совершенствоваться.</p>
        </div>
      </div>
    )
  }

  if (quest?.chapter_complete) {
    return (
      <div className="quest-page animate-in">
        <div className="quest-done">
          <h2>Глава пройдена</h2>
          <p>{quest.chapter}</p>
          <button className="btn-outline" onClick={fetchQuest}>Далее →</button>
        </div>
      </div>
    )
  }

  if (!quest?.quest) return <div className="quest-page"><p className="quest-empty">Нет квестов</p></div>

  return (
    <div className="quest-page animate-in">
      {/* Chapter */}
      <div className="quest-chapter">
        <span className="mono quest-chapter-tag">Глава {quest.chapter_id}</span>
        <p className="quest-chapter-desc">{quest.chapter_description}</p>
      </div>

      {/* Quest */}
      <div className="quest-card">
        <div className="quest-meta mono">{quest.quest_number} / {quest.total_quests}</div>
        <h2 className="quest-title">{quest.quest.title}</h2>
        <p className="quest-desc">{quest.quest.description}</p>
        <div className="quest-rewards mono">
          <span>+{quest.quest.xp} xp</span>
          <span>+1 {STAT_NAMES[quest.quest.stat] || quest.quest.stat}</span>
        </div>
      </div>

      {/* Submit */}
      {!result && (
        <div className="submit">
          <div
            className={`upload ${photoPreview ? 'has-img' : ''}`}
            onClick={() => fileRef.current?.click()}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="photo" className="upload-img" />
            ) : (
              <span className="upload-text">Загрузить фото</span>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} hidden />
          </div>

          <textarea
            className="input comment"
            placeholder="Что ты сделал..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
          />

          <button className="btn" onClick={handleSubmit} disabled={!photo || submitting}>
            {submitting ? 'AI проверяет...' : 'Отправить'}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`result animate-in ${result.approved ? 'ok' : 'fail'}`}>
          <div className="result-status">{result.approved ? 'Одобрено' : 'Отклонено'}</div>
          <p className="result-verdict">{result.verdict}</p>

          {result.approved && (
            <div className="result-rewards mono">
              <span>+{result.xp_earned} xp</span>
              {result.level_up && <span className="lvlup">LEVEL UP</span>}
              {result.loot && <span>Дроп: {result.loot.name}</span>}
            </div>
          )}

          {!result.approved && (
            <button className="btn-outline" onClick={() => {
              setResult(null); setPhoto(null); setPhotoPreview(null); setComment('')
            }}>
              Попробовать снова
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default QuestPage
