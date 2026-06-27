import { useState, useEffect } from 'react'
import { Zap, Terminal, Globe, Shield, ChevronRight, ArrowRight, Copy, Check, Star, Rocket } from 'lucide-react'

const models = [
  { name: 'Claude Opus 4.8', id: 'claude-opus-4-8', tier: '贵', tierCls: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  { name: 'Claude Sonnet 4.6', id: 'claude-sonnet-4-6', tier: '中等', tierCls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  { name: 'Claude Haiku 4.5', id: 'claude-haiku-4-5', tier: '中等', tierCls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  { name: 'GPT-5.5', id: 'gpt-5.5', tier: '贵', tierCls: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  { name: 'GPT-5.5 Pro', id: 'gpt-5.5-pro', tier: '非常贵', tierCls: 'bg-red-500/15 text-red-400 border-red-500/30' },
  { name: 'GPT-5.3 Codex', id: 'gpt-5.3-codex', tier: '贵', tierCls: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  { name: 'Gemini 3.5 Flash', id: 'gemini-3.5-flash', tier: '中等', tierCls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  { name: 'Gemini 3.1 Pro', id: 'gemini-3.1-pro', tier: '中等', tierCls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  { name: 'DeepSeek V4 Pro', id: 'deepseek-v4-pro', tier: '低价', tierCls: 'bg-green-500/15 text-green-400 border-green-500/30' },
  { name: 'DeepSeek V4 Flash', id: 'deepseek-v4-flash', tier: '低价', tierCls: 'bg-green-500/15 text-green-400 border-green-500/30' },
  { name: 'Qwen 3.7 Max', id: 'qwen3.7-max', tier: '中等', tierCls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  { name: 'Kimi K2.6', id: 'kimi-k2.6', tier: '中等', tierCls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  { name: 'GLM-5.1', id: 'glm-5.1', tier: '中等', tierCls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  { name: 'MiniMax M2.5', id: 'minimax-m2.5', tier: '低价', tierCls: 'bg-green-500/15 text-green-400 border-green-500/30' },
  { name: 'Step 3.7 Flash', id: 'step-3.7-flash', tier: '低价', tierCls: 'bg-green-500/15 text-green-400 border-green-500/30' },
  { name: 'Qwen3.5-397B', id: 'qwen3.5-397b-a17b', tier: '低价', tierCls: 'bg-green-500/15 text-green-400 border-green-500/30' },
]

const features = [
  { icon: Globe, title: '16款精选大模型', desc: 'Claude、GPT、Gemini、DeepSeek 等一线模型一站接入，无需分别注册多个平台。' },
  { icon: Zap, title: '官方直连 · 极速响应', desc: '全链路延迟优于市场中位，与官方直连速度相当，告别代理超时与掉线。' },
  { icon: Shield, title: '免翻墙 · 免信用卡', desc: '国内网络直接访问，兑换码充值即可使用，无需境外支付手段。' },
  { icon: Rocket, title: '新模型第一时间上线', desc: 'Anthropic、OpenAI、Google 等厂商发布新模型后，本站第一时间接入，无需等待。' },

]
const steps = [
  { step: '01', title: '注册账号', desc: '30秒完成注册，立即获得免费体验额度。' },
  { step: '02', title: '获取 API Key', desc: '在个人主页一键复制 API Key 和接口地址。' },
  { step: '03', title: '开始使用', desc: '接入 Claude Code、Cursor、Codex 或任意 OpenAI 兼容工具。' },
]


const pricingTiers = [
  { amount: '100', price: '1', popular: false },
  { amount: '500', price: '5', popular: false },
  { amount: '1,000', price: '9.9', popular: true },
  { amount: '5,000', price: '45', popular: false },
  { amount: '10,000', price: '80', popular: false },
]


function FreeModels() {
  const [models, setModels] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/public/free-models")
      .then(r => r.json())
      .then(setModels)
      .catch(() => {})
  }, [])

  if (!models.length) return null

  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-green-950/20 to-transparent border-y border-green-500/10">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="px-3 py-1 rounded-full bg-green-500/15 text-green-400 text-xs font-medium border border-green-500/30">FREE</span>
          <h2 className="text-xl font-bold text-white">本周免费模型</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {models.map(m => (
            <div key={m.id} className="p-4 rounded-xl bg-gray-900/80 border border-green-500/10 hover:border-green-500/30 transition-colors">
              <code className="text-sm font-mono text-green-400">{m.name}</code>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{m.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function LandingPage() {
  const [copiedSnippet, setCopiedSnippet] = useState(false)
  const apiBase = 'https://api.wiselink.cc'

  const installSnippet = `export ANTHROPIC_BASE_URL=${apiBase}/api
export ANTHROPIC_AUTH_TOKEN=sk-你的APIKey
export ANTHROPIC_MODEL=claude-opus-4-8
export ANTHROPIC_SMALL_FAST_MODEL=claude-haiku-4-5`

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 font-semibold text-base text-white">
            <Zap size={20} className="text-blue-400" />
            T粒加油站
          </a>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">登录</a>
            <a href="/register" className="text-sm px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">免费注册</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/50 via-gray-950 to-gray-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-blue-500/20 via-cyan-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl" />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs mb-8">
            <Star size={12} className="fill-blue-400" />
            已服务大量AI场景 · 7×24 在线
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              国内直连 16 款 AI 模型
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            免翻墙免信用卡 · Claude Code / Cursor / Codex 即开即用<br />
            <span className="text-gray-500 text-base">兑换码秒充到账，10元起充</span>
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium transition-all shadow-lg shadow-blue-600/25">
              免费注册 <ArrowRight size={16} />
            </a>
            <a href="/guide" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 font-medium transition-colors">
              查看接入指南
            </a>
            <a href="/guide/codex" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 text-cyan-400 font-medium transition-colors">
              🪟 Codex 安装教程
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-gray-800/60 bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '16+', label: '精选模型' },
            { value: '< 2s', label: '平均响应' },
            { value: '7×24', label: '在线服务' },
            { value: '一键', label: '复制接入' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-white">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">为什么选择 T粒加油站</h2>
            <p className="text-gray-500 max-w-xl mx-auto">不用再为跨境外支付发愁，不用忍受代理延迟——一个账号，16款模型开箱即用。</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map(f => (
              <div key={f.title} className="p-6 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
                <f.icon size={24} className="text-blue-400 mb-4" />
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── One-liner install ── */}
      <section className="py-16 md:py-20 bg-gray-900/30 border-y border-gray-800/60">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Terminal size={32} className="text-orange-400 mx-auto mb-6" />
          <h2 className="text-xl md:text-2xl font-bold text-white mb-3">一行命令接入 Claude Code</h2>
          <p className="text-gray-500 text-sm mb-6">复制下面三行到终端，即刻开始使用。</p>
          <div className="relative mx-auto max-w-lg">
            <pre className="text-left text-sm text-gray-300 bg-gray-950 border border-gray-800 rounded-xl p-5 overflow-x-auto font-mono leading-relaxed">
              <code>{installSnippet}</code>
            </pre>
            <button
              onClick={() => { navigator.clipboard.writeText(installSnippet); setCopiedSnippet(true); setTimeout(() => setCopiedSnippet(false), 2000) }}
              className="absolute top-3 right-3 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-green-400 transition-colors"
            >
              {copiedSnippet ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-4">支持 Claude Code · Codex CLI · Cursor · Continue · Aider 等主流 AI 编程工具</p>
          <a href="/guide/codex" className="inline-flex items-center gap-1.5 mt-4 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
            🪟 Windows 用户参考 Codex 完整安装教程 →
          </a>
        </div>
      </section>

      {/* ── Free Models ── */}
      <FreeModels />

      {/* ── Models ── */}
      <section className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">全部可用模型</h2>
            <p className="text-gray-500">一个 API Key，16 款模型任意切换</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {models.map(m => (
              <div key={m.id} className="p-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${m.tierCls}`}>{m.tier}</span>
                </div>
                <p className="text-sm text-gray-200 font-medium truncate">{m.name}</p>
                <code className="text-[11px] text-gray-600 font-mono truncate block">{m.id}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 md:py-28 bg-gray-900/30 border-y border-gray-800/60">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">三步开始</h2>
            <p className="text-gray-500">从注册到调用，不超过 3 分钟</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.step} className="text-center relative">
                <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-400 font-bold text-sm">{s.step}</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+2rem)] w-[calc(100%-5rem)]">
                    <div className="border-t border-dashed border-gray-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">简单定价</h2>
            <p className="text-gray-500">1 T粒 = 1 分钱（0.01元），不同模型消耗不同</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {pricingTiers.map(t => (
              <div key={t.amount} className={`relative p-5 rounded-xl border text-center transition-colors ${t.popular ? 'bg-blue-600/10 border-blue-500/40 ring-1 ring-blue-500/20' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}>
                {t.popular && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-medium">热门</span>}
                <p className="text-2xl font-bold text-white mb-1">{t.amount}<span className="text-base text-gray-500 font-normal"> T粒</span></p>
                <p className="text-sm text-gray-500">&yen;{t.price}</p>
              </div>
            ))}
          </div>
          <div className="max-w-lg mx-auto p-5 rounded-xl bg-gray-900 border border-gray-800">
            <p className="text-xs text-gray-500 mb-3">参考消耗（以编程任务为例）：</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Claude Opus 4.8 · 1k 输出 token</span><span className="text-gray-300 font-mono">~78 T粒</span></div>
              <div className="flex justify-between"><span className="text-gray-400">DeepSeek V4 Flash · 1k 输出 token</span><span className="text-gray-300 font-mono">~0.1 T粒</span></div>
              <div className="flex justify-between"><span className="text-gray-400">9.9元 = 1000 T粒</span><span className="text-gray-500">≈ 12,800 输出 token（Opus 4.8）</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 md:py-24 bg-gradient-to-b from-gray-900/50 to-gray-950 border-t border-gray-800/60">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <Zap size={36} className="text-blue-400 mx-auto mb-6" />
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">准备好体验了吗？</h2>
          <p className="text-gray-500 mb-8">注册即享免费额度，30 秒完成接入。</p>
          <a href="/register" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium text-lg transition-all shadow-lg shadow-blue-600/25">
            免费注册 <ChevronRight size={18} />
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800/60 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-gray-700" />
            <span>T粒加油站 · t.wiselink.cc · <a href="/terms" class="hover:text-gray-400 transition-colors">用户协议</a> · 反馈: <a href="mailto:songdf@petalmail.com" class="hover:text-gray-400 transition-colors">songdf@petalmail.com</a></span>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" class="hover:text-gray-400 transition-colors">浙ICP备2026039790号-1</a>
          </div>
          <div className="flex items-center gap-6">
            <a href="/guide" className="hover:text-gray-400 transition-colors">接入指南</a>
            <a href="/guide/codex" className="hover:text-gray-400 transition-colors">Codex 教程</a>
            <a href="/login" className="hover:text-gray-400 transition-colors">登录</a>
            <a href="/register" className="hover:text-gray-400 transition-colors">注册</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

