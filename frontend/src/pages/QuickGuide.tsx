import { Terminal, Zap, Globe, Cpu, ArrowRight, Monitor, Wifi, Code } from 'lucide-react'
import PublicLayout from '../components/PublicLayout'

export default function QuickGuide({ embedded = false }: { embedded?: boolean }) {
  const content = (
    <main className="mx-auto max-w-5xl space-y-12 px-6 py-14">
        <section className="text-center space-y-4">
          <p className="text-sm font-semibold text-blue-400">按工具选择教程</p>
          <h1 className="text-4xl font-bold text-white">使用说明</h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            选择适合你的接入方式，一分钟完成配置
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="/guide/flclash" className="group p-5 rounded-xl bg-gray-900 border border-gray-800 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wifi size={20} className="text-emerald-400" />
                  <h3 className="text-base font-semibold text-white">FlClash 代理客户端</h3>
                </div>
                <p className="text-sm text-gray-500">下载安装 FlClash、导入配置文件、开启代理，图文教程。</p>
              </div>
              <ArrowRight size={16} className="text-gray-700 group-hover:text-emerald-400 shrink-0 mt-1 transition-colors" />
            </div>
          </a>
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
          <a href="/guide/vscode" className="group p-5 rounded-xl bg-gray-900 border border-gray-800 hover:border-purple-500/40 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Code size={20} className="text-purple-400" />
                  <h3 className="text-base font-semibold text-white">VSCode + Claude Code</h3>
                </div>
                <p className="text-sm text-gray-500">从零安装 VSCode，配置 Claude Code 插件，AI 编程能力起飞。</p>
              </div>
              <ArrowRight size={16} className="text-gray-700 group-hover:text-purple-400 shrink-0 mt-1 transition-colors" />
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
          <a href="/guide/codex-mac-linux" className="group p-5 rounded-xl bg-gray-900 border border-gray-800 hover:border-green-500/40 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Terminal size={20} className="text-green-400" />
                  <h3 className="text-base font-semibold text-white">Mac / Linux 从零安装 Codex</h3>
                </div>
                <p className="text-sm text-gray-500">Mac/Linux 版 Codex CLI + Moon Bridge 教程，nohup/tmux/launchd/systemd 后台方案。</p>
              </div>
              <ArrowRight size={16} className="text-gray-700 group-hover:text-green-400 shrink-0 mt-1 transition-colors" />
            </div>
          </a>
          <a href="/guide/openai" className="group p-5 rounded-xl bg-gray-900 border border-gray-800 hover:border-green-500/40 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={20} className="text-green-400" />
                  <h3 className="text-base font-semibold text-white">OpenAI 兼容接口</h3>
                </div>
                <p className="text-sm text-gray-500">Cursor、Continue、Aider、Cline 等工具通用接入方式。</p>
              </div>
              <ArrowRight size={16} className="text-gray-700 group-hover:text-green-400 shrink-0 mt-1 transition-colors" />
            </div>
          </a>
          <a href="/models" className="group p-5 rounded-xl bg-gray-900 border border-gray-800 hover:border-purple-500/40 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Cpu size={20} className="text-purple-400" />
                  <h3 className="text-base font-semibold text-white">可用模型 & 定价</h3>
                </div>
                <p className="text-sm text-gray-500">全部模型、输出价格档位、token 限制一览。</p>
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
  )

  return embedded ? content : <PublicLayout>{content}</PublicLayout>
}
