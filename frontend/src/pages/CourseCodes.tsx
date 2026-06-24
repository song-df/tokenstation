import { useEffect, useState, FormEvent } from 'react'
import { api } from '../lib/api'
import { Plus, GraduationCap, Copy, Check } from 'lucide-react'

export default function CourseCodes() {
  const [codes, setCodes] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [amount, setAmount] = useState(1000)
  const [count, setCount] = useState(10)
  const [batchId, setBatchId] = useState('')
  const [generated, setGenerated] = useState<any[]>([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)
  const [batches, setBatches] = useState<any[]>([])

  const load = () => {
    api.listCourseCodes(batchId).then(setCodes).catch(() => {})
    api.courseCodeStats().then(setStats).catch(() => {})
    api.listCourseBatches().then(setBatches).catch(() => {})
  }
  useEffect(() => { load() }, [batchId])

  const generate = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setLoading(true)
    try {
      const res = await api.generateCourseCodes({ amount, count })
      setGenerated(res.codes)
      setBatchId(res.batch_id)
      load()
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const copyAll = () => {
    const text = generated.map((c: any) => c.code).join('\n')
    navigator.clipboard.writeText(text)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  const inputClass = "w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"

  return (
    <div>
      <h2 className="flex items-center gap-2 text-xl font-semibold text-white mb-6">
        <GraduationCap size={22} className="text-indigo-400" /> 课程邀请码管理
      </h2>

      <p className="text-sm text-gray-500 mb-6">
        独立于 T粒兑换券管理。在此生成的邀请码供学生在「课程订阅」页面花 T粒 购买，
        拿到课程平台注册时由平台调 verify 接口验证消费。
      </p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: '总计', value: stats.total ?? '-' },
          { label: '已使用', value: stats.used ?? '-' },
          { label: '未使用', value: stats.unused ?? '-' },
          { label: '已消费点数', value: (stats.total_redeemed ?? 0).toLocaleString() + ' T粒' },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-center">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-lg font-semibold text-white mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Generate form */}
      <form onSubmit={generate} className="mb-6 p-4 rounded-xl bg-gray-900 border border-gray-800">
        <h3 className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
          <Plus size={16} className="text-indigo-400" /> 生成课程邀请码
        </h3>
        {err && <p className="text-sm text-red-400 mb-2">{err}</p>}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">面额 (T粒)</label>
            <input className={inputClass} type="number" value={amount} onChange={e => setAmount(+e.target.value)} min={100} step={100} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">数量</label>
            <input className={inputClass} type="number" value={count} onChange={e => setCount(+e.target.value)} min={1} max={500} />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={loading} className="w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors disabled:opacity-50">
              {loading ? '生成中...' : '生成'}
            </button>
          </div>
        </div>

        {generated.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-green-400">已生成 {generated.length} 个邀请码</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={copyAll} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                  {copiedAll ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  {copiedAll ? '已复制' : '复制全部'}
                </button>
                <button type="button" onClick={() => setGenerated([])} className="text-xs text-gray-500 hover:text-gray-300">清除</button>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {generated.map((c: any, i: number) => (
                <code key={i} className="block text-xs text-gray-300 font-mono">{c.code}</code>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* Batch filter */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        <div className="p-3 border-b border-gray-800 flex items-center gap-3">
          <span className="text-sm text-gray-400">筛选批次：</span>
          <select className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm focus:outline-none focus:border-blue-500" value={batchId} onChange={e => setBatchId(e.target.value)}>
            <option value="">全部批次</option>
            {batches.map((b: any) => (
              <option key={b.batch_id} value={b.batch_id}>
                {b.batch_id} — {b.amount_per_code?.toLocaleString()} T粒/码 × {b.total}个 — {new Date(b.created_at).toLocaleString()}
              </option>
            ))}
          </select>
          {batchId && (
            <button onClick={() => setBatchId('')} className="text-xs text-gray-500 hover:text-gray-300">清除</button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800 text-gray-400 text-left">
            <th className="p-3 font-medium">邀请码</th>
            <th className="p-3 font-medium">面额</th>
            <th className="p-3 font-medium">批次</th>
            <th className="p-3 font-medium">状态</th>
            <th className="p-3 font-medium">购买者</th>
            <th className="p-3 font-medium">购买/使用时间</th>
          </tr></thead>
          <tbody>
            {codes.map((c: any) => (
              <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                <td className="p-3 text-gray-200 font-mono text-xs">{c.code}</td>
                <td className="p-3 text-gray-300 font-mono text-xs">{c.amount?.toLocaleString()}</td>
                <td className="p-3 text-gray-500 font-mono text-xs">{c.batch_id || '-'}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${c.is_used ? 'bg-gray-600 text-gray-400' : c.is_shipped ? 'bg-yellow-900/50 text-yellow-400' : 'bg-green-900/50 text-green-400'}`}>
                    {c.is_used ? '已使用' : c.is_shipped ? '已购买' : '可用'}
                  </span>
                </td>
                <td className="p-3 text-gray-400 text-xs">{c.purchased_by || '-'}</td>
                <td className="p-3 text-gray-500 text-xs">
                  {c.used_at ? new Date(c.used_at).toLocaleString() : c.purchased_at ? new Date(c.purchased_at).toLocaleString() : '-'}
                </td>
              </tr>
            ))}
            {codes.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-500">暂无课程邀请码</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
