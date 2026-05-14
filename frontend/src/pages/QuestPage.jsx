import { useState, useEffect, useRef } from 'react'
import { API } from '../config'
import './QuestPage.css'

const STAT_NAMES = {
  strength: 'Сила',
  intelligence: 'Интеллект',
  creativity: 'Креативность',
  discipline: 'Дисциплина',
  social: 'Социальность',
}

function QuestPage({ user, setUser, refreshUser }) {
  const [data, setData] = useState(null)
  const [activeQuest, setActiveQuest] = useState(null)
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
      const d = await res.json()
      setData(d)
      setActiveQuest(null)
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
    if (!photo || !activeQuest) return
    setSubmitting(true)
    setResult(null)

    const form = new FormData()
    form.append('quest_id', activeQuest.id)
    form.append('comment', comment)
    form.append('photo', photo)

    try {
      const res = await fetch(`${API}/users/${encodeURIComponent(user.username)}/submit-task`, {
        method: 'POST',
        body: form,
      })
      const d = await res.json()
      setResult(d)
      if (d.user) setUser(d.user)
      if (d.approved) {
        setTimeout(() => {
          setPhoto(null); setPhotoPreview(null); setComment(''); setResult(null)
          setActiveQuest(null)
          fetchQuest()
        }, 3000)
      }
    } catch (err) {
      setResult({ approved: false, verdict: 'Ошибка сети' })
    }
    setSubmitting(false)
  }

  const resetSubmit = () => {
    setResult(null); setPhoto(null); setPhotoPreview(null); setComment('')
  }

  if (loading) return <div className="quest-page page-scroll"><p className="quest-empty">Загрузка...</p></div>

  if (data?.completed_all && (!data?.user_quests || data.user_quests.length === 0)) {
    return (
      <div className="quest-page page-scroll animate-in">
        <div className="quest-done">
          <h2>Все главы пройдены</h2>
          <p>Добавь свои задачи во вкладке "Задачи"</p>
        </div>
      </div>
    )
  }

  if (data?.chapter_complete && (!data?.user_quests || data.user_quests.length === 0)) {
    return (
      <div className="quest-page page-scroll animate-in">
        <div className="quest-done">
          <h2>Глава пройдена</h2>
          <p>{data.chapter}</p>
          <button className="btn-outline" onClick={fetchQuest}>Далее</button>
        </div>
      </div>
    )
  }

  // Active quest submission view
  if (activeQuest) {
    return (
      <div className="quest-page page-scroll animate-in">
        <button className="back-btn" onClick={() => { setActiveQuest(null); resetSubmit() }}>
          &larr; Назад
        </button>

        <div className="quest-card">
          {activeQuest.is_user_task && <span className="quest-tag mono">Моя задача</span>}
          <h2 className="quest-title">{activeQuest.title}</h2>
          <p className="quest-desc">{activeQuest.description}</p>
          <div className="quest-rewards mono">
            <span>+{activeQuest.xp} xp</span>
            <span>+1 {STAT_NAMES[activeQuest.stat] || activeQuest.stat}</span>
          </div>
        </div>

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

        {result && (
          <div className={`result animate-in ${result.approved ? 'ok' : 'fail'}`}>
            <div className="result-status">{result.approved ? 'Одобрено' : 'Отклонено'}</div>
            <p className="result-verdict">{result.verdict}</p>

            {result.approved && (
              <div className="result-rewards mono">
                <span>+{result.xp_earned} xp</span>
                {result.level_up && <span className="lvlup">LEVEL UP</span>}
              </div>
            )}

            {!result.approved && (
              <button className="btn-outline" onClick={resetSubmit}>
                Попробовать снова
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // Quest list view
  const storyQuest = data?.story_quest
  const userQuests = data?.user_quests || []
  const chapterInfo = data?.chapter_info

  return (
    <div className="quest-page page-scroll animate-in">
      {/* Story quest */}
      {storyQuest && chapterInfo && (
        <>
          <div className="quest-chapter">
            <span className="mono quest-chapter-tag">Глава {chapterInfo.chapter_id}</span>
            <p className="quest-chapter-desc">{chapterInfo.chapter_description}</p>
          </div>
          <div className="quest-card quest-selectable" onClick={() => setActiveQuest(storyQuest)}>
            <div className="quest-meta mono">{chapterInfo.quest_number} / {chapterInfo.total_quests}</div>
            <h2 className="quest-title">{storyQuest.title}</h2>
            <p className="quest-desc">{storyQuest.description}</p>
            <div className="quest-rewards mono">
              <span>+{storyQuest.xp} xp</span>
              <span>+1 {STAT_NAMES[storyQuest.stat] || storyQuest.stat}</span>
            </div>
          </div>
        </>
      )}

      {/* User quests for today */}
      {userQuests.length > 0 && (
        <>
          <div className="section-label mono">Мои задачи на сегодня</div>
          {userQuests.map(q => (
            <div key={q.id} className="quest-card quest-selectable" onClick={() => setActiveQuest(q)}>
              <h2 className="quest-title">{q.title}</h2>
              <p className="quest-desc">{q.description}</p>
              <div className="quest-rewards mono">
                <span>+{q.xp} xp</span>
                <span>+1 {STAT_NAMES[q.stat] || q.stat}</span>
              </div>
            </div>
          ))}
        </>
      )}

      {!storyQuest && userQuests.length === 0 && (
        <p className="quest-empty">Нет квестов. Добавь задачи во вкладке "Задачи"</p>
      )}
    </div>
  )
}

export default QuestPage
