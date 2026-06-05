import { useState } from 'react'
import ConfidenceBar from './ConfidenceBar'
import './ExtractionPanel.css'

const FIELD_LABELS = {
  date: 'DATE',
  shift: 'SHIFT',
  employee_number: 'EMPLOYEE NO.',
  operation_code: 'OPERATION CODE',
  machine_number: 'MACHINE NO.',
  work_order_number: 'WORK ORDER',
  quantity_produced: 'QTY PRODUCED',
  time_taken: 'TIME TAKEN',
}

const FIELDS = Object.keys(FIELD_LABELS)

export default function ExtractionPanel({ record, uploadId, imageUrl, upload }) {
  const [showRaw, setShowRaw] = useState(false)

  if (!record) return null

  const isPdf = upload?.file_type === 'application/pdf' || upload?.stored_name?.toLowerCase().endsWith('.pdf') || imageUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div className="extraction-panel">
      <div className="extraction-doc" style={isPdf ? { alignItems: 'stretch' } : {}}>
        {imageUrl ? (
          isPdf ? (
            <iframe src={imageUrl} title="Document Preview" style={{ width: '100%', height: '100%', border: 'none', background: 'white', minHeight: '600px' }} />
          ) : (
            <img src={imageUrl} alt="Document" className="doc-preview-img" />
          )
        ) : (
          <div className="doc-placeholder">
            <span style={{ fontSize: 48, opacity: 0.3 }}>⬡</span>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: 11, color: 'var(--text-dim)' }}>
              NO PREVIEW
            </span>
          </div>
        )}
      </div>

      <div className="extraction-fields panel">
        <div style={{ padding: '16px 20px 0' }}>
          <div className="section-title">EXTRACTED FIELDS
            <span className="badge badge-extracted" style={{ marginLeft: 'auto', marginBottom: 0 }}>
              LIVE EXTRACT
            </span>
          </div>
        </div>
        <div className="fields-list">
          {FIELDS.map(field => {
            const f = record[field] || { value: null, confidence: 0 }
            const confidence = f.confidence ?? 0
            const value = f.value
            const suggestion = record.suggestions?.[field]
            const low = confidence < 0.5
            const mid = confidence >= 0.5 && confidence < 0.8

            return (
              <div key={field} className={`field-row ${low ? 'low' : mid ? 'mid' : ''}`}>
                <div className="field-name">{FIELD_LABELS[field]}</div>
                <div className="field-value-wrap">
                  <span className={`field-value ${!value ? 'null' : ''}`}>
                    {value ?? 'UNREADABLE'}
                    {low && <span className="field-warn-icon">⚠</span>}
                  </span>
                  {suggestion && (
                    <div className="field-suggestion">
                      ↳ Did you mean: <strong>{suggestion}</strong>?
                    </div>
                  )}
                </div>
                <ConfidenceBar confidence={confidence} />
              </div>
            )
          })}
        </div>

        {record.validation_errors?.length > 0 && (
          <div className="extraction-errors">
            <div className="section-title" style={{ padding: '0 20px' }}>
              VALIDATION ERRORS
            </div>
            {record.validation_errors.map((err, i) => (
              <div key={i} className="error-item">
                <span className="blink-dot danger" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        {record.anomaly_flags?.length > 0 && (
          <div className="extraction-anomalies">
            <div className="section-title" style={{ padding: '0 20px' }}>
              ANOMALY FLAGS
            </div>
            {record.anomaly_flags.map((flag, i) => (
              <div key={i} className="anomaly-item">
                <span className="blink-dot warn" />
                <span>{flag}</span>
              </div>
            ))}
          </div>
        )}

        {record.raw_text && (
          <div className="raw-text-section">
            <button
              className="btn btn-dim"
              style={{ margin: '12px 20px', fontSize: 9 }}
              onClick={() => setShowRaw(v => !v)}
            >
              {showRaw ? '▲ HIDE' : '▼ SHOW'} RAW OCR TEXT
            </button>
            {showRaw && (
              <pre className="raw-text-content">{record.raw_text}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
