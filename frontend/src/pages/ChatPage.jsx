import { useEffect, useState } from 'react'
import { getRecords } from '../api'
import AiChat from '../components/Chat/AiChat'
import './ChatPage.css'

export default function ChatPage() {
  const [recordCount, setRecordCount] = useState(0)
  const [recentRecords, setRecentRecords] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getRecords({ limit: 5 })
        setRecordCount(data.total || 0)
        setRecentRecords(data.records?.slice(0, 5) || [])
      } catch {}
    }
    load()
  }, [])

  const getVal = (r, field) => {
    const f = r[field]
    if (f && typeof f === 'object') return f.value ?? '—'
    return f || '—'
  }

  return (
    <div className="page-content page-enter chat-page">
      <div className="chat-layout">
        <div className="chat-main">
          <AiChat recordCount={recordCount} />
        </div>
        <div className="chat-context">
          <div className="panel" style={{ padding: 16 }}>
            <div className="section-title">AI CONTEXT</div>
            <div className="context-stat">
              <span className="context-label">RECORDS IN CONTEXT</span>
              <span className="context-value neon-text">{Math.min(recordCount, 100)}</span>
            </div>
            <div className="context-stat">
              <span className="context-label">TOTAL RECORDS</span>
              <span className="context-value" style={{ color: 'var(--neon2)' }}>{recordCount}</span>
            </div>
            <div className="context-stat">
              <span className="context-label">AI MODEL</span>
              <span className="context-value" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                llama-3.3-70b
              </span>
            </div>
            <div className="context-stat">
              <span className="context-label">STATUS</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="blink-dot" />
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: 'var(--neon)' }}>ONLINE</span>
              </span>
            </div>
          </div>

          <div className="panel" style={{ padding: 16, marginTop: 12 }}>
            <div className="section-title">RECENT RECORDS</div>
            {recentRecords.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <span style={{ fontSize: 12 }}>No records yet</span>
              </div>
            ) : recentRecords.map(r => (
              <div key={r.id} className="context-record">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: 'var(--neon2)' }}>
                    {r.id?.slice(-6)?.toUpperCase()}
                  </span>
                  <span className={`badge ${r.reviewed ? 'badge-reviewed' : 'badge-pending'}`} style={{ fontSize: 8 }}>
                    {r.reviewed ? '✓' : '○'}
                  </span>
                </div>
                <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: 'var(--text-dim)', marginTop: 4 }}>
                  {getVal(r, 'date')} · SHIFT {getVal(r, 'shift')} · {getVal(r, 'machine_number')}
                </div>
                <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: 'var(--text-dim)' }}>
                  QTY: {getVal(r, 'quantity_produced')} · WO: {getVal(r, 'work_order_number')}
                </div>
              </div>
            ))}
          </div>

          <div className="panel" style={{ padding: 16, marginTop: 12 }}>
            <div className="section-title">EXAMPLE QUERIES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Show all Shift II records',
                'Which machine had the most failures?',
                'List records with anomaly flags',
                'What is the total quantity produced today?',
                'Find records with missing work orders',
              ].map((q, i) => (
                <div key={i} style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: 'var(--text-dim)', paddingLeft: 8, borderLeft: '1px solid var(--line)', lineHeight: 1.4 }}>
                  {q}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
