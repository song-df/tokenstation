import { Download, Settings, Check, Zap, MousePointer, ArrowRight } from 'lucide-react'

export default function FlClashGuide() {
  const steps = [
    {
      title: '第一步：下载安装 FlClash',
      desc: '点击下方按钮下载 Windows 安装包，双击安装。',
      img: null,
      extra: (
        <a
          href="https://github.com/chen08209/FlClash/releases/download/v0.8.93/FlClash-0.8.93-windows-amd64-setup.exe"
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors mt-3"
        >
          <Download size={18} /> 下载 FlClash v0.8.93 (Windows)
        </a>
      ),
    },
    {
      title: '第二步：导入配置文件',
      desc: '登录 T粒加油站 → 代理订阅 → 下载配置文件。然后打开 FlClash，点击「配置」页面的导入按钮。',
      img: '添加配置文件入口.jpg',
    },
    {
      title: '第三步：选择配置文件',
      desc: '找到下载的 clash-*.yaml 文件，点击打开。',
      img: '添加配置文件.jpg',
    },
    {
      title: '导入成功',
      desc: '导入后配置列表会出现新的配置项，选中它。',
      img: '添加配置文件成功.jpg',
    },
    {
      title: '第四步：开启代理',
      desc: '回到「主页」，打开「系统代理」开关。状态栏显示连接信息即表示成功。',
      img: '开启代理.jpg',
    },
    {
      title: '验证连接',
      desc: '可以在「代理」页面测试节点延迟，确认连接正常。',
      img: '代理测速.jpg',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings size={24} className="text-emerald-400" />
            <span className="text-lg font-semibold">T粒加油站</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/guide" className="text-gray-400 hover:text-gray-200 transition-colors">← 使用说明</a>
            <a href="/proxy" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">代理订阅</a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            FlClash 代理客户端使用说明
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            下载 → 导入配置 → 开启代理，三步完成
          </p>
        </section>

        {/* Steps */}
        <div className="space-y-8">
          {steps.map((step, i) => (
            <section key={i} className="rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-4">
              <h2 className="flex items-center gap-3 text-xl font-bold">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 text-sm font-bold">
                  {i === 2 ? <Check size={18} className="text-emerald-400" /> : i + 1}
                </span>
                {step.title}
              </h2>

              <p className="text-gray-400">{step.desc}</p>

              {step.img && (
                <div className="rounded-xl border border-gray-700 overflow-hidden bg-gray-950">
                  <img
                    src={`/${step.img}`}
                    alt={step.title}
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
              )}

              {step.extra}
            </section>
          ))}
        </div>

        {/* Tips */}
        <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 text-sm text-amber-200/90">
          <p className="font-semibold">💡 使用提示</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>代理订阅到期后配置文件会失效，重新订阅后下载新的配置文件即可</li>
            <li>主节点使用 Hysteria2（高速），SS 节点作为备用</li>
            <li>如遇到网站打不开，尝试在 FlClash 的「代理」页面切换节点后再试</li>
            <li>不用代理时记得关闭「系统代理」，否则可能影响国内网站访问速度</li>
            <li>其他平台（macOS/Linux/Android）可在 <a href="https://github.com/chen08209/FlClash/releases" target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 underline">FlClash Releases</a> 下载对应版本</li>
          </ul>
        </div>

        <div className="text-center py-8">
          <a href="/proxy" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-lg font-semibold transition-all shadow-lg shadow-emerald-600/25">
            <Zap size={20} /> 前往代理订阅
          </a>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-600">
        T粒加油站 · t.wiselink.cc · <a href="/guide" className="hover:text-gray-400 transition-colors">使用说明</a>
      </footer>
    </div>
  )
}
