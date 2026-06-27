import { useEffect, useState } from 'react'
import { Cpu } from 'lucide-react'

// 输出价格：T粒 / 千 tokens（已含 1.38× 平台溢价）

function label(price: number) {
  if (price === 0)       return { t: '免费', c: 'bg-emerald-500/15 text-emerald-400' }
  if (price <= 1)        return { t: '低价', c: 'bg-green-500/15 text-green-400' }
  if (price <= 10)       return { t: '中等', c: 'bg-yellow-500/15 text-yellow-400' }
  if (price <= 50)       return { t: '贵', c: 'bg-orange-500/15 text-orange-400' }
  return { t: '非常贵', c: 'bg-red-500/15 text-red-400' }
}

function fmtCtx(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

export default function ModelsPage() {
  const [models, setModels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/public/model-prices").then(r => r.json()).catch(() => ({})),
      fetch("/api/public/model-context").then(r => r.json()).catch(() => ({})),
    ]).then(([ratios, ctx]) => {
      const list = Object.keys(ratios).map(name => {
        const price = typeof ratios[name] === 'number' ? ratios[name] : 0
        return {
          model_name: name,
          price,
          is_free: ratios[name] === 0,
          max_tokens: typeof ctx[name] === 'number' ? ctx[name] : 0,
        }
      })
      // Sort: free first, then by price ascending
      list.sort((a, b) => {
        if (a.is_free && !b.is_free) return -1
        if (!a.is_free && b.is_free) return 1
        return a.price - b.price
      })
      setModels(list)
      setLoading(false)
    })
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
          <p className="text-gray-400">{loading ? '加载中...' : `共 ${models.length} 款模型，5 款免费`}</p>
          <p className="text-sm text-gray-500">价格单位：T粒 / 千 tokens（输出），已含平台 1.38× 溢价</p>
        </section>

        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          {loading ? (
            <div className="text-center text-gray-500 py-12">加载中...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="p-3 font-medium">模型名称</th>
                  <th className="p-3 font-medium">价格</th>
                  <th className="p-3 font-medium">上下文</th>
                </tr>
              </thead>
              <tbody>
                {models.map(m => {
                  const l = m.is_free ? { t: '免费', c: 'bg-emerald-500/15 text-emerald-400' } : m.price > 0 ? label(m.price) : { t: '待标价', c: 'bg-gray-600/20 text-gray-500' }
                  return (
                    <tr key={m.model_name} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                      <td className="p-3"><code className="text-gray-200 font-mono text-xs">{m.model_name}</code></td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${l.c}`}>{l.t}</span>
                        {m.price > 0 && <span className="ml-1.5 text-gray-500 text-xs">{m.price.toFixed(2)} T粒/k</span>}
                      </td>
                      <td className="p-3 text-gray-400 font-mono text-xs">{m.max_tokens > 0 ? fmtCtx(m.max_tokens) : '—'}</td>
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
