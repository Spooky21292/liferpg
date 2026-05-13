import { useState, useEffect } from 'react'
import './InventoryPage.css'

const API = '/api'

function InventoryPage({ user, setUser, refreshUser }) {
  const [inventory, setInventory] = useState([])
  const [equipping, setEquipping] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    fetch(`${API}/users/${encodeURIComponent(user.username)}/inventory`)
      .then(r => r.json())
      .then(setInventory)
  }, [user.username])

  const handleEquip = async (itemId) => {
    setEquipping(itemId)
    try {
      const res = await fetch(
        `${API}/users/${encodeURIComponent(user.username)}/equip?item_id=${itemId}`,
        { method: 'POST' }
      )
      const data = await res.json()
      if (data.success) {
        setUser(data.user)
        setMessage({ type: 'success', text: 'Экипировано!' })
        setTimeout(() => setMessage(null), 2000)
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка' })
    }
    setEquipping(null)
  }

  const ITEM_EMOJIS = {
    armor: '🛡️',
    weapon: '⚔️',
    effect: '✨',
    background: '🖼️',
    title: '📜',
  }

  const grouped = {}
  for (const item of inventory) {
    if (!grouped[item.type]) grouped[item.type] = []
    grouped[item.type].push(item)
  }

  const TYPE_LABELS = {
    armor: 'Броня',
    weapon: 'Оружие',
    effect: 'Эффекты',
    background: 'Фоны',
    title: 'Титулы',
  }

  const equippable = ['armor', 'weapon', 'effect', 'background']

  return (
    <div className="inventory-page animate-fade-in">
      <h2 className="inv-title">🎒 Инвентарь</h2>

      {message && (
        <div className={`inv-message ${message.type}`}>{message.text}</div>
      )}

      {/* Equipped */}
      <div className="equipped-section">
        <h3 className="section-label">Экипировано</h3>
        <div className="equipped-grid">
          {equippable.map(type => {
            const equippedId = user.equipped?.[type]
            const item = inventory.find(i => i.id === equippedId)
            return (
              <div key={type} className="equipped-slot">
                <span className="slot-icon">{ITEM_EMOJIS[type]}</span>
                <span className="slot-name">
                  {item ? item.name : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Inventory List */}
      {Object.keys(grouped).length === 0 && (
        <div className="empty-inventory">
          <span>📦</span>
          <p>Инвентарь пуст</p>
          <p className="empty-hint">Выполняй квесты и покупай предметы в магазине!</p>
        </div>
      )}

      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} className="inv-group">
          <h3 className="group-label">{ITEM_EMOJIS[type]} {TYPE_LABELS[type]}</h3>
          <div className="inv-items">
            {items.map(item => {
              const isEquipped = user.equipped?.[item.type] === item.id
              const canEquip = equippable.includes(item.type) && !isEquipped

              return (
                <div
                  key={item.id}
                  className={`inv-item rarity-border-${item.rarity} ${isEquipped ? 'is-equipped' : ''}`}
                >
                  <div className="inv-item-info">
                    <span className={`inv-item-name rarity-${item.rarity}`}>{item.name}</span>
                    <span className="inv-item-rarity">{item.rarity}</span>
                  </div>

                  {isEquipped && (
                    <span className="equipped-badge-small">Надето</span>
                  )}

                  {canEquip && (
                    <button
                      className="equip-btn"
                      onClick={() => handleEquip(item.id)}
                      disabled={equipping === item.id}
                    >
                      {equipping === item.id ? '⏳' : 'Надеть'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default InventoryPage
