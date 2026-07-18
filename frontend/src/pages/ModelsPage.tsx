import { useEffect, useState, useMemo } from 'react'
import { Copy, Check } from 'lucide-react'
import { MODEL_PROVIDER } from '../lib/api'
import PublicLayout from '../components/PublicLayout'

// 从模型 ID 提取公司名（如 anthropic/claude-sonnet-5 → anthropic）
function modelCompany(name: string): string {
  const idx = name.indexOf('/')
  return idx > 0 ? name.slice(0, idx) : '其他'
}

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
  const [copiedModel, setCopiedModel] = useState<string | null>(null)
  const [company, setCompany] = useState<string | null>(null)

  useEffect(() => {
    // 从 nginx 静态文件取价格，文件每次从数据库重新生成
    Promise.all([
      fetch('/api/public/model-prices').then(r => r.json()).catch(() => ({})),
      fetch('/api/public/model-context').then(r => r.json()).catch(() => ({})),
    ]).then(([prices, context]) => {
      const list = Object.keys(prices)
        .filter(name => prices[name] > 0) // 过滤掉价格为0的（已下架/图像模型）
        .map(name => ({
          model_name: name,
          display_name: '',
          provider: MODEL_PROVIDER[name] || '',
          input_price: 0,
          output_price: prices[name] ?? 0,
          max_tokens: context[name] ?? 0,
        }))
        .sort((a, b) => a.output_price - b.output_price)
      setModels(list)
    }).catch(() => {
      setModels([])
    }).finally(() => setLoading(false))
  }, [])

  // 按公司聚合，按模型数量降序
  const companies = useMemo(() => {
    const map = new Map<string, number>()
    models.forEach(m => {
      const c = modelCompany(m.model_name)
      map.set(c, (map.get(c) || 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [models])

  const filtered = company
    ? models.filter(m => modelCompany(m.model_name) === company)
    : models

  const copyModelName = (name: string) => {
    navigator.clipboard.writeText(name)
    setCopiedModel(name)
    setTimeout(() => setCopiedModel(null), 1500)
  }

  return (
    <PublicLayout>
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-14">
        <section className="text-center space-y-3">
          <p className="text-sm font-semibold text-blue-400">实时数据</p>
          <h1 className="text-3xl font-bold text-white">模型价格</h1>
          <p className="text-gray-400">{loading ? '加载中...' : `当前展示 ${filtered.length} 款可用模型`}</p>
        </section>

        {/* 公司筛选 */}
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => setCompany(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !company ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            全部
          </button>
          {companies.map(([c, count]) => (
            <button
              key={c}
              onClick={() => setCompany(company === c ? null : c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                company === c ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              {c} <span className="opacity-60">({count})</span>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900/80">
          {loading ? (
            <div className="text-center text-gray-500 py-12">加载中...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="p-3 font-medium">模型名称</th>
                  <th className="p-3 font-medium">价格</th>
                  <th className="p-3 font-medium">供应商</th>
                  <th className="p-3 font-medium">上下文</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const price = m.output_price ?? m.price ?? 0
                  const l = price === 0 ? { t: '免费', c: 'bg-emerald-500/15 text-emerald-400' } : label(price)
                  return (
                    <tr key={m.model_name} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                      <td className="p-3">
                        <code className="text-gray-200 font-mono text-xs">{m.model_name}</code>
                        {m.display_name && <span className="ml-2 text-gray-500 text-xs">{m.display_name}</span>}
                        <button
                          onClick={() => copyModelName(m.model_name)}
                          className="ml-2 p-0.5 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors inline-flex align-middle"
                          title="复制模型名"
                        >
                          {copiedModel === m.model_name ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                        </button>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${l.c}`}>{l.t}</span>
                        {price > 0 && <span className="ml-1.5 text-gray-500 text-xs">{price.toFixed(2)} T粒/k</span>}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-xs">{m.provider || '—'}</span>
                      </td>
                      <td className="p-3 text-gray-400 font-mono text-xs">{m.max_tokens > 0 ? fmtCtx(m.max_tokens) : '—'}</td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-gray-500">暂无可用的模型</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 text-sm text-gray-500 space-y-1">
          <p>💡 价格说明（输出价格，T粒/千 token）：</p>
          <ul className="list-disc list-inside ml-2 space-y-0.5">
            <li><span className="px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 text-xs">低价</span> &lt; 1 · <span className="px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 text-xs">中等</span> 1~10 · <span className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 text-xs">贵</span> 10~50 · <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 text-xs">非常贵</span> ≥ 50</li>
            <li>输入 token 价格约为输出的 1/3 ~ 1/5</li>
            <li>API 接口：<code className="px-1 rounded bg-gray-800 text-blue-400 font-mono text-xs">https://api.wiselink.cc/v1</code></li>
          </ul>
        </div>
      </main>
    </PublicLayout>
  )
}
