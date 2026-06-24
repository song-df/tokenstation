import { useEffect, useState } from 'react'
import { Coins, ShoppingCart, Clock, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { api } from '../lib/api'

interface Package {
  id: number; name: string; tli_amount: number; price_yuan: number;
}

interface OrderItem {
  out_trade_no: string; tli_amount: number; total_amount: number;
  subject: string; trade_status: string; trade_no?: string;
  transaction_id?: string; paid_at: string | null; created_at: string;
  _method?: string;
}

export default function TliPurchase() {
  const [loading, setLoading] = useState(true)
  const [tliBalance, setTliBalance] = useState(0)
  const [packages, setPackages] = useState<Package[]>([])
  const [selectedPkg, setSelectedPkg] = useState<number | null>(null)
  const [ordering, setOrdering] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(true)
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [ordersTotal, setOrdersTotal] = useState(0)

  const load = async () => {
    try {
      const [pkgs, profile, alipayOrds] = await Promise.all([
        api.getTliPackages(),
        api.getStudentProfile(),
        api.getAlipayOrders(1, 10),
      ])
      setPackages(pkgs || [])
      setTliBalance(profile.quota || 0)
      if (pkgs?.length > 0 && !selectedPkg) setSelectedPkg(pkgs[0].id)

      const merged = (alipayOrds.items || []).map((o: OrderItem) => ({ ...o, _method: 'alipay' }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setOrders(merged.slice(0, 20))
      setOrdersTotal(alipayOrds.total || 0)
    } catch (e: any) {
      setMsg(e.message || '加载失败')
      setMsgOk(false)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const doPurchase = async () => {
    if (!selectedPkg) return
    setOrdering(true); setMsg('')
    try {
      const res = await api.createAlipayOrder(selectedPkg)
      if (res.pay_url) {
        window.location.href = res.pay_url
      } else {
        setMsg('创建订单失败')
        setMsgOk(false)
      }
    } catch (e: any) {
      setMsg(e.message || '创建订单失败')
      setMsgOk(false)
    } finally { setOrdering(false) }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'WAIT_BUYER_PAY': case 'NOTPAY': return { text: '待支付', cls: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' }
      case 'TRADE_SUCCESS': case 'SUCCESS': return { text: '已支付', cls: 'bg-green-500/15 text-green-400 border border-green-500/30' }
      case 'TRADE_FINISHED': return { text: '已完成', cls: 'bg-green-500/15 text-green-400 border border-green-500/30' }
      case 'TRADE_CLOSED': case 'CLOSED': return { text: '已关闭', cls: 'bg-gray-500/15 text-gray-400 border border-gray-500/30' }
      case 'PAYERROR': return { text: '支付失败', cls: 'bg-red-500/15 text-red-400 border border-red-500/30' }
      default: return { text: status, cls: 'bg-gray-500/15 text-gray-400' }
    }
  }

  const selectedPkgObj = packages.find(p => p.id === selectedPkg)

  if (loading) return <div className="text-center text-gray-500 py-12">加载中...</div>

  return (
    <div className="space-y-6">
      {/* ── Balance card ── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
          <ShoppingCart size={20} className="text-orange-400" /> T粒充值
        </h2>
        <div className="flex items-center gap-2 mb-2">
          <Coins size={18} className="text-yellow-400" />
          <span className="text-gray-400 text-sm">当前余额：</span>
          <span className="text-xl font-semibold text-white">{tliBalance.toFixed(2)} T粒</span>
        </div>
      </div>

      {/* ── Package selection ── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">选择充值套餐</h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {packages.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPkg(p.id)}
              className={`p-3 rounded-lg border text-center transition-colors ${
                selectedPkg === p.id
                  ? 'bg-orange-600/10 border-orange-500/40 ring-1 ring-orange-500/30'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="text-sm font-semibold text-white">{p.name}</div>
              <div className="text-lg font-bold mt-1 text-orange-400">&yen;{p.price_yuan.toFixed(2)}</div>
              <div className="text-xs text-gray-500 mt-0.5">{p.tli_amount.toLocaleString()} T粒</div>
            </button>
          ))}
        </div>

        {packages.length === 0 && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-800 border border-gray-700">
            <AlertCircle size={20} className="text-yellow-400 shrink-0" />
            <p className="text-sm text-gray-300">暂无可用的充值套餐，请联系管理员</p>
          </div>
        )}

        {/* Purchase button */}
        {selectedPkgObj && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-800">
            <div>
              <div className="text-sm text-gray-400">
                合计：<span className="text-white font-semibold">&yen;{selectedPkgObj.price_yuan.toFixed(2)}</span>
                <span className="text-gray-500 text-xs ml-2">({selectedPkgObj.tli_amount.toLocaleString()} T粒)</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">支付方式：支付宝</div>
            </div>
            <button
              onClick={doPurchase}
              disabled={ordering || !selectedPkg}
              className="px-6 py-2.5 rounded-lg text-white text-sm disabled:opacity-50 transition-colors flex items-center gap-2 bg-orange-600 hover:bg-orange-500"
            >
              <ShoppingCart size={16} />
              {ordering ? '创建订单中...' : '支付宝支付'}
            </button>
          </div>
        )}

        {msg && (
          <p className={`text-sm mt-3 ${msgOk ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>
        )}
      </div>

      {/* ── Purchase history ── */}
      {orders.length > 0 && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Clock size={16} className="text-gray-400" /> 购买记录
              {ordersTotal > 0 && (
                <span className="text-xs text-gray-500 font-normal">({ordersTotal}条)</span>
              )}
            </h3>
            {showHistory ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
          </button>
          {showHistory && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-xs border-b border-gray-800">
                    <th className="py-2 pr-4">时间</th>
                    <th className="py-2 pr-4">方式</th>
                    <th className="py-2 pr-4">套餐</th>
                    <th className="py-2 pr-4">金额</th>
                    <th className="py-2">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => {
                    const s = statusLabel(o.trade_status)
                    return (
                      <tr key={o.out_trade_no} className="border-b border-gray-800/50">
                        <td className="py-2 pr-4 text-gray-400 text-xs">
                          {o.created_at ? new Date(o.created_at).toLocaleString('zh-CN') : '-'}
                        </td>
                        <td className="py-2 pr-4 text-xs">
                          <span className="text-orange-400">支付宝</span>
                        </td>
                        <td className="py-2 pr-4 text-gray-300 text-xs">{o.subject}</td>
                        <td className="py-2 pr-4 text-orange-400 font-mono text-xs">&yen;{o.total_amount.toFixed(2)}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.cls}`}>{s.text}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
