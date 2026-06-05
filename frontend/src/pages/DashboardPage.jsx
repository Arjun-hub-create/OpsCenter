import { useEffect, useState } from 'react'
import { getDashboardStats } from '../api'
import StatCard from '../components/Dashboard/StatCard'
import ShiftChart from '../components/Dashboard/ShiftChart'
import MachineTable from '../components/Dashboard/MachineTable'
import './DashboardPage.css'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [pulsing, setPulsing] = useState(false)

  const load = async (pulse = false) => {
    if (pulse) setPulsing(true)
    try {
      const data = await getDashboardStats()
      setStats(data)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      if (pulse) setTimeout(() => setPulsing(false), 800)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(() => load(true), 30000)
    return () => clearInterval(id)
  }, [])

  if (loading) return (
    <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div className="page-content page-enter">
      <div className="dash-header">
        <span className="section-title" style={{ margin: 0, flex: 'none' }}>OPERATIONS OVERVIEW</span>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: 'var(--text-dim)' }}>
          LAST UPDATED: {lastUpdated}
        </span>
        {pulsing && <span className="blink-dot blue" />}
      </div>

      <div className={`stat-grid ${pulsing ? 'pulsing' : ''}`}>
        <StatCard
          icon="⬡"
          label="// TOTAL UPLOADS"
          value={stats?.total_uploads?.toLocaleString()}
          sub="DOCUMENTS PROCESSED"
          trend="+live sync"
          trendUp
        />
        <StatCard
          icon="✓"
          label="// VALIDATED OK"
          value={stats?.reviewed_count?.toLocaleString()}
          sub="RECORDS CLEARED"
          trend={`${stats?.pass_rate}% pass rate`}
          trendUp={stats?.pass_rate > 50}
        />
        <StatCard
          icon="⚑"
          label="// EXCEPTIONS"
          value={stats?.validation_failures?.toLocaleString()}
          sub="REQUIRE REVIEW"
          trend={`${(100 - stats?.pass_rate).toFixed(1)}% failure rate`}
          trendUp={false}
        />
      </div>

      <div className="dash-row-2">
        <ShiftChart shiftSummary={stats?.shift_summary} />
      </div>

      <div className="dash-row-3">
        <div className="daily-chart panel">
          <div style={{ padding: '16px 16px 0' }}>
            <div className="section-title">DAILY UPLOADS (7 DAYS)</div>
          </div>
          <div className="daily-bars">
            {(stats?.daily_uploads || []).map((d, i) => {
              const max = Math.max(...(stats?.daily_uploads || []).map(x => x.count), 1)
              const pct = Math.round((d.count / max) * 100)
              return (
                <div key={i} className="daily-bar-col">
                  <div className="daily-bar-track">
                    <div
                      className="daily-bar-fill"
                      style={{ height: `${pct}%`, background: 'linear-gradient(0deg, var(--neon2), var(--neon))' }}
                    />
                  </div>
                  <div className="daily-bar-count">{d.count}</div>
                  <div className="daily-bar-label">{d.date?.slice(5)}</div>
                </div>
              )
            })}
          </div>
        </div>
        <MachineTable machineSummary={stats?.machine_summary} />
      </div>

      {stats?.top_anomalies?.length > 0 && (
        <div className="dash-anomalies panel">
          <div style={{ padding: '16px 16px 0' }}>
            <div className="section-title">RECENT ANOMALY FLAGS</div>
          </div>
          <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.top_anomalies.map((flag, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="blink-dot warn" />
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: 11, color: 'var(--warn)' }}>{flag}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dash-pending panel" style={{ marginTop: 16 }}>
        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Share Tech Mono', fontSize: 11, color: 'var(--text-muted)' }}>
            PENDING REVIEW: <strong style={{ color: 'var(--warn)', fontFamily: 'Orbitron', fontSize: 16 }}>
              {stats?.pending_review || 0}
            </strong> records
          </span>
          <a href="/history" style={{ textDecoration: 'none' }}>
            <button className="btn btn-dim" style={{ fontSize: 9 }}>VIEW ALL →</button>
          </a>
        </div>
      </div>
    </div>
  )
}
