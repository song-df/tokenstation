import { useState } from 'react'
import { Copy, Check, Globe, ArrowRight, Zap } from 'lucide-react'

export default function OpenAIGuide() {
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

  const apiBase = 'https://api.wiselink.cc'

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe size={24} className="text-green-400" />
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            OpenAI 兼容接口接入指南
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            所有支持 OpenAI 接口格式的 AI 工具，都可以直接接入 T粒加油站
          </p>
        </section>

        {/* 通用配置 */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-green-400">通用配置信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
              <div className="text-xs text-gray-500 mb-1">接口地址</div>
              <code className="text-sm font-mono text-blue-400 break-all">{apiBase}/v1</code>
            </div>
            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
              <div className="text-xs text-gray-500 mb-1">鉴权方式</div>
              <code className="text-sm font-mono text-blue-400">Bearer sk-你的APIKey</code>
            </div>
            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
              <div className="text-xs text-gray-500 mb-1">接口格式</div>
              <code className="text-sm font-mono text-blue-400">/v1/chat/completions</code>
              <p className="text-xs text-gray-500 mt-1">兼容 OpenAI Chat Completions API</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
              <div className="text-xs text-gray-500 mb-1">可用模型</div>
              <div className="text-xs text-gray-300 space-y-0.5 mt-1">
                <p><code className="font-mono text-blue-400">deepseek-v4-pro</code> — 主力模型</p>
                <p><code className="font-mono text-blue-400">deepseek-v4-flash</code> — 快速实惠</p>
                <p><code className="font-mono text-blue-400">claude-opus-4-8</code> — 最强推理</p>
                <p className="text-gray-500">... 共 17 款模型可选</p>
              </div>
            </div>
          </div>
        </section>

        {/* Cursor */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <span className="text-3xl">🖱️</span> Cursor
          </h2>
          <p className="text-gray-400">
            <a href="https://cursor.com" target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 underline">cursor.com</a> 下载安装后，打开 Settings → Models，关闭所有内置模型，添加自定义模型：
          </p>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
              <h4 className="text-sm font-semibold text-white mb-2">OpenAI API Key</h4>
              <p className="text-xs text-gray-400">填入你的 T粒加油站 API Key（<code className="font-mono text-blue-400">sk-xxx</code>），OpenAI Base URL 填：</p>
              <code className="block mt-2 px-3 py-1.5 rounded-lg bg-gray-800 text-green-400 font-mono text-sm">{apiBase}/v1</code>
            </div>
            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
              <h4 className="text-sm font-semibold text-white mb-2">添加模型</h4>
              <p className="text-xs text-gray-400">在 Models 页面逐个添加模型名，例如：</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {['deepseek-v4-pro', 'deepseek-v4-flash', 'claude-opus-4-8', 'claude-sonnet-4-6', 'gpt-5.5', 'qwen3.7-max'].map(m => (
                  <code key={m} className="px-2 py-1 rounded bg-gray-800 text-blue-400 font-mono text-xs">{m}</code>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Continue */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <span className="text-3xl">🔌</span> Continue (VSCode / JetBrains)
          </h2>
          <p className="text-gray-400">
            <a href="https://continue.dev" target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 underline">continue.dev</a> 插件安装后，编辑 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-xs">~/.continue/config.json</code>：
          </p>
          <CodeBlock id="continue" lang="JSON (~/.continue/config.json)" code={`{
  "models": [
    {
      "title": "deepseek-v4-pro",
      "provider": "openai",
      "model": "deepseek-v4-pro",
      "apiBase": "${apiBase}/v1",
      "apiKey": "sk-你的APIKey"
    },
    {
      "title": "deepseek-v4-flash",
      "provider": "openai",
      "model": "deepseek-v4-flash",
      "apiBase": "${apiBase}/v1",
      "apiKey": "sk-你的APIKey"
    },
    {
      "title": "claude-opus-4-8",
      "provider": "openai",
      "model": "claude-opus-4-8",
      "apiBase": "${apiBase}/v1",
      "apiKey": "sk-你的APIKey"
    }
  ],
  "tabAutocompleteModel": {
    "title": "deepseek-v4-flash",
    "provider": "openai",
    "model": "deepseek-v4-flash",
    "apiBase": "${apiBase}/v1",
    "apiKey": "sk-你的APIKey"
  }
}`} />
        </section>

        {/* Aider */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <span className="text-3xl">🤖</span> Aider
          </h2>
          <p className="text-gray-400">
            <a href="https://aider.chat" target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 underline">aider.chat</a> 安装后在项目目录启动，通过环境变量配置：
          </p>
          <CodeBlock id="aider-env" lang="终端" code={`export OPENAI_API_BASE="${apiBase}/v1"
export OPENAI_API_KEY="sk-你的APIKey"
aider --model openai/deepseek-v4-pro`} />
          <p className="text-gray-400 text-sm">或写入 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-xs">.aider.conf.yml</code>：</p>
          <CodeBlock id="aider-conf" lang="YAML (.aider.conf.yml)" code={`openai-api-base: ${apiBase}/v1
openai-api-key: sk-你的APIKey
model: openai/deepseek-v4-pro
weak-model: openai/deepseek-v4-flash`} />
        </section>

        {/* Cline */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <span className="text-3xl">🧩</span> Cline (VSCode 插件)
          </h2>
          <p className="text-gray-400">VSCode 扩展搜索 Cline 安装，然后在设置中配置：</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
              <div className="text-xs text-gray-500">API Provider</div>
              <div className="text-sm font-mono text-white">OpenAI Compatible</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
              <div className="text-xs text-gray-500">Base URL</div>
              <div className="text-sm font-mono text-blue-400 truncate">{apiBase}/v1</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
              <div className="text-xs text-gray-500">API Key</div>
              <div className="text-sm font-mono text-blue-400">sk-你的APIKey</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
              <div className="text-xs text-gray-500">Model ID</div>
              <div className="text-sm font-mono text-blue-400">deepseek-v4-pro</div>
            </div>
          </div>
        </section>

        {/* Cherry Studio */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <span className="text-3xl">🍒</span> Cherry Studio
          </h2>
          <p className="text-gray-400">
            <a href="https://cherry-ai.com" target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 underline">cherry-ai.com</a> 下载客户端 → 设置 → 添加提供商 → 类型选 <b>OpenAI</b>：
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 w-20">API 地址：</span>
              <code className="px-2 py-1 rounded bg-gray-800 text-blue-400 font-mono text-xs">{apiBase}/v1</code>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 w-20">API Key：</span>
              <code className="px-2 py-1 rounded bg-gray-800 text-blue-400 font-mono text-xs">sk-你的APIKey</code>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-2">保存后会自动拉取模型列表，选择即可使用。</p>
        </section>

        {/* Open WebUI */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <span className="text-3xl">🌐</span> Open WebUI
          </h2>
          <p className="text-gray-400">
            <a href="https://openwebui.com" target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 underline">openwebui.com</a> 自部署的 ChatGPT 界面，管理员面板 → 设置 → 外部连接：
          </p>
          <CodeBlock id="openwebui" lang="环境变量 / Admin Settings" code={`# OpenAI API 连接
OPENAI_API_BASE_URL=${apiBase}/v1
OPENAI_API_KEY=sk-你的APIKey`} />
        </section>

        {/* curl 测试 */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <span className="text-3xl">🧪</span> curl 快速测试
          </h2>
          <p className="text-gray-400">验证接口是否配置正确：</p>
          <CodeBlock id="curl" lang="终端" code={`curl ${apiBase}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-你的APIKey" \\
  -d '{
    "model": "deepseek-v4-flash",
    "messages": [{"role": "user", "content": "hello"}]
  }'`} />
        </section>

        <div className="text-center py-8">
          <a href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-lg font-semibold transition-all shadow-lg shadow-blue-600/25">
            <Zap size={20} /> 还没有账号？立即注册
          </a>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-600">
        T粒加油站 · t.wiselink.cc · <a href="/guide" className="hover:text-gray-400 transition-colors">使用说明</a>
      </footer>
    </div>
  )
}
