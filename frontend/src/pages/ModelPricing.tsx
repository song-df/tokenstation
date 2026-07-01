import { useEffect, useState } from 'react'
import { api, MODEL_OUTPUT_PRICE, MODEL_PROVIDER } from '../lib/api'
import { Copy, Check, Cpu, Zap } from 'lucide-react'

interface ModelInfo {
  model_name: string
  display_name: string
  provider: string
  input_price: number
  output_price: number
  max_tokens: number
}

function priceTier(outputPrice: number) {
  if (outputPrice >= 30) return { label: '非常贵', cls: 'bg-red-500/15 text-red-400 border border-red-500/30' }
  if (outputPrice >= 10)  return { label: '贵',     cls: 'bg-orange-500/15 text-orange-400 border border-orange-500/30' }
  if (outputPrice >= 3)   return { label: '中等',   cls: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' }
  return { label: '低价', cls: 'bg-green-500/15 text-green-400 border border-green-500/30' }
}

export default function ModelPricing() {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedModel, setCopiedModel] = useState<string | null>(null)

  useEffect(() => {
    api.getStudentModels()
      .then(m => { if (m.length) setModels(m) })
      .catch(() => {
        // Fallback for unauthenticated users — use hardcoded price list
        setModels(Object.keys(MODEL_OUTPUT_PRICE).map(name => ({
          model_name: name, display_name: '', provider: MODEL_PROVIDER[name] || '',
          input_price: 0, output_price: MODEL_OUTPUT_PRICE[name] ?? 0, max_tokens: 0,
        })))
      })
      .finally(() => setLoading(false))
  }, [])

  const copyModelName = (name: string) => {
    navigator.clipboard.writeText(name)
    setCopiedModel(name)
    setTimeout(() => setCopiedModel(null), 1500)
  }

  if (loading) return <div className="text-center text-gray-500 py-12">加载中...</div>

  const apiBase = 'https://api.wiselink.cc'

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
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            可用模型 & 定价
          </h1>
          <p className="text-lg text-gray-400">
            共 {models.length} 款模型 · 价格单位为 T粒/千 token（输出）· 1 T粒 = 0.01 元
          </p>
        </section>

        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-left">
                <th className="p-3 font-medium">模型名称</th>
                <th className="p-3 font-medium">价格档位</th>
                <th className="p-3 font-medium">供应商</th>
                <th className="p-3 font-medium">最大 Token</th>
                <th className="p-3 font-medium">复制</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m, i) => {
                const t = priceTier(m.output_price)
                return (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                    <td className="p-3">
                      <span className="text-gray-100 font-mono text-xs">{m.model_name}</span>
                      {m.display_name && <span className="ml-2 text-gray-500 text-xs">{m.display_name}</span>}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.cls}`}>{t.label}</span>
                      <span className="ml-1.5 text-gray-500 text-xs">{m.output_price.toFixed(2)} T粒/k</span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-xs">{m.provider}</span>
                    </td>
                    <td className="p-3 text-gray-400 font-mono text-xs">{m.max_tokens.toLocaleString()}</td>
                    <td className="p-3">
                      <button
                        onClick={() => copyModelName(m.model_name)}
                        className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
                        title="复制模型名"
                      >
                        {copiedModel === m.model_name ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {models.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-gray-500">暂无可用的模型</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 text-sm text-gray-500 space-y-1">
          <p>💡 价格档位说明（输出价格，T粒/千 token）：</p>
          <ul className="list-disc list-inside ml-2 space-y-0.5">
            <li><span className="px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 text-xs">低价</span> &lt; 3 · <span className="px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 text-xs">中等</span> 3~10 · <span className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 text-xs">贵</span> 10~30 · <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 text-xs">非常贵</span> ≥ 30</li>
            <li>输入 token 价格约为输出的 1/3~1/5（含缓存命中优惠）</li>
            <li>API 接口：<code className="px-1 rounded bg-gray-800 text-blue-400 font-mono text-xs">{apiBase}/v1</code></li>
          </ul>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-600">
        T粒加油站 · t.wiselink.cc · <a href="/guide" className="hover:text-gray-400 transition-colors">使用说明</a>
      </footer>
    </div>
  )
}
