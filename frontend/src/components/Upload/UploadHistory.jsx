import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUploads, deleteUpload } from '../../api'
import './UploadHistory.css'

const STATUS_MAP = {
  pending: 'badge-pending',
  extracted: 'badge-extracted',
  reviewed: 'badge-reviewed',
}

export default function UploadHistory({ refreshKey }) {
  const [uploads, setUploads] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = async () => {
    try {
      const data = await getUploads(1, 30)
      setUploads(data.uploads || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [refreshKey])

  const fmtTime = ts => {
    if (!ts) return '—'
    const d = new Date(ts)
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const handleClick = upload => {
    if (upload.status === 'extracted' || upload.status === 'reviewed') {
      navigate(`/review/${upload.id}?uploadId=${upload.id}`)
    }
  }

  const handleDelete = async (e, uploadId) => {
    e.stopPropagation()
    if (!window.confirm("Are you sure you want to delete this upload and all its extracted records?")) return
    try {
      await deleteUpload(uploadId)
      setUploads(prev => prev.filter(u => u.id !== uploadId))
    } catch (err) {
      alert("Failed to delete upload: " + err.message)
    }
  }

  return (
    <div className="upload-history panel">
      <div style={{ padding: '16px 16px 0' }}>
        <div className="section-title">
          UPLOAD HISTORY
          <button className="btn btn-dim" style={{ fontSize: 9, padding: '4px 12px' }} onClick={load}>
            ↺ REFRESH
          </button>
        </div>
      </div>
      {loading ? (
        <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
          <div className="spinner" />
        </div>
      ) : uploads.length === 0 ? (
        <div className="empty-state"><span className="empty-icon">📂</span><span>No uploads yet</span></div>
      ) : (
        <div className="history-list scroll-area">
          {uploads.map(u => (
            <div
              key={u.id}
              className={`history-item ${u.status !== 'pending' ? 'clickable' : ''}`}
              onClick={() => handleClick(u)}
            >
              <div className="history-icon">
                {u.file_type?.includes('pdf') ? '📄' : '🖼'}
              </div>
              <div className="history-info">
                <div className="history-filename">{u.filename}</div>
                <div className="history-meta">
                  <span className="history-time">{fmtTime(u.upload_time)}</span>
                  <span className="history-size">{u.size_bytes ? `${(u.size_bytes / 1024).toFixed(1)} KB` : ''}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`badge ${STATUS_MAP[u.status] || 'badge-pending'}`}>
                  {u.status?.toUpperCase()}
                </span>
                <button
                  className="history-delete-btn"
                  onClick={(e) => handleDelete(e, u.id)}
                  title="Delete Upload & Records"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
