import { useEffect, useState } from 'react'
import { Wifi, Clock, Shield, Download, Ban, Coins, ShoppingCart, AlertCircle, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../lib/api'

interface Plan {
  id: number; name: string; days: number; price: number;
}

interface Subscription {
  id: number; started_at: string; expires_at: string;
  total_days: number; tli_spent: number; days_remaining: number;
}

interface HistoryItem {
  id: number; days: number; tli_amount: number; remark: string; created_at: string;
}

export default function ProxySubscription() {
  const [loading, setLoading] = useState(true)
  const [tliBalance, setTliBalance] = useState(0)
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null)
  const [days, setDays] = useState(1)
  const [subscribing, setSubscribing] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  const load = async () => {
    try {
      const d = await api.getProxyStatus()
      setTliBalance(d.tli_balance)
      setPlans(d.plans)
      setSubscription(d.subscription)
      setHistory(d.history || [])
      if (d.plans?.length > 0 && !selectedPlan) setSelectedPlan(d.plans[0].id)
    } catch (e: any) {
      setMsg(e.message || '加载失败')
      setMsgOk(false)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const doSubscribe = async () => {
    if (!selectedPlan) return
    setSubscribing(true); setMsg('')
    try {
      const res = await api.subscribeProxy(selectedPlan, days)
      setMsg(res.message || '订阅成功')
      setMsgOk(true)
      await load()
    } catch (e: any) {
      setMsg(e.message || '订阅失败')
      setMsgOk(false)
    } finally { setSubscribing(false) }
  }

  const doCancel = async () => {
    if (!confirm('确认取消订阅？\n\n• 未使用天数不退 T粒\n• 配置文件立即失效\n• 可随时重新订阅')) return
    setCanceling(true); setMsg('')
    try {
      const res = await api.cancelProxy()
      setMsg(res.message || '已取消')
      setMsgOk(true)
      await load()
    } catch (e: any) {
      setMsg(e.message || '取消失败')
      setMsgOk(false)
    } finally { setCanceling(false) }
  }

  const doDownload = async () => {
    setDownloading(true)
    try {
      const token = localStorage.getItem('token')
      const resp = await fetch('/api/proxy/config', {
        headers: { 'New-Api-User': token || '' },
        credentials: 'include',
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }))
        throw new Error(err.detail || err.message || '下载失败')
      }
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = resp.headers.get('Content-Disposition') || ''
      const fname = disposition.match(/filename=(.+)/)?.[1] || 'clash-config.yaml'
      a.download = fname
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setMsg('配置下载成功')
      setMsgOk(true)
    } catch (e: any) {
      setMsg(e.message || '下载失败')
      setMsgOk(false)
    } finally { setDownloading(false) }
  }

  const selectedPlanObj = plans.find(p => p.id === selectedPlan)
  const totalPrice = selectedPlanObj ? selectedPlanObj.price * days : 0
  const canAfford = tliBalance >= totalPrice

  if (loading) return <div className="text-center text-gray-500 py-12">加载中...</div>

  return (
    <div className="space-y-6">
      {/* ── Status card ── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
          <Wifi size={20} className="text-emerald-400" /> 代理订阅
        </h2>

        {subscription ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-xs text-gray-400 mb-1">状态</div>
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <Shield size={16} /> 已激活
              </div>
            </div>
            <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">剩余天数</div>
              <div className="text-xl font-semibold text-white">{subscription.days_remaining} 天</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">到期时间</div>
              <div className="text-sm font-semibold text-white">
                {subscription.expires_at ? new Date(subscription.expires_at).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-800 border border-gray-700 mb-4">
            <AlertCircle size={20} className="text-yellow-400 shrink-0" />
            <div>
              <p className="text-sm text-gray-300">尚未订阅代理服务</p>
              <p className="text-xs text-gray-500 mt-0.5">订阅后可获得专属FlClash配置文件，支持Hysteria2 + SS双协议</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {subscription && (
            <button
              onClick={doDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm transition-colors disabled:opacity-50"
            >
              <Download size={16} /> {downloading ? '下载中...' : '下载配置文件'}
            </button>
          )}
          {subscription && (
            <button
              onClick={doCancel}
              disabled={canceling}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-400 text-sm transition-colors disabled:opacity-50"
            >
              <Ban size={16} /> {canceling ? '取消中...' : '取消订阅'}
            </button>
          )}
        </div>
      </div>

      {/* ── Subscribe card ── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
          <ShoppingCart size={16} className="text-blue-400" />
          {subscription ? '续费订阅' : '订阅代理服务'}
        </h3>

        {/* T粒 balance */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <Coins size={16} className="text-yellow-400" />
          <span className="text-gray-400">T粒余额：</span>
          <span className="text-white font-semibold">{tliBalance.toFixed(2)}</span>
        </div>

        {/* Plan grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {plans.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                selectedPlan === p.id
                  ? 'bg-blue-600/10 border-blue-500/40 ring-1 ring-blue-500/30'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="text-sm font-semibold text-white">{p.name}</div>
              <div className="text-xs text-gray-400 mt-1">{p.days}天 · {p.price} T粒</div>
              <div className="text-xs text-gray-500 mt-0.5">{(p.price / p.days).toFixed(0)} T粒/天</div>
            </button>
          ))}
        </div>

        {/* Days selector */}
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-gray-400">购买份数：</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 6, 12].map(n => (
              <button
                key={n}
                onClick={() => setDays(n)}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  days === n
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >{n}{n === 1 ? '份' : ''}</button>
            ))}
          </div>
        </div>

        {/* Total & Subscribe */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400">
              合计：<span className="text-white font-semibold">{totalPrice} T粒</span>
              <span className="text-gray-500 text-xs ml-1">
                ({selectedPlanObj ? days * selectedPlanObj.days : 0}天)
              </span>
            </div>
            {!canAfford && (
              <p className="text-xs text-red-400 mt-1">T粒余额不足，请先兑换</p>
            )}
          </div>
          <button
            onClick={doSubscribe}
            disabled={subscribing || !canAfford || !selectedPlan}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm disabled:opacity-50 transition-colors"
          >
            {subscribing ? '订阅中...' : subscription ? '续费' : '订阅'}
          </button>
        </div>

        {msg && (
          <p className={`text-sm mt-3 ${msgOk ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>
        )}
      </div>

      {/* ── Purchase history ── */}
      {history.length > 0 && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Clock size={16} className="text-gray-400" /> 购买记录
            </h3>
            {showHistory ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
          </button>
          {showHistory && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-xs border-b border-gray-800">
                    <th className="py-2 pr-4">时间</th>
                    <th className="py-2 pr-4">套餐</th>
                    <th className="py-2 pr-4">天数</th>
                    <th className="py-2">T粒</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id} className="border-b border-gray-800/50">
                      <td className="py-2 pr-4 text-gray-400 text-xs">
                        {h.created_at ? new Date(h.created_at).toLocaleString('zh-CN') : '-'}
                      </td>
                      <td className="py-2 pr-4 text-gray-300">{h.remark}</td>
                      <td className="py-2 pr-4 text-gray-300">{h.days}天</td>
                      <td className="py-2 text-yellow-400">{h.tli_amount.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
