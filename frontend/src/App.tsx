import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ThemeProvider } from './lib/theme'
import { api, setToken } from './lib/api'
import Layout from './components/Layout'
import UserLayout from './components/UserLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import QuickGuide from './pages/QuickGuide'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import StudentDashboard from './pages/StudentDashboard'
import StudentProfile from './pages/StudentProfile'
import ApiKeysPage from './pages/ApiKeysPage'
import Channels from './pages/Channels'
import Models from './pages/Models'
import Users from './pages/Users'
import Logs from './pages/Logs'
import RedeemCodes from './pages/RedeemCodes'
import AutoGen from './pages/AutoGen'
import GuideEditor from './pages/GuideEditor'
import AdminMessages from './pages/AdminMessages'

export default function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem('token')
    if (t) {
      setToken(t)
      api.me().then(u => { setUser(u); setLoading(false) }).catch(() => { setToken(null); setLoading(false) })
    } else {
      setLoading(false)
    }
  }, [])

  return (
    <ThemeProvider>
      <AppInner user={user} loading={loading} setUser={setUser} />
    </ThemeProvider>
  )
}

function AppInner({ user, loading, setUser }: { user: any; loading: boolean; setUser: any }) {
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">加载中...</div>
  if (!user) return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/guide" element={<QuickGuide />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login onLogin={setUser} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )

  // Admin view
  if (user.role === 'admin') {
    return (
      <Layout user={user}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/models" element={<Models />} />
          <Route path="/users" element={<Users />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/redeem" element={<RedeemCodes />} />
          <Route path="/autogen" element={<AutoGen />} />
          <Route path="/guide-edit" element={<GuideEditor />} />
          <Route path="/messages" element={<AdminMessages />} />
          <Route path="/guide" element={<QuickGuide />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    )
  }

  // Student view
  return (
    <UserLayout user={user}>
      <Routes>
        <Route path="/" element={<StudentDashboard />} />
        <Route path="/profile" element={<StudentProfile />} />
        <Route path="/keys" element={<ApiKeysPage />} />
        <Route path="/guide" element={<QuickGuide />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UserLayout>
  )
}

