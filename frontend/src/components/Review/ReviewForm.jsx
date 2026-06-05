import { useState, useEffect } from 'react'
import { updateRecord, deleteRecord } from '../../api'
import './ReviewForm.css'

const FIELD_LABELS = {
  date: 'DATE',
  shift: 'SHIFT',
  employee_number: 'EMPLOYEE NO.',
  operation_code: 'OPERATION CODE',
  machine_number: 'MACHINE NO.',
  work_order_number: 'WORK ORDER',
  quantity_produced: 'QTY PRODUCED',
  time_taken: 'TIME TAKEN (hrs)',
}

const FIELDS = Object.keys(FIELD_LABELS)

function hasError(errors = [], field) {
  return errors.some(e => e.toLowerCase().includes(field.toLowerCase().replace('_', ' ')))
}

export default function ReviewForm({ record, onSaved, onDeleted }) {
  const [form, setForm] = useState(() => {
    const init = {}
    FIELDS.forEach(f => {
      init[f] = record?.[f]?.value ?? ''
    })
    return init
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    const init = {}
    FIELDS.forEach(f => {
      init[f] = record?.[f]?.value ?? ''
    })
    setForm(init)
    setFlash(null)
  }, [record])

  const handleChange = (field, val) => setForm(p => ({ ...p, [field]: val }))

  const handleSave = async () => {
    setSaving(true)
    setFlash(null)
    try {
      const updated = await updateRecord(record.id, form)
      setFlash({ type: 'success', msg: 'Record saved successfully.' })
      if (onSaved) onSaved(updated)
    } catch (e) {
      setFlash({ type: 'error', msg: e.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this record/row?")) return
    setDeleting(true)
    setFlash(null)
    try {
      await deleteRecord(record.id)
      if (onDeleted) onDeleted(record.id)
    } catch (e) {
      setFlash({ type: 'error', msg: e.message })
      setDeleting(false)
    }
  }

  const getConf = field => {
    const f = record?.[field]
    return f?.confidence ?? 1
  }

  const errors = record?.validation_errors || []

  return (
    <div className="review-form-wrap">
      <div className="review-form panel">
        <div style={{ padding: '16px 20px 0' }}>
          <div className="section-title">FIELD REVIEW & CORRECTION</div>
        </div>
        <div className="review-fields scroll-area">
          {FIELDS.map(field => {
            const conf = getConf(field)
            const low = conf < 0.5
            const mid = conf >= 0.5 && conf < 0.8
            const err = hasError(errors, field)
            const suggestion = record?.suggestions?.[field]
            const original = record?.[field]?.value

            return (
              <div key={field} className="review-field-row">
                <label className="form-label">{FIELD_LABELS[field]}</label>
                <div className="review-field-input-wrap">
                  <input
                    className={`field-input ${err ? 'error-border' : low || mid ? 'warn-border' : ''}`}
                    value={form[field]}
                    onChange={e => handleChange(field, e.target.value)}
                    placeholder={original ? `AI: ${original}` : 'No value extracted'}
                  />
                  {(low || mid) && (
                    <div className="review-conf-badge" style={{ color: low ? 'var(--danger)' : 'var(--warn)' }}>
                      {low ? '⚠ LOW CONFIDENCE' : '~ MED CONFIDENCE'} {Math.round(conf * 100)}%
                    </div>
                  )}
                  {suggestion && (
                    <div className="review-suggestion">
                      ↳ Suggested: <strong
                        onClick={() => handleChange(field, suggestion)}
                        style={{ cursor: 'pointer', color: 'var(--neon2)' }}
                      >{suggestion}</strong>
                      <span style={{ color: 'var(--text-dim)', fontSize: 9 }}> (click to apply)</span>
                    </div>
                  )}
                  {err && <div className="form-error">⚠ {errors.find(e => e.toLowerCase().includes(field.toLowerCase().replace('_', ' ')))}</div>}
                </div>
              </div>
            )
          })}
        </div>

        <div className="review-actions">
          {flash && (
            <div className={`flash-${flash.type}`} style={{ flex: 1 }}>{flash.msg}</div>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || deleting}>
            {saving ? '...' : '✓ SAVE RECORD'}
          </button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={saving || deleting}>
            {deleting ? '...' : '🗑 DELETE'}
          </button>
          <button className="btn btn-warn" onClick={() => setFlash({ type: 'error', msg: 'Flagged for manual review.' })} disabled={saving || deleting}>
            ⚑ FLAG
          </button>
        </div>
      </div>

      {record?.audit_trail?.length > 0 && (
        <div className="audit-trail panel" style={{ marginTop: 16 }}>
          <div style={{ padding: '16px 20px 0' }}>
            <div className="section-title">AUDIT TRAIL</div>
          </div>
          <table className="data-table">
            <thead><tr><th>Field</th><th>Original</th><th>Corrected</th><th>Timestamp</th></tr></thead>
            <tbody>
              {record.audit_trail.map((e, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: 'var(--neon2)' }}>
                    {e.field?.toUpperCase()}
                  </td>
                  <td style={{ color: 'var(--text-dim)' }}>{String(e.original_value ?? '—')}</td>
                  <td style={{ color: 'var(--neon)' }}>{String(e.corrected_value ?? '—')}</td>
                  <td style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                    {e.timestamp ? new Date(e.timestamp).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
