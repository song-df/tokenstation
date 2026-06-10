import { useState } from 'react'
import { Copy, Check, Terminal, Zap, Key, Globe, Cpu } from 'lucide-react'

export default function QuickGuide() {
  const [copied, setCopied] = useState<Record<string, boolean>>({})

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied({...copied, [id]: true})
    setTimeout(() => setCopied({...copied, [id]: false}), 2000)
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

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Claude Code 零门槛上手
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            16 款精选大模型 · 官方原生模型ID · 兑换码秒充到账 · 7×24 在线响应
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Key size={24} className="text-blue-400" /> 获取 API Key
          </h2>
          <p className="text-gray-400">
            注册账号后在个人主页即可查看 API Key。Anthropic 原生接口地址：<code className="px-2 py-0.5 rounded bg-gray-800 text-blue-400 font-mono text-sm">https://ai.aiotedu.cc</code>　·　OpenAI 兼容接口地址：<code className="px-2 py-0.5 rounded bg-gray-800 text-blue-400 font-mono text-sm">https://ai.aiotedu.cc/v1</code>
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Terminal size={24} className="text-orange-400" /> Claude Code 接入（推荐）
          </h2>
          <p className="text-gray-400">第 1 步：安装 Claude Code（已装可跳过）：</p>
          <CodeBlock id="cc0" lang="终端" code={`npm install -g @anthropic-ai/claude-code`} />
          <p className="text-gray-400">第 2 步：把下面 4 行<b className="text-orange-300">一起</b>复制到终端执行（把 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-orange-400 font-mono text-xs">sk-你的APIKey</code> 换成你的 Key）：</p>
          <CodeBlock id="cc1" lang="终端 (macOS / Linux)" code={`export ANTHROPIC_BASE_URL=https://ai.aiotedu.cc
export ANTHROPIC_AUTH_TOKEN=sk-你的APIKey
export ANTHROPIC_MODEL=claude-opus-4-8
export ANTHROPIC_SMALL_FAST_MODEL=claude-haiku-4-5`} />
          <p className="text-gray-400">第 3 步：在你的项目目录输入 <code className="px-2 py-0.5 rounded bg-gray-800 text-orange-400 font-mono text-sm">claude</code> 即可开始使用。</p>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200/90 space-y-1.5">
            <p>⚠️ <b>必须设置 <code className="font-mono">ANTHROPIC_MODEL</code></b>：本站不使用 Claude 官方默认模型名，不设会报“模型不存在”。可选 <code className="font-mono">claude-opus-4-8</code> / <code className="font-mono">claude-sonnet-4-6</code> / <code className="font-mono">claude-haiku-4-5</code>。</p>
            <p>💡 <code className="font-mono">ANTHROPIC_SMALL_FAST_MODEL</code> 是后台小任务用的便宜模型，设为 <code className="font-mono">claude-haiku-4-5</code> 更省 T粒。</p>
            <p>🪟 Windows（PowerShell）：把每行写成 <code className="font-mono">$env:ANTHROPIC_BASE_URL="https://ai.aiotedu.cc"</code> 这种形式。</p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Globe size={24} className="text-green-400" /> OpenAI 兼容接口
          </h2>
          <p className="text-gray-400">所有模型均支持 OpenAI 兼容格式，可直接接入 Cursor、Continue、Aider 等工具：</p>
          <CodeBlock id="op1" lang="环境变量" code={`export OPENAI_BASE_URL=https://ai.aiotedu.cc/v1
export OPENAI_API_KEY=sk-你的APIKey`} />
          <CodeBlock id="op2" lang="curl 测试" code={`curl https://ai.aiotedu.cc/v1/chat/completions \
  -H "Authorization: Bearer sk-你的APIKey" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4-flash","messages":[{"role":"user","content":"你好"}]}'`} />
        </section>

        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Cpu size={24} className="text-purple-400" /> 可用模型
          </h2>
          <p className="text-gray-400 text-sm">标签按<b className="text-gray-200">输出价</b>分档：<span className="text-red-400">非常贵</span> · <span className="text-orange-400">贵</span> · <span className="text-yellow-400">中等</span> · <span className="text-green-400">低价</span>。下方价格为 T粒/千 tokens（输入 / 输出）。</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {([
              ['Claude Opus 4.8', 'claude-opus-4-8', '5.4 / 27'],
              ['Claude Sonnet 4.6', 'claude-sonnet-4-6', '3.24 / 16.2'],
              ['Claude Haiku 4.5', 'claude-haiku-4-5', '1.08 / 5.4'],
              ['GPT-5.5', 'gpt-5.5', '5.4 / 32.4'],
              ['GPT-5.5 Pro', 'gpt-5.5-pro', '32.4 / 194.4'],
              ['GPT-5.3 Codex', 'gpt-5.3-codex', '1.89 / 15.12'],
              ['Gemini 3.5 Flash', 'gemini-3.5-flash', '1.62 / 9.72'],
              ['Gemini 3.1 Pro', 'gemini-3.1-pro', '2.16 / 12.96'],
              ['Step 3.7 Flash', 'step-3.7-flash', '0.216 / 1.242'],
              ['Qwen 3.7 Max', 'qwen3.7-max', '1.35 / 4.05'],
              ['DeepSeek V4 Pro', 'deepseek-v4-pro', '0.45 / 0.9'],
              ['DeepSeek V4 Flash', 'deepseek-v4-flash', '0.15 / 0.3'],
              ['GLM-5.1', 'glm-5.1', '0.9 / 3.6'],
              ['Kimi K2.6', 'kimi-k2.6', '0.975 / 4.05'],
              ['MiniMax M2.5', 'minimax-m2.5', '0.315 / 1.26'],
              ['Qwen3.5-397B', 'qwen3.5-397b-a17b', '0.18 / 1.08'],
            ] as [string, string, string][]).map(([name, id, price]) => {
              const out = parseFloat(price.split('/')[1])
              const tier = out >= 100 ? ['非常贵','bg-red-500/15 text-red-400 border-red-500/30']
                : out >= 15 ? ['贵','bg-orange-500/15 text-orange-400 border-orange-500/30']
                : out >= 4 ? ['中等','bg-yellow-500/15 text-yellow-400 border-yellow-500/30']
                : ['低价','bg-green-500/15 text-green-400 border-green-500/30']
              return (
              <div key={id} className="p-3 rounded-lg bg-gray-900 border border-gray-800 flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <div className="text-sm text-gray-200 flex items-center gap-2">{name}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${tier[1]}`}>{tier[0]}</span>
                  </div>
                  <code className="text-xs text-gray-500 font-mono">{id}</code>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{price} T粒/千</span>
              </div>)
            })}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            💰 定价说明
          </h2>
          <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
            <p className="text-gray-400">10元 = 1000 T粒，推荐好友双方各得 100 T粒。</p>
            <p className="text-gray-500 text-sm">不同模型消耗 T粒 不同，用量明细实时可查。兑换码秒充到账，7×24 小时不间断服务。</p>
          </div>
        </section>

        <div className="text-center py-8">
          <a href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-lg font-semibold transition-all shadow-lg shadow-blue-600/25">
            <Zap size={20} /> 立即注册，开始使用
          </a>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-600">
        T粒加油站 · ai.aiotedu.cc
      </footer>
    </div>
  )
}
