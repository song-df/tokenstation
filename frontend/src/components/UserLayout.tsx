import { useNavigate, Link } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import FloatingMessage from './FloatingMessage'
import { setToken } from '../lib/api'
import { LogOut, Zap } from 'lucide-react'

export default function StudentLayout({ user, children }: { user: any; children: React.ReactNode }) {
  const n = useNavigate()
  const logout = () => { setToken(null); n('/login'); window.location.reload() }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="logo" className="w-6 h-6 rounded" />
            <h1 className="text-lg font-semibold text-white">T粒加油站</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">首页</Link>
            <Link to="/keys" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">Key管理</Link>
            <Link to="/profile" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">{user?.display_name || user?.username}</Link>
            <ThemeToggle />
            <button onClick={logout} className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-red-400 text-sm transition-colors">
              <LogOut size={14} /> 退出
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}<FloatingMessage />
    </main>
    </div>
  )
}
