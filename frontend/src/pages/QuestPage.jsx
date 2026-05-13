import { useState, useEffect, useRef } from 'react'
import './QuestPage.css'

const API = '/api'

function QuestPage({ user, setUser, refreshUser }) {
  const [quest, setQuest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [comment, setComment] = useState('')
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  const fetchQuest = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/users/${encodeURIComponent(user.username)}/current-quest`)
      const data = await res.json()
      setQuest(data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchQuest()
  }, [user.username])

  const handlePhotoChange = (e) => {
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

    const formData = new FormData()
    formData.append('quest_id', quest.quest.id)
    formData.append('comment', comment)
    formData.append('photo', photo)

    try {
      const res = await fetch(`${API}/users/${encodeURIComponent(user.username)}/submit-task`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      setResult(data)

      if (data.user) {
        setUser(data.user)
      }

      if (data.approved) {
        setTimeout(() => {
          setPhoto(null)
          setPhotoPreview(null)
          setComment('')
          setResult(null)
          fetchQuest()
        }, 5000)
      }
    } catch (err) {
      console.error(err)
      setResult({ approved: false, verdict: 'Ошибка сети. Попробуй снова.' })
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="quest-page">
        <div className="loading-spinner">⏳ Загрузка квеста...</div>
      </div>
    )
  }

  if (quest?.completed_all) {
    return (
      <div className="quest-page">
        <div className="quest-complete-all animate-slide-up">
          <span className="complete-emoji">🏆</span>
          <h2>Все главы пройдены!</h2>
          <p>Ты — настоящий мастер. Продолжай совершенствоваться!</p>
        </div>
      </div>
    )
  }

  if (quest?.chapter_complete) {
    return (
      <div className="quest-page">
        <div className="chapter-complete animate-slide-up">
          <span className="complete-emoji">🎉</span>
          <h2>Глава пройдена!</h2>
          <p>{quest.chapter}</p>
          <button className="next-chapter-btn" onClick={fetchQuest}>
            Следующая глава →
          </button>
        </div>
      </div>
    )
  }

  if (!quest?.quest) {
    return (
      <div className="quest-page">
        <div className="loading-spinner">Нет доступных квестов</div>
      </div>
    )
  }

  const STAT_ICONS = {
    strength: '💪',
    intelligence: '🧠',
    creativity: '🎨',
    discipline: '🎯',
    social: '👥',
  }

  return (
    <div className="quest-page animate-fade-in">
      {/* Chapter Header */}
      <div className="chapter-header">
        <span className="chapter-tag">Глава {quest.chapter_id}</span>
        <h2 className="chapter-title">{quest.chapter}</h2>
        <p className="chapter-desc">{quest.chapter_description}</p>
      </div>

      {/* Quest Card */}
      <div className="quest-card">
        <div className="quest-progress">
          Квест {quest.quest_number} из {quest.total_quests}
        </div>

        <h3 className="quest-title">{quest.quest.title}</h3>
        <p className="quest-description">{quest.quest.description}</p>

        <div className="quest-rewards">
          <div className="reward">
            <span>⭐</span>
            <span>{quest.quest.xp} XP</span>
          </div>
          <div className="reward">
            <span>🪙</span>
            <span>{quest.quest.coins}</span>
          </div>
          <div className="reward">
            <span>{STAT_ICONS[quest.quest.stat] || '📊'}</span>
            <span>+1</span>
          </div>
        </div>
      </div>

      {/* Submit Section */}
      {!result && (
        <div className="submit-section">
          <h3 className="submit-title">📸 Подтверди выполнение</h3>

          <div
            className={`photo-upload ${photoPreview ? 'has-photo' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="photo-preview" />
            ) : (
              <div className="upload-placeholder">
                <span className="upload-icon">📷</span>
                <span>Нажми, чтобы загрузить фото</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
          </div>

          <textarea
            className="comment-input"
            placeholder="Расскажи, что ты сделал..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />

          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={!photo || submitting}
          >
            {submitting ? '🤖 AI проверяет...' : '✅ Отправить на проверку'}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`result-card animate-slide-up ${result.approved ? 'approved' : 'rejected'}`}>
          <span className="result-emoji">
            {result.approved ? '✅' : '❌'}
          </span>
          <h3>{result.approved ? 'Одобрено!' : 'Отклонено'}</h3>
          <p className="result-verdict">{result.verdict}</p>

          {result.approved && (
            <div className="result-rewards">
              <div className="reward-item animate-slide-up" style={{ animationDelay: '0.2s' }}>
                +{result.xp_earned} XP
              </div>
              <div className="reward-item animate-slide-up" style={{ animationDelay: '0.4s' }}>
                +{result.coins_earned} 🪙
              </div>
              {result.level_up && (
                <div className="level-up-banner animate-slide-up" style={{ animationDelay: '0.6s' }}>
                  🎉 LEVEL UP!
                </div>
              )}
              {result.loot && (
                <div className="loot-drop animate-loot" style={{ animationDelay: '0.8s' }}>
                  <span className="loot-label">🎁 Дроп:</span>
                  <span className={`loot-name rarity-${result.loot.rarity}`}>
                    {result.loot.name}
                  </span>
                </div>
              )}
            </div>
          )}

          {!result.approved && (
            <button className="retry-btn" onClick={() => {
              setResult(null)
              setPhoto(null)
              setPhotoPreview(null)
              setComment('')
            }}>
              🔄 Попробовать снова
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default QuestPage
