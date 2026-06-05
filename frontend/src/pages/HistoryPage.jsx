import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRecords, exportCSV, exportExcel } from '../api'
import './HistoryPage.css'

const STATUS_CLASS = {
  true: 'badge-reviewed',
  false: 'badge-pending',
}

function getFieldVal(record, field) {
  const f = record[field]
  if (f && typeof f === 'object') return f.value ?? '—'
  return f || '—'
}

export default function HistoryPage() {
  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ shift: '', status: '', search: '' })
  const [exporting, setExporting] = useState(false)
  const navigate = useNavigate()
  const LIMIT = 20

  const load = async (p = page, f = filters) => {
    setLoading(true)
    try {
      const params = { page: p, limit: LIMIT }
      if (f.shift) params.shift = f.shift
      if (f.status) params.status = f.status
      if (f.search) params.search = f.search
      const data = await getRecords(params)
      setRecords(data.records || [])
      setTotal(data.total || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(page, filters) }, [page])

  const handleFilter = (key, val) => {
    const next = { ...filters, [key]: val }
    setFilters(next)
    setPage(1)
    load(1, next)
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try { await exportCSV() } catch (e) { console.error(e) }
    setExporting(false)
  }

  const handleExportExcel = async () => {
    setExporting(true)
    try { await exportExcel() } catch (e) { console.error(e) }
    setExporting(false)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="page-content page-enter history-page">
      <div className="history-toolbar">
        <div className="history-filters">
          <input
            className="field-input"
            style={{ width: 200 }}
            placeholder="Search records..."
            value={filters.search}
            onChange={e => handleFilter('search', e.target.value)}
          />
          <select className="field-input" style={{ width: 120 }} value={filters.shift} onChange={e => handleFilter('shift', e.target.value)}>
            <option value="">All Shifts</option>
            <option value="I">Shift I</option>
            <option value="II">Shift II</option>
            <option value="III">Shift III</option>
          </select>
          <select className="field-input" style={{ width: 140 }} value={filters.status} onChange={e => handleFilter('status', e.target.value)}>
            <option value="">All Status</option>
            <option value="reviewed">Reviewed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="history-actions">
          <span style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: 'var(--text-dim)' }}>
            {total} RECORDS
          </span>
          <button className="btn btn-dim" onClick={handleExportCSV} disabled={exporting}>
            ↓ CSV
          </button>
          <button className="btn btn-dim" onClick={handleExportExcel} disabled={exporting}>
            ↓ EXCEL
          </button>
        </div>
      </div>

      <div className="history-table-wrap panel">
        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div className="scroll-area" style={{ maxHeight: 'calc(100vh - 240px)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>RECORD ID</th>
                  <th>DATE</th>
                  <th>SHIFT</th>
                  <th>MACHINE</th>
                  <th>WORK ORDER</th>
                  <th>QTY</th>
                  <th>ERRORS</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={9}>
                    <div className="empty-state">
                      <span className="empty-icon">◈</span>
                      <span>No records found</span>
                    </div>
                  </td></tr>
                ) : records.map(r => (
                  <tr key={r.id} onClick={() => navigate(`/review/${r.id}?uploadId=${r.upload_id}`)}>
                    <td style={{ color: 'var(--neon2)', fontSize: 10 }}>
                      {r.id?.slice(-8)?.toUpperCase()}
                    </td>
                    <td>{getFieldVal(r, 'date')}</td>
                    <td>
                      <span className={`badge ${r.shift?.value === 'I' ? 'badge-reviewed' : r.shift?.value === 'II' ? 'badge-extracted' : r.shift?.value === 'III' ? 'badge-warn' : 'badge-pending'}`}>
                        {getFieldVal(r, 'shift')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--neon)' }}>{getFieldVal(r, 'machine_number')}</td>
                    <td>{getFieldVal(r, 'work_order_number')}</td>
                    <td style={{ fontFamily: 'Orbitron', fontSize: 11 }}>{getFieldVal(r, 'quantity_produced')}</td>
                    <td>
                      {r.validation_errors?.length > 0 ? (
                        <span className="badge badge-error">{r.validation_errors.length}</span>
                      ) : (
                        <span className="badge badge-reviewed">✓</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_CLASS[r.reviewed]}`}>
                        {r.reviewed ? 'REVIEWED' : 'PENDING'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-dim"
                        style={{ fontSize: 9, padding: '4px 10px' }}
                        onClick={e => { e.stopPropagation(); navigate(`/review/${r.id}?uploadId=${r.upload_id}`) }}
                      >
                        REVIEW
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="history-pagination">
          <button className="btn btn-dim" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            ← PREV
          </button>
          <span style={{ fontFamily: 'Share Tech Mono', fontSize: 11, color: 'var(--text-muted)' }}>
            {page} / {totalPages}
          </span>
          <button className="btn btn-dim" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            NEXT →
          </button>
        </div>
      )}
    </div>
  )
}
