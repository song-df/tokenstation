import { useEffect, useState, FormEvent } from 'react'
import { api } from '../lib/api'
import { Zap, Plus, Trash2, Check } from 'lucide-react'

export default function AutoGen() {
  const [configs, setConfigs] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ amount: 1000, min_stock: 10, batch_size: 10, enabled: true })
  const [err, setErr] = useState('')

  const load = () => {
    api.getAutoGenConfigs().then(setConfigs)
    api.getAutoGenLogs().then(setLogs)
  }
  useEffect(() => { load() }, [])

  const save = async (e: FormEvent) => {
    e.preventDefault(); setErr('')
    try { await api.saveAutoGenConfig(form); setShowForm(false); load() }
    catch (e: any) { setErr(e.message) }
  }

  const toggle = async (cfg: any) => {
    await api.saveAutoGenConfig({ ...cfg, enabled: !cfg.enabled })
    load()
  }

  const del = async (id: number) => {
    if (!confirm('删除此自动生成配置？')) return
    await api.deleteAutoGenConfig(id)
    load()
  }

  const inputClass = "w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">自动生成兑换码</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors">
          <Plus size={16} /> 添加规则
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="mb-6 p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
          <h3 className="text-sm font-medium text-gray-300">新增自动生成规则</h3>
          {err && <p className="text-sm text-red-400">{err}</p>}
          <div className="grid grid-cols-4 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">面额 (T粒)</label><input className={inputClass} type="number" value={form.amount} onChange={e => setForm({...form, amount: +e.target.value})} min={100} step={100} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">最低库存</label><input className={inputClass} type="number" value={form.min_stock} onChange={e => setForm({...form, min_stock: +e.target.value})} min={1} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">每次生成数量</label><input className={inputClass} type="number" value={form.batch_size} onChange={e => setForm({...form, batch_size: +e.target.value})} min={1} max={500} /></div>
            <div className="flex items-end">
              <button type="submit" className="w-full px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm transition-colors">添加</button>
            </div>
          </div>
        </form>
      )}

      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800 text-gray-400 text-left">
            <th className="p-3 font-medium">面额</th><th className="p-3 font-medium">状态</th><th className="p-3 font-medium">最低库存</th><th className="p-3 font-medium">批量生成</th><th className="p-3 font-medium w-28">操作</th>
          </tr></thead>
          <tbody>
            {configs.map(c => (
              <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                <td className="p-3 text-gray-100 font-mono text-sm">{c.amount.toFixed(2)}</td>
                <td className="p-3">
                  <button onClick={() => toggle(c)} className={`px-2 py-0.5 rounded text-xs transition-colors ${c.enabled ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
                    {c.enabled ? '已启用' : '已停用'}
                  </button>
                </td>
                <td className="p-3 text-gray-300">{c.min_stock}</td>
                <td className="p-3 text-gray-300">{c.batch_size}</td>
                <td className="p-3"><button onClick={() => del(c.id)} className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {configs.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">暂无自动生成规则</td></tr>}
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold text-white mb-4">生成日志</h3>
      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800 text-gray-400 text-left">
            <th className="p-3 font-medium">时间</th><th className="p-3 font-medium">面额</th><th className="p-3 font-medium">生成数量</th><th className="p-3 font-medium">批次</th><th className="p-3 font-medium">触发库存</th>
          </tr></thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                <td className="p-3 text-gray-500 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                <td className="p-3 text-gray-300 font-mono text-xs">{l.amount.toLocaleString()}</td>
                <td className="p-3 text-gray-300">{l.count}</td>
                <td className="p-3 text-gray-500 font-mono text-xs">{l.batch_id}</td>
                <td className="p-3 text-gray-400">{l.trigger_stock}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">暂无自动生成记录</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
