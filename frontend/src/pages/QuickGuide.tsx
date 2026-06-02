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
            20+ 主流AI模型一站平价接入 · 兑换码秒充到账 · 7×24 在线响应
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Key size={24} className="text-blue-400" /> 获取 API Key
          </h2>
          <p className="text-gray-400">
            注册账号后在个人主页即可查看 API Key。接口地址统一为 <code className="px-2 py-0.5 rounded bg-gray-800 text-blue-400 font-mono text-sm">https://ai.aiotedu.cc/api/v1</code>
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Terminal size={24} className="text-orange-400" /> Claude Code 接入（推荐）
          </h2>
          <p className="text-gray-400">复制以下命令到终端执行，30秒完成配置：</p>
          <CodeBlock id="cc1" lang="终端" code={`# 一键配置（替换 sk-xxx 为你的 API Key）
claude --set-env ANTHROPIC_BASE_URL=https://ai.aiotedu.cc/api
claude --set-env ANTHROPIC_API_KEY=sk-你的APIKey`} />
          <p className="text-gray-400">配置完成后，终端输入 <code className="px-2 py-0.5 rounded bg-gray-800 text-orange-400 font-mono text-sm">claude</code> 即可使用。</p>
        </section>

        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Globe size={24} className="text-green-400" /> OpenAI 兼容接口
          </h2>
          <p className="text-gray-400">所有模型均支持 OpenAI 兼容格式，可直接接入 Cursor、Continue、Aider 等工具：</p>
          <CodeBlock id="op1" lang="环境变量" code={`export OPENAI_BASE_URL=https://ai.aiotedu.cc/api/v1
export OPENAI_API_KEY=sk-你的APIKey`} />
          <CodeBlock id="op2" lang="curl 测试" code={`curl https://ai.aiotedu.cc/api/v1/chat/completions \
  -H "Authorization: Bearer sk-你的APIKey" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4-flash","messages":[{"role":"user","content":"你好"}]}'`} />
        </section>

        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Cpu size={24} className="text-purple-400" /> 可用模型
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              ['Claude Sonnet 4.6', 'claude-sonnet-4-20250514', '3.24 T粒/千'],
              ['Claude Opus 4.8', 'anthropic/claude-opus-4.8', '5.4 T粒/千'],
              ['Claude Opus 4.7', 'claude-opus-4-20250514', '5.4 T粒/千'],
              ['Claude Haiku 4.5', 'claude-haiku-4-20250514', '1.08 T粒/千'],
              ['GPT-5.2', 'openai/gpt-5.2', '1.89 T粒/千'],
              ['GPT-5.1', 'openai/gpt-5.1', '1.35 T粒/千'],
              ['GPT-4.1', 'openai/gpt-4.1', '2.16 T粒/千'],
              ['o3', 'openai/o3', '2.16 T粒/千'],
              ['o4-mini', 'openai/o4-mini', '1.19 T粒/千'],
              ['Gemini 2.5 Pro', 'google/gemini-2.5-pro', '1.35 T粒/千'],
              ['Gemini 2.5 Flash', 'google/gemini-2.5-flash', '0.32 T粒/千'],
              ['Qwen3.7 Max', 'qwen/qwen3.7-max', '1.35 T粒/千'],
              ['DeepSeek V4 Flash', 'deepseek-v4-flash', '0.13 T粒/千'],
              ['DeepSeek V4 Pro', 'deepseek-ai/DeepSeek-V4-Pro', '1.87 T粒/千'],
              ['DeepSeek R1', 'deepseek-ai/DeepSeek-R1', '3.74 T粒/千'],
              ['DeepSeek V3', 'deepseek-ai/DeepSeek-V3', '1.87 T粒/千'],
              ['Llama-4 Maverick', 'meta-llama/llama-4-maverick', '0.16 T粒/千'],
              ['Mistral Large', 'mistralai/mistral-large', '2.16 T粒/千'],
              ['Command R7B', 'cohere/command-r7b-12-2024', '0.04 T粒/千'],].map(([name, id, price]) => (
              <div key={id} className="p-3 rounded-lg bg-gray-900 border border-gray-800 flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-200">{name}</div>
                  <code className="text-xs text-gray-500 font-mono">{id}</code>
                </div>
                <span className="text-xs text-gray-400">{price}T粒 输入价</span>
              </div>
            ))}
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
