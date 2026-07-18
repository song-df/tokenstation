import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, BookOpen, Coins, GraduationCap, Key, LayoutDashboard, LogOut, Mail, Share2, ShieldCheck, Ticket, User, Wifi, X } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { setToken } from '../lib/api'
import { useState } from 'react'

const STUDENT_TABS = [
  { to: '/', label: '概览', icon: LayoutDashboard },
  { to: '/keys', label: 'Key 管理', icon: Key },
  { to: '/purchase', label: '在线充值', icon: Coins },
  { to: '/proxy', label: '代理订阅', icon: Wifi },
  { to: '/referral', label: '推荐有礼', icon: Share2 },
  { to: '/guide', label: '使用说明', icon: BookOpen },
  { to: '/profile', label: '个人资料', icon: User },
]

const ADMIN_TABS = [
  { to: '/redeem', label: 'T粒兑换码管理', icon: Ticket },
  { to: '/admin/course-codes', label: '课程邀请码', icon: GraduationCap },
  { to: '/admin/proxy', label: '代理管理', icon: ShieldCheck },
  { to: '/admin/stats', label: '充值统计', icon: BarChart3 },
]

function NavItem({ to, label, icon: Icon, active, admin = false }: { to: string; label: string; icon: typeof LayoutDashboard; active: boolean; admin?: boolean }) {
  const activeClass = admin
    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    : 'border-blue-500/30 bg-blue-500/15 text-blue-300'

  return (
    <Link
      to={to}
      className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors ${active ? activeClass : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
    >
      <Icon size={16} /> <span className="whitespace-nowrap">{label}</span>
    </Link>
  )
}

export default function UserLayout({ user, children }: { user: any; children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [bannerDismissed, setBannerDismissed] = useState(() => localStorage.getItem('verify-banner-gone') === '1')
  const logout = () => {
    setToken(null)
    navigate('/login')
    window.location.reload()
  }

  const dismissBanner = () => {
    localStorage.setItem('verify-banner-gone', '1')
    setBannerDismissed(true)
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 md:flex">
      <aside className="border-b border-slate-800 bg-slate-900 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="flex min-h-16 items-center justify-between border-b border-slate-800 px-4 md:px-5">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-white">
            <img src="/logo.png" alt="T粒加油站 Logo" className="h-8 w-8 rounded-lg object-cover" />
            T粒加油站
          </Link>
          <div className="md:hidden"><ThemeToggle /></div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 py-3 md:flex-1 md:flex-col md:overflow-y-auto md:py-4">
          {STUDENT_TABS.map(tab => (
            <NavItem key={tab.to} {...tab} active={location.pathname === tab.to} />
          ))}

          {user?.role === 'admin' && (
            <div className="contents md:mt-4 md:block md:border-t md:border-amber-500/20 md:pt-4">
              <p className="hidden px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-amber-500/70 md:block">管理入口</p>
              <div className="contents md:block md:space-y-1">
                {ADMIN_TABS.map(tab => (
                  <NavItem key={tab.to} {...tab} active={location.pathname === tab.to} admin />
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="hidden items-center justify-between border-t border-slate-800 px-3 py-3 md:flex">
          <Link to="/profile" className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-400 hover:text-blue-300">
            <User size={14} /> <span className="truncate">{user?.display_name || user?.username}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <button onClick={logout} title="退出登录" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {!bannerDismissed && (
          <div className="flex items-center justify-center gap-2 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-sm text-amber-200/80">
            <Mail size={14} className="shrink-0" />
            <span>验证邮箱即可领取 <strong className="text-amber-300">50 T粒</strong> 奖励</span>
            <Link to="/profile" className="ml-1 underline underline-offset-2 hover:text-amber-300">前往个人中心</Link>
            <button onClick={dismissBanner} className="ml-3 rounded p-0.5 hover:bg-amber-500/20 text-amber-400/60 hover:text-amber-300" title="不再提示">
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-5 py-3 md:hidden">
          <span className="truncate text-sm text-slate-400">{user?.display_name || user?.username}</span>
          <button onClick={logout} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400">
            <LogOut size={15} /> 退出
          </button>
        </div>
        <main className="px-4 py-7 sm:px-6 md:px-8 md:py-9">
          <div className="mx-auto max-w-6xl">{children}</div>
          <footer className="mx-auto mt-12 max-w-6xl border-t border-slate-800/80 pb-6 pt-5 text-center text-xs text-slate-600">
            <Link to="/terms" className="hover:text-slate-400">用户协议</Link> · 反馈：<a href="mailto:songdf@petalmail.com" className="hover:text-slate-400">songdf@petalmail.com</a> · <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400">浙ICP备2026039790号-1</a>
          </footer>
        </main>
      </div>
    </div>
  )
}
