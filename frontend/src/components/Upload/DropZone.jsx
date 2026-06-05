import { useState, useRef } from 'react'
import { uploadFile } from '../../api'
import './DropZone.css'

export default function DropZone({ onUploaded }) {
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const inputRef = useRef()

  const handleFile = file => {
    if (!file) return
    setSelectedFile(file)
    setError('')
    setSuccess('')
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setPreview(e.target.result)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }

  const handleDrop = e => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setProgress(0)
    setError('')
    setSuccess('')
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      const result = await uploadFile(fd, setProgress)
      setSuccess(`Uploaded: ${result.filename}`)
      setSelectedFile(null)
      setPreview(null)
      if (onUploaded) onUploaded(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="dropzone-wrap">
      <div
        className={`dropzone ${dragging ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !selectedFile && inputRef.current.click()}
      >
        <div className="dz-corner tl" />
        <div className="dz-corner tr" />
        <div className="dz-corner bl" />
        <div className="dz-corner br" />
        <div className="dz-rotating-border" />

        {preview ? (
          <div className="dz-preview">
            <img src={preview} alt="Preview" />
          </div>
        ) : selectedFile ? (
          <div className="dz-file-info">
            <span className="dz-file-icon">📄</span>
            <span className="dz-filename">{selectedFile.name}</span>
            <span className="dz-filesize">{(selectedFile.size / 1024).toFixed(1)} KB</span>
          </div>
        ) : (
          <div className="dz-placeholder">
            <div className="dz-icon">⬡</div>
            <div className="dz-main">DROP DOCUMENT</div>
            <div className="dz-sub">or click to browse</div>
            <div className="dz-formats">
              <span className="badge badge-pending">JPG</span>
              <span className="badge badge-pending">PNG</span>
              <span className="badge badge-pending">PDF</span>
              <span className="badge badge-pending">WEBP</span>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
      </div>

      {selectedFile && (
        <div className="dz-actions">
          <button className="btn btn-dim" onClick={() => { setSelectedFile(null); setPreview(null) }}>
            ✕ CLEAR
          </button>
          <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
            {uploading ? `UPLOADING... ${progress}%` : '↑ UPLOAD DOCUMENT'}
          </button>
        </div>
      )}

      {uploading && (
        <div className="progress-wrap" style={{ marginTop: 12 }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {error && <div className="flash-error" style={{ marginTop: 12 }}>{error}</div>}
      {success && <div className="flash-success" style={{ marginTop: 12 }}>{success}</div>}
    </div>
  )
}
