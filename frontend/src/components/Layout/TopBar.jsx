import { useEffect, useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import './TopBar.css'

const PAGE_TITLES = {
  '/': 'DASHBOARD',
  '/upload': 'DOCUMENT UPLOAD',
  '/history': 'RECORD HISTORY',
  '/chat': 'AI ASSISTANT',
}

const SESSION_ID = Math.random().toString(16).slice(2, 10).toUpperCase()

function useMatchTitle() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/review')) return 'RECORD REVIEW'
  return PAGE_TITLES[pathname] || 'OPSCENTER'
}

export default function TopBar() {
  const [clock, setClock] = useState('')
  const title = useMatchTitle()

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      const h = String(now.getHours()).padStart(2, '0')
      const min = String(now.getMinutes()).padStart(2, '0')
      const s = String(now.getSeconds()).padStart(2, '0')
      setClock(`${y}-${m}-${d} ${h}:${min}:${s}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="topbar">
      <div className="topbar-title">
        <span className="topbar-slash">// </span>
        <span className="topbar-page">{title}</span>
      </div>
      <div className="topbar-right">
        <div className="topbar-clock">{clock}</div>
        <div className="topbar-divider" />
        <div className="topbar-session">
          <span className="session-label">SESSION:</span>
          <span className="session-id">{SESSION_ID}</span>
        </div>
        <div className="topbar-divider" />
        <div className="topbar-status">
          <span className="blink-dot" />
          <span>SYSTEM ONLINE</span>
        </div>
      </div>
    </header>
  )
}
