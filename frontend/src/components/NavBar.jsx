import './NavBar.css'

const tabs = [
  { id: 'dashboard', label: 'Герой' },
  { id: 'quest', label: 'Квест' },
  { id: 'history', label: 'История' },
]

function NavBar({ currentPage, onNavigate, onLogout }) {
  return (
    <nav className="nav">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`nav-tab ${currentPage === tab.id ? 'active' : ''}`}
          onClick={() => onNavigate(tab.id)}
        >
          {tab.label}
        </button>
      ))}
      <button className="nav-tab nav-logout" onClick={onLogout}>
        Выход
      </button>
    </nav>
  )
}

export default NavBar
