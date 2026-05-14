import './NavBar.css'

const tabs = [
  { id: 'dashboard', label: 'Герой' },
  { id: 'quest', label: 'Квест' },
  { id: 'tasks', label: 'Задачи' },
  { id: 'coach', label: 'Коуч' },
  { id: 'stats', label: 'Стат' },
]

function NavBar({ currentPage, onNavigate }) {
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
    </nav>
  )
}

export default NavBar
