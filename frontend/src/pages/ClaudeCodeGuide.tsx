import { useState } from 'react'
import { Copy, Check, Terminal, Zap, Key } from 'lucide-react'

export default function ClaudeCodeGuide() {
  const [copied, setCopied] = useState<Record<string, boolean>>({})

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied({ ...copied, [id]: true })
    setTimeout(() => setCopied({ ...copied, [id]: false }), 2000)
  }

  const CodeBlock = ({ id, code, lang }: { id: string; code: string; lang: string }) => (
    <div className="relative group rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-800">
        <span className="text-xs text-gray-500 font-mono">{lang}</span>
        <button onClick={() => copy(id, code)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-400 transition-colors">
          {copied[id] ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          {copied[id] ? '已复制' : '复制'}
        </button>
      </div>
      <pre className="p-4 text-sm text-gray-300 overflow-x-auto font-mono leading-relaxed"><code>{code}</code></pre>
    </div>
  )

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ai.aiotedu.cc'

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={24} className="text-blue-400" />
            <span className="text-lg font-semibold">T粒加油站</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/guide" className="text-gray-400 hover:text-gray-200 transition-colors">← 使用说明</a>
            <a href="/register" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">注册使用</a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Claude Code 零门槛上手
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            macOS / Linux / Windows 通用 · 环境变量一键接入
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Key size={24} className="text-blue-400" /> 获取 API Key
          </h2>
          <p className="text-gray-400">
            注册账号后在个人主页即可查看 API Key。Anthropic 原生接口地址：
            <code className="px-2 py-0.5 rounded bg-gray-800 text-blue-400 font-mono text-sm">{origin}</code>
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Terminal size={24} className="text-orange-400" /> 接入步骤
          </h2>

          <p className="text-gray-400">第 1 步：安装 Claude Code（已装可跳过）：</p>
          <CodeBlock id="cc0" lang="终端" code="npm install -g @anthropic-ai/claude-code" />

          <p className="text-gray-400 mt-6">第 2 步：选择下面一种方式配置：</p>

          <h3 className="text-base font-semibold text-white mt-4">方式 A · 环境变量（推荐）</h3>
          <p className="text-gray-400 text-sm">把下面 4 行<b className="text-orange-300">一起</b>复制到终端执行（把 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-orange-400 font-mono text-xs">sk-你的APIKey</code> 换成你的 Key）：</p>
          <CodeBlock id="cc1" lang="终端 (macOS / Linux)" code={`export ANTHROPIC_BASE_URL=${origin}
export ANTHROPIC_AUTH_TOKEN=sk-你的APIKey
export ANTHROPIC_MODEL=claude-opus-4-8
export ANTHROPIC_SMALL_FAST_MODEL=claude-haiku-4-5`} />

          <h3 className="text-base font-semibold text-white mt-4">方式 B · 永久配置</h3>
          <p className="text-gray-400 text-sm">写入 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-xs">~/.claude/settings.json</code>，一次配置永久生效：</p>
          <CodeBlock id="cc2" lang="JSON" code={`{
  "env": {
    "ANTHROPIC_BASE_URL": "${origin}",
    "ANTHROPIC_AUTH_TOKEN": "sk-你的APIKey",
    "ANTHROPIC_MODEL": "claude-opus-4-8",
    "ANTHROPIC_SMALL_FAST_MODEL": "claude-haiku-4-5"
  }
}`} />

          <p className="text-gray-400 mt-6">第 3 步：在你的项目目录输入 <code className="px-2 py-0.5 rounded bg-gray-800 text-orange-400 font-mono text-sm">claude</code> 即可开始使用。</p>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200/90 space-y-1.5">
            <p>⚠️ <b>必须设置 <code className="font-mono">ANTHROPIC_MODEL</code></b>：本站不使用 Claude 官方默认模型名，不设会报"模型不存在"。可选：</p>
            <ul className="list-disc list-inside ml-2 space-y-0.5">
              <li><code className="font-mono">claude-opus-4-8</code> — 最强模型</li>
              <li><code className="font-mono">claude-sonnet-4-6</code> — 性价比之选</li>
              <li><code className="font-mono">claude-haiku-4-5</code> — 快速便宜</li>
            </ul>
            <p className="mt-2">💡 <code className="font-mono">ANTHROPIC_SMALL_FAST_MODEL</code> 是后台小任务用的便宜模型，设为 <code className="font-mono">claude-haiku-4-5</code> 更省 T粒。</p>
            <p>🪟 Windows（PowerShell）：把每行写成 <code className="font-mono">$env:ANTHROPIC_BASE_URL="{origin}"</code> 这种形式。</p>
          </div>
        </section>

        <div className="text-center py-8">
          <a href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-lg font-semibold transition-all shadow-lg shadow-blue-600/25">
            <Zap size={20} /> 还没有账号？立即注册
          </a>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-600">
        T粒加油站 · ai.aiotedu.cc · <a href="/guide" className="hover:text-gray-400 transition-colors">使用说明</a>
      </footer>
    </div>
  )
}
