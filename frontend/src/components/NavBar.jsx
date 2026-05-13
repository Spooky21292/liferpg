import './NavBar.css'

const tabs = [
  { id: 'dashboard', icon: '🏠', label: 'Герой' },
  { id: 'quest', icon: '⚔️', label: 'Квест' },
  { id: 'shop', icon: '🏪', label: 'Магазин' },
  { id: 'inventory', icon: '🎒', label: 'Инвентарь' },
  { id: 'history', icon: '📜', label: 'История' },
]

function NavBar({ currentPage, onNavigate, onLogout }) {
  return (
    <nav className="navbar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`nav-btn ${currentPage === tab.id ? 'active' : ''}`}
          onClick={() => onNavigate(tab.id)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
      <button className="nav-btn logout-btn" onClick={onLogout}>
        <span className="nav-icon">🚪</span>
        <span className="nav-label">Выйти</span>
      </button>
    </nav>
  )
}

export default NavBar
