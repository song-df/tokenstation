import { Cpu } from 'lucide-react'

const MODELS = [
  { name: 'deepseek-v4-pro',       provider: 'DeepSeek',  outputPrice: 0.11,  tier: 'low' },
  { name: 'deepseek-v4-flash',     provider: 'DeepSeek',  outputPrice: 0.30,  tier: 'low' },
  { name: 'claude-opus-4-8',       provider: 'Anthropic', outputPrice: 27.0,  tier: 'very-expensive' },
  { name: 'claude-sonnet-4-6',     provider: 'Anthropic', outputPrice: 16.2,  tier: 'expensive' },
  { name: 'claude-haiku-4-5',      provider: 'Anthropic', outputPrice: 5.4,   tier: 'expensive' },
  { name: 'gpt-5.5',               provider: 'OpenAI',    outputPrice: 32.4,  tier: 'very-expensive' },
  { name: 'gpt-5.5-pro',           provider: 'OpenAI',    outputPrice: 194.4, tier: 'very-expensive' },
  { name: 'gpt-5.3-codex',         provider: 'OpenAI',    outputPrice: 15.12, tier: 'expensive' },
  { name: 'gemini-3.5-flash',      provider: 'Google',    outputPrice: 9.72,  tier: 'expensive' },
  { name: 'gemini-3.1-pro',        provider: 'Google',    outputPrice: 12.96, tier: 'expensive' },
  { name: 'step-3.7-flash',        provider: 'StepFun',   outputPrice: 1.24,  tier: 'low' },
  { name: 'qwen3.7-max',           provider: 'Qwen',      outputPrice: 4.05,  tier: 'mid' },
  { name: 'glm-5.1',               provider: 'Zhipu',     outputPrice: 3.60,  tier: 'mid' },
  { name: 'kimi-k2.6',             provider: 'Moonshot',  outputPrice: 4.05,  tier: 'mid' },
  { name: 'minimax-m2.5',          provider: 'MiniMax',   outputPrice: 1.26,  tier: 'low' },
  { name: 'minimax-m3',            provider: 'MiniMax',   outputPrice: 1.80,  tier: 'low' },
  { name: 'qwen3.5-397b-a17b',     provider: 'Qwen',      outputPrice: 1.08,  tier: 'low' },
]

function priceTierLabel(tier: string) {
  switch (tier) {
    case 'very-expensive': return { label: '非常贵', cls: 'bg-red-500/15 text-red-400' }
    case 'expensive':      return { label: '贵',     cls: 'bg-orange-500/15 text-orange-400' }
    case 'mid':            return { label: '中等',   cls: 'bg-yellow-500/15 text-yellow-400' }
    default:               return { label: '低价',   cls: 'bg-green-500/15 text-green-400' }
  }
}

export default function ModelsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu size={24} className="text-purple-400" />
            <span className="text-lg font-semibold">T粒加油站</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/guide" className="text-gray-400 hover:text-gray-200 transition-colors">← 使用说明</a>
            <a href="/register" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">注册使用</a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <section className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-white">可用模型</h1>
          <p className="text-gray-400">共 {MODELS.length} 款模型，国内直连，无需翻墙</p>
          <p className="text-sm text-gray-500">
            💡 价格单位：T粒 / 千 tokens（输出），输入价格更低
          </p>
        </section>

        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-left">
                <th className="p-4 font-medium">模型名称</th>
                <th className="p-4 font-medium">供应商</th>
                <th className="p-4 font-medium">价格档位</th>
                <th className="p-4 font-medium">输出价格 (T粒/千)</th>
              </tr>
            </thead>
            <tbody>
              {MODELS.map(m => {
                const t = priceTierLabel(m.tier)
                return (
                  <tr key={m.name} className="border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors">
                    <td className="p-4">
                      <code className="text-gray-100 font-mono text-xs">{m.name}</code>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-xs">{m.provider}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.cls}`}>{t.label}</span>
                    </td>
                    <td className="p-4 text-gray-400 font-mono text-xs">{m.outputPrice}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="text-center">
          <a href="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white transition-all">
            注册使用
          </a>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-600">
        T粒加油站 · wiselink.cc · <a href="/guide" className="hover:text-gray-400 transition-colors">使用说明</a>
      </footer>
    </div>
  )
}
