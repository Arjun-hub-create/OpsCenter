export default function ConfidenceBar({ confidence = 0 }) {
  const pct = Math.round(confidence * 100)
  const cls = confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'mid' : 'low'
  const color = confidence >= 0.8 ? 'var(--success)' : confidence >= 0.5 ? 'var(--warn)' : 'var(--danger)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
      <div className="confidence-bar-wrap" style={{ flex: 1 }}>
        <div className={`confidence-bar-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
      <span style={{
        fontFamily: 'Share Tech Mono', fontSize: 10,
        color, minWidth: 32, textAlign: 'right'
      }}>{pct}%</span>
    </div>
  )
}
