import { useEffect, useState, FormEvent } from 'react'
import { api } from '../lib/api'
import { Plus, Key, Power, PowerOff } from 'lucide-react'

interface User { id: number; username: string; display_name: string; email: string; quota: number; used_quota: number; total_cash: number; api_key: string; is_active: boolean; role: string; created_at: string }

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username: '', display_name: '', email: '', password: '' })
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('')
  const [topupUserId, setTopupUserId] = useState<number | null>(null)
  const [topupForm, setTopupForm] = useState({ amount: 0, payment_amount: 0, remark: '' })

  const load = () => api.getUsers().then(users => { if (filter) { const now = new Date(); let start = new Date(); let end = new Date(); if (filter === 'today') { start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) } else if (filter === 'yesterday') { start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1); end = new Date(now.getFullYear(), now.getMonth(), now.getDate()) } else if (filter === 'week') { start = new Date(now.getTime() - 7*86400000); end = new Date() } else if (filter === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date() }; setUsers(users.filter((u: any) => { const d = new Date(u.created_at); return d >= start && (filter === 'week' || filter === 'month' || d < end) })) } else { setUsers(users) } })
  useEffect(() => { load() }, [filter])

  const create = async (e: FormEvent) => {
    e.preventDefault(); setErr('')
    try { await api.createUser(form); setForm({ username: '', display_name: '', email: '', password: '' }); setShowForm(false); load() }
    catch (e: any) { setErr(e.message) }
  }

  const toggle = async (id: number) => { await api.toggleUser(id); load() }
  const resetKey = async (id: number) => { if (confirm('确定重置 API Key？')) { await api.resetKey(id); load() } }
  const doTopup = async (e: FormEvent) => {
    e.preventDefault()
    if (!topupUserId) return
    try { await api.createTopup({ user_id: topupUserId, ...topupForm }); setTopupUserId(null); setTopupForm({ amount: 0, payment_amount: 0, remark: '' }); load() }
    catch (e: any) { setErr(e.message) }
  }

  const inputClass = "w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">用户管理</h2>
        <div className="flex items-center gap-2">
          {['today','yesterday','week','month'].map(f => (
            <button key={f} onClick={() => setFilter(filter === f ? '' : f)} className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {f === 'today' ? '今日' : f === 'yesterday' ? '昨日' : f === 'week' ? '本周' : '本月'}
            </button>
          ))}
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors">
            <Plus size={16} /> 添加学生
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={create} className="mb-6 p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
          {err && <p className="text-sm text-red-400">{err}</p>}
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} placeholder="用户名" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
            <input className={inputClass} placeholder="显示名称" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} />
            <input className={inputClass} placeholder="邮箱" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <input className={inputClass} type="password" placeholder="密码" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm">创建</button>
        </form>
      )}

      {topupUserId && (
        <form onSubmit={doTopup} className="mb-6 p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
          <h3 className="text-sm font-medium text-gray-300">充值</h3>
          <div className="grid grid-cols-3 gap-3">
            <input className={inputClass} type="number" placeholder="T粒 数量" value={topupForm.amount || ''} onChange={e => setTopupForm({...topupForm, amount: +e.target.value})} required />
            <input className={inputClass} type="number" step="0.01" placeholder="付款金额 (¥)" value={topupForm.payment_amount || ''} onChange={e => setTopupForm({...topupForm, payment_amount: +e.target.value})} />
            <input className={inputClass} placeholder="备注" value={topupForm.remark} onChange={e => setTopupForm({...topupForm, remark: e.target.value})} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm">确认充值</button>
            <button type="button" onClick={() => setTopupUserId(null)} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm">取消</button>
          </div>
        </form>
      )}

      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800 text-gray-400 text-left">
            <th className="p-3 font-medium w-10">ID</th><th className="p-3 font-medium">用户</th><th className="p-3 font-medium">配额</th><th className="p-3 font-medium">已用</th><th className="p-3 font-medium">充值</th><th className="p-3 font-medium">API Key</th><th className="p-3 font-medium">注册时间</th><th className="p-3 font-medium">状态</th><th className="p-3 font-medium w-28">操作</th>
          </tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                <td className="p-3 text-gray-500 font-mono text-xs">{u.id}</td>
                <td className="p-3">
                  <span className="text-gray-100">{u.display_name || u.username}</span>
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 text-xs">{u.role === 'admin' ? '管理员' : '学生'}</span>
                </td>
                <td className="p-3 text-gray-300 font-mono text-xs">{u.quota.toFixed(2)}</td>
                <td className="p-3 text-gray-500 font-mono text-xs">{u.used_quota.toFixed(2)}</td>
                <td className="p-3 text-green-400 font-mono text-xs">&yen;{(u.total_cash || 0).toFixed(2)}</td>
                <td className="p-3 font-mono text-xs text-gray-500 max-w-[180px] truncate" title={u.api_key}>{u.api_key}</td>
                <td className="p-3 text-gray-500 text-xs">{u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${u.is_active ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                    {u.is_active ? '正常' : '已禁用'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setTopupUserId(u.id); setTopupForm({ amount: 0, payment_amount: 0, remark: '' }) }} className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-yellow-400" title="充值"><Plus size={14} /></button>
                    <button onClick={() => resetKey(u.id)} className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-blue-400" title="重置 API Key"><Key size={14} /></button>
                    <button onClick={() => toggle(u.id)} className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-orange-400" title={u.is_active ? '禁用' : '启用'}>
                      {u.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-gray-500">暂无用户</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
