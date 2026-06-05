import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { getRecord, getUpload, getExtraction, getRecords } from '../api'
import ExtractionPanel from '../components/Extraction/ExtractionPanel'
import ReviewForm from '../components/Review/ReviewForm'
import './ReviewPage.css'

export default function ReviewPage() {
  const { recordId } = useParams()
  const [searchParams] = useSearchParams()
  const uploadId = searchParams.get('uploadId') || recordId
  const navigate = useNavigate()

  const [record, setRecord] = useState(null)
  const [recordsList, setRecordsList] = useState([])
  const [activeRecordIndex, setActiveRecordIndex] = useState(0)
  const [upload, setUpload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('extract') // 'extract' | 'review'

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch all records associated with this uploadId
        let list = []
        try {
          const res = await getRecords({ upload_id: uploadId, limit: 100 })
          list = res.records || []
          setRecordsList(list)
        } catch (e) {
          console.error("Error loading records list", e)
        }

        let rec = null
        if (list.length > 0) {
          // If we loaded by a specific recordId from URL (and it's not the uploadId itself),
          // select that index.
          const idx = list.findIndex(r => r.id === recordId)
          if (idx !== -1) {
            setActiveRecordIndex(idx)
            rec = list[idx]
          } else {
            setActiveRecordIndex(0)
            rec = list[0]
          }
        } else {
          // Fallback if records list is empty: try to fetch from endpoints directly
          try {
            if (recordId && recordId !== uploadId) {
              rec = await getRecord(recordId)
            } else {
              rec = await getExtraction(uploadId)
            }
          } catch {
            rec = await getRecord(recordId)
          }
          if (rec) {
            setRecordsList([rec])
            setActiveRecordIndex(0)
          }
        }
        
        setRecord(rec)

        // Load upload info for image preview
        const uid = rec?.upload_id || uploadId
        if (uid) {
          try {
            const up = await getUpload(uid)
            setUpload(up)
          } catch {}
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [recordId, uploadId])

  const selectRecordIndex = (idx) => {
    setActiveRecordIndex(idx)
    setRecord(recordsList[idx])
  }

  const handleSaved = (updated) => {
    const nextList = recordsList.map((r, idx) => idx === activeRecordIndex ? updated : r)
    setRecordsList(nextList)
    setRecord(updated)
  }

  const handleDeleted = (deletedId) => {
    const nextList = recordsList.filter(r => r.id !== deletedId)
    setRecordsList(nextList)
    if (nextList.length > 0) {
      setActiveRecordIndex(0)
      setRecord(nextList[0])
    } else {
      navigate('/upload')
    }
  }

  const backendUrl = import.meta.env.VITE_API_URL || ''
  const imageUrl = upload?.stored_name
    ? `${backendUrl}/uploads/${upload.stored_name}`
    : null

  if (loading) return (
    <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  if (error) return (
    <div className="page-content">
      <div className="flash-error">{error}</div>
    </div>
  )

  return (
    <div className="page-content page-enter review-page">
      <div className="review-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="review-meta">
            <span className="review-id">REC // {record?.id?.slice(-8)?.toUpperCase()}</span>
            {upload && (
              <span style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: 'var(--text-dim)' }}>
                {upload.filename}
              </span>
            )}
            <span className={`badge ${record?.reviewed ? 'badge-reviewed' : 'badge-pending'}`}>
              {record?.reviewed ? '✓ REVIEWED' : '○ PENDING'}
            </span>
            {record?.validation_errors?.length > 0 && (
              <span className="badge badge-error">
                ⚠ {record.validation_errors.length} ERRORS
              </span>
            )}
            {record?.anomaly_flags?.length > 0 && (
              <span className="badge badge-warn">
                ⚑ {record.anomaly_flags.length} ANOMALIES
              </span>
            )}
          </div>
          
          {recordsList.length > 1 && (
            <div className="row-switcher">
              <span className="row-label">EXTRACTED ROWS ({recordsList.length}):</span>
              {recordsList.map((r, idx) => (
                <button
                  key={r.id}
                  className={`row-btn ${idx === activeRecordIndex ? 'active' : ''}`}
                  onClick={() => selectRecordIndex(idx)}
                >
                  ROW {idx + 1}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="review-tabs">
          <button
            className={`review-tab ${view === 'extract' ? 'active' : ''}`}
            onClick={() => setView('extract')}
          >
            ◈ EXTRACTION
          </button>
          <button
            className={`review-tab ${view === 'review' ? 'active' : ''}`}
            onClick={() => setView('review')}
          >
            ✎ REVIEW FORM
          </button>
        </div>
      </div>

      <div className="review-body">
        {view === 'extract' ? (
          <ExtractionPanel record={record} uploadId={uploadId} imageUrl={imageUrl} upload={upload} />
        ) : (
          <div className="review-split">
            <div className="review-preview panel" style={upload?.file_type === 'application/pdf' || upload?.stored_name?.toLowerCase().endsWith('.pdf') ? { alignItems: 'stretch', padding: 0 } : {}}>
              {imageUrl ? (
                upload?.file_type === 'application/pdf' || upload?.stored_name?.toLowerCase().endsWith('.pdf') ? (
                  <iframe src={imageUrl} title="Document Preview" style={{ width: '100%', height: '100%', border: 'none', background: 'white', minHeight: '600px' }} />
                ) : (
                  <img src={imageUrl} alt="Document" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
                )
              ) : (
                <div className="empty-state"><span className="empty-icon">⬡</span><span>No preview</span></div>
              )}
            </div>
            <ReviewForm record={record} onSaved={handleSaved} onDeleted={handleDeleted} />
          </div>
        )}
      </div>
    </div>
  )
}
