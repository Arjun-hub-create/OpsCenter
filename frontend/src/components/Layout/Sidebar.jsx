import { NavLink } from 'react-router-dom'
import './Sidebar.css'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '◈' },
  { to: '/upload', label: 'Upload', icon: '↑' },
  { to: '/history', label: 'History', icon: '⊞' },
  { to: '/chat', label: 'AI Chat', icon: '◎' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-hex">⬡</span>
        <div className="logo-text">
          <span className="logo-main">OPSCENTER</span>
          <span className="logo-sub">·AI</span>
        </div>
      </div>
      <div className="logo-version">v1.0 // MFG-NODE</div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            <span className="nav-accent" />
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-status">
        <span className="blink-dot" />
        <span className="status-text">SYSTEM ONLINE</span>
      </div>
    </aside>
  )
}
