import { useEffect, useRef } from 'react'
import './ShiftChart.css'

const SHIFT_COLORS = {
  I: { bar: 'linear-gradient(90deg, #00f5c4, #00aaff)', glow: 'rgba(0,245,196,0.6)' },
  II: { bar: 'linear-gradient(90deg, #00aaff, #ff00ff)', glow: 'rgba(0,170,255,0.6)' },
  III: { bar: 'linear-gradient(90deg, #ff6b35, #ff3344)', glow: 'rgba(255,107,53,0.6)' },
}

export default function ShiftChart({ shiftSummary = {} }) {
  const maxQty = Math.max(...Object.values(shiftSummary).map(s => s.total_qty || 0), 1)

  return (
    <div className="shift-chart panel">
      <div className="chart-title">
        <span className="section-title" style={{ marginBottom: 0 }}>SHIFT-WISE PRODUCTION OUTPUT</span>
      </div>
      <div className="shift-bars">
        {['I', 'II', 'III'].map(shift => {
          const data = shiftSummary[shift] || { count: 0, total_qty: 0 }
          const pct = Math.round((data.total_qty / maxQty) * 100)
          const colors = SHIFT_COLORS[shift]
          return (
            <div key={shift} className="shift-row">
              <div className="shift-label">SHIFT-{shift}</div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${pct}%`,
                    background: colors.bar,
                    boxShadow: `0 0 10px ${colors.glow}`,
                  }}
                >
                  <span className="bar-tip" style={{ boxShadow: `0 0 10px ${colors.glow}` }} />
                </div>
              </div>
              <div className="shift-qty">
                <span style={{ color: 'var(--neon)' }}>{data.total_qty?.toLocaleString()}</span>
                <span style={{ color: 'var(--text-dim)', fontSize: 9 }}> u</span>
              </div>
              <div className="shift-count">{data.count} rec</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
