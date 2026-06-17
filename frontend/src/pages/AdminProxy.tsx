import { useEffect, useState } from 'react'
import { Wifi, Ban, Plus, Save, X, Clock, Shield, Coins } from 'lucide-react'
import { api } from '../lib/api'

interface Sub {
  id: number; user_id: number; username: string; plan_id: number;
  total_days: number; days_remaining: number;
  started_at: string; expires_at: string; canceled_at: string | null;
  tli_spent: number; is_active: boolean;
}

interface Plan {
  id: number; name: string; days: number; price: number; is_active: boolean;
}

export default function AdminProxy() {
  const [subs, setSubs] = useState<Sub[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(true)
  // Plan edit state
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [newPlan, setNewPlan] = useState(false)
  const [planForm, setPlanForm] = useState({ name: '', days: 30, price: 0, is_active: true })

  const load = async () => {
    try {
      const [s, p] = await Promise.all([
        api.adminListProxySubs(),
        api.adminListProxyPlans(),
      ])
      setSubs(s)
      setPlans(p)
    } catch (e: any) {
      setMsg(e.message || '加载失败')
      setMsgOk(false)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const doCancelSub = async (id: number, username: string) => {
    if (!confirm(`确认取消 ${username} 的订阅？\n\n• 未使用天数不退 T粒\n• 配置文件立即失效`)) return
    try {
      await api.adminCancelProxySub(id)
      setMsg(`已取消 ${username} 的订阅`)
      setMsgOk(true)
      load()
    } catch (e: any) {
      setMsg(e.message || '取消失败')
      setMsgOk(false)
    }
  }

  const startEditPlan = (p: Plan) => {
    setEditingPlan(p)
    setNewPlan(false)
    setPlanForm({ name: p.name, days: p.days, price: p.price, is_active: p.is_active })
  }

  const startNewPlan = () => {
    setNewPlan(true)
    setEditingPlan(null)
    setPlanForm({ name: '', days: 30, price: 0, is_active: true })
  }

  const cancelEdit = () => {
    setEditingPlan(null)
    setNewPlan(false)
  }

  const savePlan = async () => {
    try {
      if (editingPlan) {
        await api.adminUpdateProxyPlan(editingPlan.id, planForm)
        setMsg('套餐已更新')
      } else {
        await api.adminCreateProxyPlan(planForm)
        setMsg('套餐已创建')
      }
      setMsgOk(true)
      cancelEdit()
      load()
    } catch (e: any) {
      setMsg(e.message || '保存失败')
      setMsgOk(false)
    }
  }

  if (loading) return <div className="text-center text-gray-500 py-12">加载中...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wifi size={24} className="text-emerald-400" />
        <h1 className="text-xl font-semibold text-white">代理管理</h1>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm ${msgOk ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {msg}
          <button onClick={() => setMsg('')} className="ml-2 text-gray-400 hover:text-white"><X size={14} /></button>
        </div>
      )}

      {/* ── Plans ── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Coins size={16} className="text-yellow-400" /> 套餐管理
          </h2>
          <button onClick={startNewPlan} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors">
            <Plus size={14} /> 新增
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {plans.map(p => (
            <div key={p.id} className={`p-3 rounded-lg border ${p.is_active ? 'bg-gray-800 border-gray-700' : 'bg-gray-800/50 border-gray-700/50 opacity-60'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-white">{p.name}</span>
                {!p.is_active && <span className="text-xs text-gray-500">已下线</span>}
              </div>
              <div className="text-xs text-gray-400">{p.days}天 · {p.price} T粒</div>
              <div className="text-xs text-gray-500">{(p.price / p.days).toFixed(0)} T粒/天</div>
              <button onClick={() => startEditPlan(p)} className="mt-2 text-xs text-blue-400 hover:text-blue-300">编辑</button>
            </div>
          ))}
        </div>

        {/* Plan edit form */}
        {(editingPlan || newPlan) && (
          <div className="mt-4 p-4 rounded-lg bg-gray-800 border border-gray-700">
            <h3 className="text-sm font-semibold text-white mb-3">{editingPlan ? '编辑套餐' : '新增套餐'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">名称</label>
                <input className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 text-sm" value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">天数</label>
                <input type="number" className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 text-sm" value={planForm.days} onChange={e => setPlanForm({...planForm, days: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">价格 (T粒)</label>
                <input type="number" className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 text-sm" value={planForm.price} onChange={e => setPlanForm({...planForm, price: parseInt(e.target.value) || 0})} />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-gray-300">
                  <input type="checkbox" checked={planForm.is_active} onChange={e => setPlanForm({...planForm, is_active: e.target.checked})} />
                  启用
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={savePlan} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm"><Save size={14} /> 保存</button>
              <button onClick={cancelEdit} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm">取消</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Subscriptions ── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
          <Shield size={16} className="text-blue-400" /> 订阅列表
          <span className="text-gray-500 font-normal">({subs.length})</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs border-b border-gray-800">
                <th className="py-2 pr-4">用户</th>
                <th className="py-2 pr-4">天数</th>
                <th className="py-2 pr-4">剩余</th>
                <th className="py-2 pr-4">到期</th>
                <th className="py-2 pr-4">T粒</th>
                <th className="py-2 pr-4">状态</th>
                <th className="py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id} className="border-b border-gray-800/50">
                  <td className="py-2 pr-4 text-gray-200">
                    <div className="font-medium">{s.username}</div>
                    <div className="text-xs text-gray-500">ID: {s.user_id}</div>
                  </td>
                  <td className="py-2 pr-4 text-gray-300">{s.total_days}天</td>
                  <td className="py-2 pr-4">
                    <span className={s.days_remaining <= 3 ? 'text-red-400' : 'text-green-400'}>
                      {s.days_remaining}天
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-400 text-xs">
                    {s.expires_at ? new Date(s.expires_at).toLocaleDateString('zh-CN') : '-'}
                  </td>
                  <td className="py-2 pr-4 text-yellow-400">{s.tli_spent.toFixed(0)}</td>
                  <td className="py-2 pr-4">
                    {s.is_active ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/20">活跃</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-500/15 text-gray-400 border border-gray-500/20">{s.canceled_at ? '已取消' : '已过期'}</span>
                    )}
                  </td>
                  <td className="py-2">
                    {s.is_active && (
                      <button onClick={() => doCancelSub(s.id, s.username)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                        <Ban size={12} /> 取消
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {subs.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-center text-gray-500">暂无订阅</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
