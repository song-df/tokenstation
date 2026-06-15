import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ThemeProvider } from './lib/theme'
import { api, setToken } from './lib/api'
import UserLayout from './components/UserLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import QuickGuide from './pages/QuickGuide'
import CodexGuide from './pages/CodexGuide'
import ClaudeCodeGuide from './pages/ClaudeCodeGuide'
import FlClashGuide from './pages/FlClashGuide'
import VSCodeGuide from './pages/VSCodeGuide'
import OpenAIGuide from './pages/OpenAIGuide'
import ModelsPage from './pages/ModelsPage'
import ModelPricing from './pages/ModelPricing'
import CourseSubscription from './pages/CourseSubscription'
import LandingPage from './pages/LandingPage'
import StudentDashboard from './pages/StudentDashboard'
import StudentProfile from './pages/StudentProfile'
import ApiKeysPage from './pages/ApiKeysPage'
import ProxySubscription from './pages/ProxySubscription'
import AdminProxy from './pages/AdminProxy'
import ReferralPage from './pages/ReferralPage'
import TliPurchase from './pages/TliPurchase'
import AlipayResult from './pages/AlipayResult'

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
      <Route path="/guide/codex" element={<CodexGuide />} />
      <Route path="/guide/claude-code" element={<ClaudeCodeGuide />} />
      <Route path="/guide/flclash" element={<FlClashGuide />} />
      <Route path="/guide/vscode" element={<VSCodeGuide />} />
      <Route path="/guide/openai" element={<OpenAIGuide />} />
      <Route path="/guide/models" element={<ModelPricing />} />
      <Route path="/models" element={<ModelsPage />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login onLogin={setUser} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )

  // Authenticated — admin and student share the same layout
  // Admin gets extra nav items injected by UserLayout via user.role
  return (
    <UserLayout user={user}>
      <Routes>
        <Route path="/" element={<StudentDashboard />} />
        <Route path="/profile" element={<StudentProfile />} />
        <Route path="/keys" element={<ApiKeysPage />} />
        <Route path="/proxy" element={<ProxySubscription />} />
        <Route path="/referral" element={<ReferralPage />} />
        <Route path="/purchase" element={<TliPurchase />} />
        <Route path="/alipay-result" element={<AlipayResult />} />
        <Route path="/course" element={<CourseSubscription />} />
        <Route path="/guide" element={<QuickGuide />} />
        <Route path="/guide/codex" element={<CodexGuide />} />
        <Route path="/guide/claude-code" element={<ClaudeCodeGuide />} />
        <Route path="/guide/flclash" element={<FlClashGuide />} />
        <Route path="/guide/vscode" element={<VSCodeGuide />} />
        <Route path="/guide/openai" element={<OpenAIGuide />} />
        <Route path="/guide/models" element={<ModelPricing />} />
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/admin/proxy" element={<AdminProxy />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UserLayout>
  )
}
