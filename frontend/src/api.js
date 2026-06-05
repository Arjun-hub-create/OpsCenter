import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.detail || err.message || 'API error'
    console.error('[API]', msg)
    return Promise.reject(new Error(msg))
  }
)

export const uploadFile = (formData, onProgress) =>
  api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
  }).then(r => r.data)

export const uploadBulk = (formData, onProgress) =>
  api.post('/upload/bulk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
  }).then(r => r.data)

export const getUploads = (page = 1, limit = 20) =>
  api.get('/uploads', { params: { page, limit } }).then(r => r.data)

export const getUpload = id => api.get(`/uploads/${id}`).then(r => r.data)

export const extractRecord = uploadId =>
  api.post(`/extract/${uploadId}`).then(r => r.data)

export const getExtraction = uploadId =>
  api.get(`/extract/${uploadId}`).then(r => r.data)

export const getRecords = (filters = {}) =>
  api.get('/records', { params: filters }).then(r => r.data)

export const getRecord = id => api.get(`/records/${id}`).then(r => r.data)

export const updateRecord = (id, data) =>
  api.put(`/records/${id}`, data).then(r => r.data)

export const getDashboardStats = () =>
  api.get('/dashboard/stats').then(r => r.data)

export const sendChatMessage = message =>
  api.post('/chat', { message }).then(r => r.data)

export const exportCSV = () =>
  api.get('/records/export/csv', { responseType: 'blob' }).then(r => {
    const url = window.URL.createObjectURL(r.data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'opscenter_records.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  })

export const exportExcel = () =>
  api.get('/records/export/excel', { responseType: 'blob' }).then(r => {
    const url = window.URL.createObjectURL(r.data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'opscenter_records.xlsx'
    a.click()
    window.URL.revokeObjectURL(url)
  })

export const deleteRecord = id => api.delete(`/records/${id}`).then(r => r.data)

export const deleteUpload = id => api.delete(`/uploads/${id}`).then(r => r.data)
