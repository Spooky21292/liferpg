import { useState, useEffect } from 'react'
import './ShopPage.css'

const API = '/api'

const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3 }

function ShopPage({ user, setUser, refreshUser }) {
  const [items, setItems] = useState([])
  const [inventory, setInventory] = useState([])
  const [buying, setBuying] = useState(null)
  const [filter, setFilter] = useState('all')
  const [message, setMessage] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/shop`).then(r => r.json()),
      fetch(`${API}/users/${encodeURIComponent(user.username)}/inventory`).then(r => r.json()),
    ]).then(([shopData, invData]) => {
      setItems(shopData)
      setInventory(invData)
    })
  }, [user.username])

  const ownedIds = new Set(inventory.map(i => i.id))

  const handleBuy = async (itemId) => {
    setBuying(itemId)
    setMessage(null)

    try {
      const res = await fetch(
        `${API}/users/${encodeURIComponent(user.username)}/buy?item_id=${itemId}`,
        { method: 'POST' }
      )
      const data = await res.json()

      if (data.success) {
        setUser(data.user)
        setInventory(prev => [...prev, data.item])
        setMessage({ type: 'success', text: `${data.item.name} куплен!` })
      } else {
        setMessage({ type: 'error', text: data.detail || 'Ошибка покупки' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка сети' })
    }
    setBuying(null)
  }

  const filtered = filter === 'all'
    ? items
    : items.filter(i => i.type === filter)

  const sorted = [...filtered].sort((a, b) =>
    RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]
  )

  const FILTERS = [
    { id: 'all', label: 'Все', icon: '🏪' },
    { id: 'armor', label: 'Броня', icon: '🛡️' },
    { id: 'weapon', label: 'Оружие', icon: '⚔️' },
    { id: 'effect', label: 'Эффекты', icon: '✨' },
    { id: 'background', label: 'Фоны', icon: '🖼️' },
  ]

  return (
    <div className="shop-page animate-fade-in">
      <div className="shop-header">
        <h2>🏪 Магазин</h2>
        <div className="coins-display">
          <span>🪙</span>
          <span>{user.coins}</span>
        </div>
      </div>

      {message && (
        <div className={`shop-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="shop-filters">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`filter-btn ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            <span>{f.icon}</span>
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      <div className="shop-grid">
        {sorted.map((item) => {
          const owned = ownedIds.has(item.id)
          const canAfford = user.coins >= item.price

          return (
            <div
              key={item.id}
              className={`shop-item rarity-border-${item.rarity} ${owned ? 'owned' : ''}`}
            >
              <div className="item-emoji">{item.emoji}</div>
              <div className="item-info">
                <span className={`item-name rarity-${item.rarity}`}>{item.name}</span>
                <span className="item-rarity-tag">{item.rarity}</span>
              </div>

              {owned ? (
                <div className="owned-badge">Куплено ✓</div>
              ) : (
                <button
                  className={`buy-btn ${!canAfford ? 'cant-afford' : ''}`}
                  disabled={!canAfford || buying === item.id}
                  onClick={() => handleBuy(item.id)}
                >
                  {buying === item.id ? '⏳' : `🪙 ${item.price}`}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ShopPage
