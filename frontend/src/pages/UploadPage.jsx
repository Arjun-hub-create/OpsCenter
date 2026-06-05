import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { extractRecord } from '../api'
import DropZone from '../components/Upload/DropZone'
import UploadHistory from '../components/Upload/UploadHistory'
import './UploadPage.css'

export default function UploadPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [extracting, setExtracting] = useState(false)
  const [extractMsg, setExtractMsg] = useState('')
  const navigate = useNavigate()

  const handleUploaded = async (upload) => {
    setRefreshKey(k => k + 1)
    setExtracting(true)
    setExtractMsg(`Extracting data from ${upload.filename}...`)
    try {
      await extractRecord(upload.id)
      setExtractMsg('Extraction complete! Redirecting to review...')
      setTimeout(() => navigate(`/review/${upload.id}?uploadId=${upload.id}`), 1200)
    } catch (e) {
      setExtractMsg(`Extraction failed: ${e.message}`)
      setExtracting(false)
    }
  }

  return (
    <div className="page-content page-enter">
      <div className="upload-page-grid">
        <div className="upload-left">
          <div className="section-title">DOCUMENT INGESTION</div>
          <DropZone onUploaded={handleUploaded} />
          {extracting && (
            <div className="extract-status panel" style={{ marginTop: 16, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="spinner" style={{ width: 20, height: 20 }} />
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: 11, color: 'var(--neon)' }}>
                  {extractMsg}
                </span>
              </div>
              <div className="progress-wrap" style={{ marginTop: 12 }}>
                <div className="progress-fill" style={{ width: '100%', animation: 'progressPulse 1.5s ease-in-out infinite' }} />
              </div>
            </div>
          )}
          <div className="upload-info panel" style={{ marginTop: 16, padding: 16 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>HOW IT WORKS</div>
            {[
              ['01', 'DROP', 'Upload a handwritten or printed manufacturing document'],
              ['02', 'EXTRACT', 'Gemini 1.5 Flash reads and extracts all key fields via OCR'],
              ['03', 'VALIDATE', 'Groq AI + rules engine checks for errors and anomalies'],
              ['04', 'REVIEW', 'You correct any low-confidence fields and save the record'],
            ].map(([num, step, desc]) => (
              <div key={num} className="how-step">
                <span className="how-num">{num}</span>
                <div>
                  <div style={{ fontFamily: 'Orbitron', fontSize: 10, color: 'var(--neon)', letterSpacing: '0.12em' }}>{step}</div>
                  <div style={{ fontFamily: 'Rajdhani', fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="upload-right">
          <div className="section-title">RECENT UPLOADS</div>
          <UploadHistory refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  )
}
