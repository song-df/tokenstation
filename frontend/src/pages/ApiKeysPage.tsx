import { useEffect, useState, FormEvent } from 'react'
import { api } from '../lib/api'
import { Plus, Trash2, Power, PowerOff, Key, Copy, Check } from 'lucide-react'

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [newKey, setNewKey] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => { api.listMyKeys().then(setKeys) }, [])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const res = await api.createKey(name)
      setNewKey(res)
      setName('')
      api.listMyKeys().then(setKeys)
    } catch (e: any) { alert(e.message) }
  }

  const toggle = async (id: number) => { await api.toggleKey(id); api.listMyKeys().then(setKeys) }
  const del = async (id: number) => { if (confirm('删除此Key？')) { await api.deleteKey(id); api.listMyKeys().then(setKeys) } }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">API Key 管理</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm"><Plus size={16} /> 创建Key</button>
      </div>

      {showForm && (
        <form onSubmit={create} className="p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
          <input className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm focus:outline-none focus:border-blue-500" placeholder="Key名称(如: VSCode, Cursor)" value={name} onChange={e => setName(e.target.value)} autoFocus />
          <button type="submit" className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm">创建</button>
        </form>
      )}

      {newKey && (
        <div className="p-4 rounded-xl bg-green-900/30 border border-green-800/50">
          <p className="text-sm text-green-400 mb-2">Key 已创建，请立即保存（仅显示一次）</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-gray-800 text-green-300 text-sm font-mono break-all">{newKey.key}</code>
            <button onClick={() => { navigator.clipboard.writeText(newKey.key); setCopied(true) }} className="p-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-400">
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {keys.map(k => (
          <div key={k.id} className="p-4 rounded-xl bg-gray-900 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Key size={16} className={k.is_active ? 'text-green-400' : 'text-gray-600'} />
                <span className="text-sm text-gray-200">{k.name || '未命名'}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${k.is_active ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>{k.is_active ? '启用' : '禁用'}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggle(k.id)} className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-orange-400" title={k.is_active ? '禁用' : '启用'}>{k.is_active ? <PowerOff size={14} /> : <Power size={14} />}</button>
                {k.id !== 0 && <button onClick={() => del(k.id)} className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>}
              </div>
            </div>
            <code className="block text-xs text-gray-500 font-mono mb-2">{k.key}</code>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>调用 {k.usage_count} 次</span>
              <span>消耗 {k.total_tokens} T粒</span>
              {k.last_used_at && <span>最后使用: {new Date(k.last_used_at).toLocaleString()}</span>}
              <span>创建: {new Date(k.created_at).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
