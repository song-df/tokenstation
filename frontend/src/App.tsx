import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ThemeProvider } from './lib/theme'
import { api, setToken } from './lib/api'
import UserLayout from './components/UserLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import QuickGuide from './pages/QuickGuide'
import CodexGuide from './pages/CodexGuide'
import LandingPage from './pages/LandingPage'
import StudentDashboard from './pages/StudentDashboard'
import StudentProfile from './pages/StudentProfile'
import ApiKeysPage from './pages/ApiKeysPage'

// 管理后台已迁移到 new-api 自带控制台(https://nai.aiotedu.cc)。
// 学生端保留本前端;管理员登录后引导至该后台,不再使用旧 admin 页面。
const ADMIN_CONSOLE_URL = 'https://admin-nai.aiotedu.cc'

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
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login onLogin={setUser} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )

  // Admin view:管理后台已迁移到 new-api 自带控制台,引导跳转。
  if (user.role === 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-gray-300">
        <p className="text-lg">管理后台已迁移至新版控制台</p>
        <a href={ADMIN_CONSOLE_URL} className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white">
          前往管理后台 →
        </a>
        <button onClick={() => { setToken(null); setUser(null) }} className="text-sm text-gray-500 hover:text-gray-300">退出登录</button>
      </div>
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
        <Route path="/guide/codex" element={<CodexGuide />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UserLayout>
  )
}

