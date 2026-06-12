import { NavLink, useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import { setToken } from '../lib/api'
import { LayoutDashboard, Radio, Cpu, Users, FileText, LogOut, Ticket, Zap, BookOpen, Mail } from 'lucide-react'

const nav = [
  { to: '/', icon: LayoutDashboard, label: '仪表盘' },
  { to: '/channels', icon: Radio, label: '渠道管理' },
  { to: '/models', icon: Cpu, label: '模型管理' },
  { to: '/users', icon: Users, label: '用户管理' },
  { to: '/messages', icon: Mail, label: '用户留言' },
  { to: '/logs', icon: FileText, label: '请求日志' },
  { to: '/autogen', icon: Zap, label: '自动生成' },
  { to: '/guide-edit', icon: BookOpen, label: '使用指南' },
  { to: '/redeem', icon: Ticket, label: '兑换码' },
]

export default function Layout({ user, children }: { user: any; children: React.ReactNode }) {
  const n = useNavigate()
  const logout = () => { setToken(null); n('/login'); window.location.reload() }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-800">
          <img src="/logo.png" alt="logo" className="w-8 h-8 rounded" /><h1 className="text-lg font-semibold text-white">T粒加油站</h1>
          <p className="text-xs text-gray-500 mt-0.5">AI 接口管理平台</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-800 flex items-center justify-between">
          <span className="text-sm text-gray-400 truncate">{user?.display_name || user?.username}</span>
          <ThemeToggle />
          <button onClick={logout} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-red-400 transition-colors" title="退出登录">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
