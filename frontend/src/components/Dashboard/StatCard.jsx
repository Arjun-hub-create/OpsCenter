import './StatCard.css'

export default function StatCard({ label, value, sub, trend, trendUp, icon }) {
  return (
    <div className="stat-card panel corner-bracket">
      <div className="hex-deco" />
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value neon-text">{value ?? '—'}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {trend && (
        <div className={`stat-trend ${trendUp ? 'up' : 'down'}`}>
          {trendUp ? '▲' : '▼'} {trend}
        </div>
      )}
    </div>
  )
}
