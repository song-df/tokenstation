import { useEffect, useState } from 'react'
import { Cpu } from 'lucide-react'
import { api } from '../lib/api'

function priceTierLabel(ratio: number) {
  if (ratio === 0)       return { label: '免费', cls: 'bg-emerald-500/15 text-emerald-400' }
  if (ratio >= 30)       return { label: '非常贵', cls: 'bg-red-500/15 text-red-400' }
  if (ratio >= 10)       return { label: '贵', cls: 'bg-orange-500/15 text-orange-400' }
  if (ratio >= 3)        return { label: '中等', cls: 'bg-yellow-500/15 text-yellow-400' }
  return { label: '低价', cls: 'bg-green-500/15 text-green-400' }
}

export default function ModelsPage() {
  const [models, setModels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/public/model-prices")
      .then(r => r.json())
      .then(data => {
        const list = Object.entries(data).map(([model_name, price]: [string, any]) => ({
          model_name,
          output_price: typeof price === "number" ? price : 0,
          provider: "",
          max_tokens: 0,
        }))
        list.sort((a: any, b: any) => a.output_price - b.output_price)
        setModels(list)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
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

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        <section className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-white">可用模型</h1>
          <p className="text-gray-400">
            {loading ? '加载中...' : `共 ${models.length} 款模型，国内直连，无需翻墙`}
          </p>
          <p className="text-sm text-gray-500">💡 价格单位：T粒 / 千 tokens（输出），含 OpenRouter 免费模型</p>
        </section>

        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          {loading ? (
            <div className="text-center text-gray-500 py-12">加载中...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="p-3 font-medium">模型名称</th>
                  <th className="p-3 font-medium">价格档位</th>
                                    <th className="p-3 font-medium">最大 Token</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m: any) => {
                  const t = priceTierLabel(m.output_price)
                  return (
                    <tr key={m.model_name} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                      <td className="p-3">
                        <span className="text-gray-100 font-mono text-xs">{m.model_name}</span>
                        {m.display_name && <span className="ml-2 text-gray-500 text-xs">{m.display_name}</span>}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.cls}`}>{t.label}</span>
                        {m.output_price === 0 ? null : (
                          <span className="ml-1.5 text-gray-500 text-xs">{m.output_price.toFixed(2)} T粒/k</span>
                        )}
                      </td>
                                            <td className="p-3 text-gray-400 font-mono text-xs">{(m.max_tokens || 0).toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-600">
        T粒加油站 · t.wiselink.cc · <a href="/guide" className="hover:text-gray-400 transition-colors">使用说明</a>
      </footer>
    </div>
  )
}
