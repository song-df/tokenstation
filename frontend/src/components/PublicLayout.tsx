import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: '首页' },
  { to: '/models', label: '模型价格' },
  { to: '/guide', label: '使用说明' },
]

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-700/80 bg-[#0f172a]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-18 max-w-6xl items-center gap-5 px-5 py-3 md:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5 text-base font-bold text-white md:text-lg">
            <img src="/logo.png" alt="T粒加油站 Logo" className="h-8 w-8 rounded-lg object-cover shadow-lg shadow-blue-950/40" />
            T粒加油站
          </Link>

          <nav className="ml-auto flex items-center gap-1 overflow-x-auto text-sm md:gap-2">
            {NAV_ITEMS.map(item => {
              const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 transition-colors ${active ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'}`}
                >
                  {item.label}
                </Link>
              )
            })}
            <Link to="/login" className="whitespace-nowrap rounded-lg px-3 py-2 text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-white">
              登录
            </Link>
            <Link to="/register" className="ml-1 whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-500">
              注册
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="border-t border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium text-slate-300">T粒加油站</p>
            <p className="mt-1">多模型统一接入，按实际用量计费。</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link to="/models" className="hover:text-slate-300">模型价格</Link>
            <Link to="/guide" className="hover:text-slate-300">使用说明</Link>
            <Link to="/terms" className="hover:text-slate-300">用户协议</Link>
            <a href="mailto:songdf@petalmail.com" className="hover:text-slate-300">联系反馈</a>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300">浙ICP备2026039790号-1</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
