import { useEffect, useState, FormEvent } from 'react'
import { api } from '../lib/api'
import { Plus, Trash2, Edit3, X, Check } from 'lucide-react'

const PROVIDERS = ['openai', 'anthropic', 'google', 'azure', 'deepseek', 'moonshot', 'zhipu', 'qwen', 'siliconflow', 'openrouter', 'custom']

interface Channel { id: number; name: string; provider: string; base_url: string; api_key: string; models: string; priority: number; is_active: boolean }

export default function Channels() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', provider: 'openai', base_url: '', api_key: '', models: '', priority: 0 })
  const [err, setErr] = useState('')

  const load = () => api.getChannels().then(setChannels)
  useEffect(() => { load() }, [])
  const resetForm = () => { setForm({ name: '', provider: 'openai', base_url: '', api_key: '', models: '', priority: 0 }); setEditId(null); setShowForm(false); setErr('') }

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr('')
    try {
      if (editId) { await api.updateChannel(editId, form) }
      else { await api.createChannel(form) }
      resetForm(); load()
    } catch (e: any) { setErr(e.message) }
  }

  const edit = (ch: Channel) => {
    setForm({ name: ch.name, provider: ch.provider, base_url: ch.base_url, api_key: ch.api_key, models: ch.models, priority: ch.priority })
    setEditId(ch.id); setShowForm(true)
  }

  const del = async (id: number) => { if (confirm('确定删除此渠道？')) { await api.deleteChannel(id); load() } }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">渠道管理</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors">
          <Plus size={16} /> 添加渠道
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-6 p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
          {err && <p className="text-sm text-red-400">{err}</p>}
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="渠道名称" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <select className="input" value={form.provider} onChange={e => setForm({...form, provider: e.target.value})}>
              {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input className="input col-span-2" placeholder="Base URL (如 https://api.openai.com/v1)" value={form.base_url} onChange={e => setForm({...form, base_url: e.target.value})} />
            <input className="input col-span-2" placeholder="API Key" value={form.api_key} onChange={e => setForm({...form, api_key: e.target.value})} />
            <input className="input col-span-2" placeholder="模型列表 (逗号分隔, 如 gpt-4o,gpt-4o-mini)" value={form.models} onChange={e => setForm({...form, models: e.target.value})} />
            <input className="input" type="number" placeholder="优先级" value={form.priority} onChange={e => setForm({...form, priority: +e.target.value})} />
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
            <th className="p-3 font-medium">名称</th><th className="p-3 font-medium">供应商</th><th className="p-3 font-medium">模型</th><th className="p-3 font-medium">优先级</th><th className="p-3 font-medium w-20">操作</th>
          </tr></thead>
          <tbody>
            {channels.map(ch => (
              <tr key={ch.id} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                <td className="p-3 text-gray-100">{ch.name}</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-xs">{ch.provider}</span></td>
                <td className="p-3 text-gray-400 max-w-[300px] truncate">{ch.models}</td>
                <td className="p-3 text-gray-300">{ch.priority}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button onClick={() => edit(ch)} className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-blue-400" title="编辑"><Edit3 size={14} /></button>
                    <button onClick={() => del(ch.id)} className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400" title="删除"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {channels.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">暂无渠道</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
