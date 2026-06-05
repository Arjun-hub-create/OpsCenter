import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HudBackground from './components/Layout/HudBackground'
import Sidebar from './components/Layout/Sidebar'
import TopBar from './components/Layout/TopBar'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import ReviewPage from './pages/ReviewPage'
import HistoryPage from './pages/HistoryPage'
import ChatPage from './pages/ChatPage'

function Layout({ children }) {
  return (
    <div className="app-shell">
      <HudBackground />
      <Sidebar />
      <div className="main-area" style={{ position: 'relative', zIndex: 1 }}>
        <TopBar />
        {children}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/review/:recordId" element={<ReviewPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
