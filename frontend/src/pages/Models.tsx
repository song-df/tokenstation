import { useEffect, useState, FormEvent } from 'react'
import { api } from '../lib/api'
import { Plus, Trash2, Edit3, X, Check } from 'lucide-react'

const PROVIDERS = ['openai', 'anthropic', 'google', 'azure', 'deepseek', 'moonshot', 'zhipu', 'qwen', 'siliconflow', 'openrouter', 'custom']

interface Model { id: number; model_name: string; display_name: string; provider: string; input_price: number; output_price: number; max_tokens: number; is_active: boolean }

export default function Models() {
  const [models, setModels] = useState<Model[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ model_name: '', display_name: '', provider: 'openai', input_price: 0, output_price: 0, max_tokens: 4096 })
  const [err, setErr] = useState('')

  const load = () => api.getModels().then(setModels)
  useEffect(() => { load() }, [])

  const resetForm = () => { setForm({ model_name: '', display_name: '', provider: 'openai', input_price: 0, output_price: 0, max_tokens: 4096 }); setEditId(null); setShowForm(false); setErr('') }

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr('')
    try {
      if (editId) { await api.updateModel(editId, form) }
      else { await api.createModel(form) }
      resetForm(); load()
    } catch (e: any) { setErr(e.message) }
  }

  const edit = (m: Model) => {
    setForm({ model_name: m.model_name, display_name: m.display_name, provider: m.provider, input_price: m.input_price, output_price: m.output_price, max_tokens: m.max_tokens })
    setEditId(m.id); setShowForm(true)
  }

  const del = async (id: number) => { if (confirm('确定删除？')) { await api.deleteModel(id); load() } }

  const inputClass = "w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">模型管理</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors">
          <Plus size={16} /> 添加模型
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-6 p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
          {err && <p className="text-sm text-red-400">{err}</p>}
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} placeholder="模型名称 (如 gpt-4o)" value={form.model_name} onChange={e => setForm({...form, model_name: e.target.value})} required />
            <input className={inputClass} placeholder="显示名称" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} />
            <select className={inputClass} value={form.provider} onChange={e => setForm({...form, provider: e.target.value})}>
              {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input className={inputClass} type="number" step="1" placeholder="最大 T粒 数" value={form.max_tokens} onChange={e => setForm({...form, max_tokens: +e.target.value})} />
            <div>
              <label className="text-xs text-gray-500">输入价格 (内部T粒/千T粒)</label>
              <input className={inputClass} type="number" step="0.0001" value={form.input_price} onChange={e => setForm({...form, input_price: +e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-gray-500">输出价格 (内部T粒/千T粒)</label>
              <input className={inputClass} type="number" step="0.0001" value={form.output_price} onChange={e => setForm({...form, output_price: +e.target.value})} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex items-center gap-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm"><Check size={14} />{editId ? '更新' : '创建'}</button>
            <button type="button" onClick={resetForm} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm"><X size={14} />取消</button>
          </div>
        </form>
      )}

      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800 text-gray-400 text-left">
            <th className="p-3 font-medium">模型</th><th className="p-3 font-medium">供应商</th><th className="p-3 font-medium">输入价格</th><th className="p-3 font-medium">输出价格</th><th className="p-3 font-medium w-20">操作</th>
          </tr></thead>
          <tbody>
            {models.map(m => (
              <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                <td className="p-3">
                  <span className="text-gray-100 font-mono text-xs">{m.model_name}</span>
                  {m.display_name && <span className="ml-2 text-gray-500 text-xs">{m.display_name}</span>}
                </td>
                <td className="p-3"><span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-xs">{m.provider}</span></td>
                <td className="p-3 text-gray-300 font-mono text-xs">{m.input_price}</td>
                <td className="p-3 text-gray-300 font-mono text-xs">{m.output_price}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button onClick={() => edit(m)} className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-blue-400" title="编辑"><Edit3 size={14} /></button>
                    <button onClick={() => del(m.id)} className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400" title="删除"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {models.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">暂无模型</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
