import { useNavigate, Link, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import { setToken } from '../lib/api'
import { LogOut, LayoutDashboard, Key, BookOpen, User, Coins, Ticket, Cpu, Clock, Wallet, Settings, Wifi, Share2, ShieldCheck, ShoppingCart, GraduationCap } from 'lucide-react'

// 路由级 Tab
const TABS = [
  { to: '/', label: '概览', icon: LayoutDashboard },
  { to: '/keys', label: 'Key 管理', icon: Key },
  { to: '/purchase', label: '在线充值', icon: Coins },
  { to: '/proxy', label: '代理订阅', icon: Wifi },
  { to: '/referral', label: '推荐有礼', icon: Share2 },
  { to: '/course', label: '课程订阅', icon: ShoppingCart },
  { to: '/guide', label: '使用说明', icon: BookOpen },
  { to: '/profile', label: '个人资料', icon: User },
]
export default function UserLayout({ user, children }: { user: any; children: React.ReactNode }) {
  const n = useNavigate()
  const loc = useLocation()
  const logout = () => { setToken(null); n('/login'); window.location.reload() }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 md:flex">
      {/* 左侧导航 */}
      <aside className="md:w-60 md:shrink-0 md:h-screen md:sticky md:top-0 border-b md:border-b-0 md:border-r border-gray-800 bg-gray-900 flex flex-col">
        <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-800">
          <img src="/logo.png" alt="logo" className="w-7 h-7 rounded" />
          <h1 className="text-lg font-semibold text-white">T粒加油站</h1>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {TABS.map(t => {
            const active = loc.pathname === t.to
            const Icon = t.icon
            return (
              <Link key={t.to} to={t.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-blue-600/20 text-blue-300 font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
                <Icon size={16} /> {t.label}
              </Link>
            )
          })}

          {user?.role === 'admin' && (
            <div className="pt-4 mt-3 border-t border-amber-500/30">
              <p className="px-3 pb-1 text-xs text-amber-500/70 uppercase tracking-wide">管理</p>
              <Link to="/redeem"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${loc.pathname === '/redeem' ? 'bg-amber-600/20 text-amber-300 font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
                <Ticket size={16} /> T粒兑换码管理
              </Link>
              <Link to="/admin/course-codes"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${loc.pathname === '/admin/course-codes' ? 'bg-amber-600/20 text-amber-300 font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
                <GraduationCap size={16} /> 课程邀请码
              </Link>
              <Link to="/admin/proxy"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${loc.pathname === '/admin/proxy' ? 'bg-amber-600/20 text-amber-300 font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
                <ShieldCheck size={16} /> 代理管理
              </Link>
            </div>
          )}
        </nav>

        <div className="px-3 py-3 border-t border-gray-800 flex items-center justify-between">
          <Link to="/profile" className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-gray-400 hover:text-blue-400 truncate">
            <User size={14} /> <span className="truncate">{user?.display_name || user?.username}</span>
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            <button onClick={logout} title="退出" className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-red-400 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="flex-1 min-w-0 px-6 py-8">
        <div className="max-w-5xl mx-auto">{children}</div>
        <footer className="border-t border-gray-800/60 mt-12 pt-4 pb-6 text-center text-xs text-gray-600"><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors">浙ICP备2026039790号-1</a></footer>
      </main>
    </div>
  )
}
