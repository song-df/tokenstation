import { Terminal, Zap, Globe, Cpu, ArrowRight, Monitor } from 'lucide-react'

export default function QuickGuide() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={24} className="text-blue-400" />
            <span className="text-lg font-semibold">T粒加油站</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/register" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">注册使用</a>
            <a href="/login" className="text-gray-400 hover:text-gray-200 transition-colors">登录</a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            使用说明
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            选择适合你的接入方式，一分钟完成配置
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="/guide/claude-code" className="group p-5 rounded-xl bg-gray-900 border border-gray-800 hover:border-orange-500/40 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Terminal size={20} className="text-orange-400" />
                  <h3 className="text-base font-semibold text-white">Claude Code 接入</h3>
                </div>
                <p className="text-sm text-gray-500">macOS / Linux / Windows 通用，环境变量一键接入。推荐大多数用户使用。</p>
              </div>
              <ArrowRight size={16} className="text-gray-700 group-hover:text-orange-400 shrink-0 mt-1 transition-colors" />
            </div>
          </a>
          <a href="/guide/codex" className="group p-5 rounded-xl bg-gray-900 border border-gray-800 hover:border-cyan-500/40 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Monitor size={20} className="text-cyan-400" />
                  <h3 className="text-base font-semibold text-white">Windows 从零安装 Codex</h3>
                </div>
                <p className="text-sm text-gray-500">Codex CLI + Moon Bridge 中转完整教程，包含 nvm/Go 安装、后台驻留。</p>
              </div>
              <ArrowRight size={16} className="text-gray-700 group-hover:text-cyan-400 shrink-0 mt-1 transition-colors" />
            </div>
          </a>
          <a className="group p-5 rounded-xl bg-gray-900 border border-gray-800 hover:border-green-500/40 transition-colors cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={20} className="text-green-400" />
                  <h3 className="text-base font-semibold text-white">OpenAI 兼容接口</h3>
                </div>
                <p className="text-sm text-gray-500">Cursor、Continue、Aider 等工具通用接入方式。</p>
              </div>
              <ArrowRight size={16} className="text-gray-700 group-hover:text-green-400 shrink-0 mt-1 transition-colors" />
            </div>
          </a>
          <a className="group p-5 rounded-xl bg-gray-900 border border-gray-800 hover:border-purple-500/40 transition-colors cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Cpu size={20} className="text-purple-400" />
                  <h3 className="text-base font-semibold text-white">可用模型 & 定价</h3>
                </div>
                <p className="text-sm text-gray-500">全部 17 款模型、价格档位、T粒消耗参考。</p>
              </div>
              <ArrowRight size={16} className="text-gray-700 group-hover:text-purple-400 shrink-0 mt-1 transition-colors" />
            </div>
          </a>
        </section>

        <div className="text-center py-8">
          <a href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-lg font-semibold transition-all shadow-lg shadow-blue-600/25">
            <Zap size={20} /> 还没有账号？立即注册
          </a>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-600">
        T粒加油站 · ai.aiotedu.cc
      </footer>
    </div>
  )
}
