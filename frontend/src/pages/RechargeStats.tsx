import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, Users, DollarSign, Coins, Wallet, Ticket } from 'lucide-react'

const DAYS = [7, 30, 90, 365]

export default function RechargeStats() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [error, setError] = useState('')

  const load = (d: number) => {
    setLoading(true)
    setError('')
    fetch(`/api/proxy/admin/recharge-stats?days=${d}`, {
      headers: { 'New-Api-User': localStorage.getItem('token') || '' },
    })
      .then(async r => {
        const body = await r.json()
        if (!r.ok) throw new Error(body.detail || body.message || '充值统计加载失败')
        return body
      })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }

  useEffect(() => { load(days) }, [days])

  const fmtYuan = (n: number) => '¥' + (n || 0).toFixed(2)
  const fmtTli = (n: number) => (n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">充值统计</h1>
        <div className="flex gap-2">
          {DAYS.map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${days === d ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {d === 365 ? '全年' : `近${d}天`}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center text-gray-500 py-12">加载中...</div>}
      {error && <div className="text-center text-red-400 py-12">{error}</div>}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<DollarSign size={20} />} label="充值收入" value={fmtYuan(data.summary.yuan_in)} color="text-green-400" />
            <StatCard icon={<Coins size={20} />} label="T粒入账" value={fmtTli(data.summary.tli_in)} color="text-blue-400" />
            <StatCard icon={<Ticket size={20} />} label="订单数" value={data.summary.order_count.toString()} color="text-yellow-400" />
            <StatCard icon={<Users size={20} />} label="活跃用户" value={data.summary.active_users.toString()} color="text-purple-400" />
          </div>

          {/* Breakdown */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800 text-sm text-gray-400 font-medium">收入明细</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="p-3 font-medium">渠道</th>
                  <th className="p-3 font-medium">T粒</th>
                  <th className="p-3 font-medium">人民币</th>
                  <th className="p-3 font-medium">订单数</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: '支付宝', ...data.breakdown.alipay },
                  { label: '微信支付', ...data.breakdown.wechat },
                ].filter(r => r.count > 0).map(r => (
                  <tr key={r.label} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                    <td className="p-3 text-gray-200">{r.label}</td>
                    <td className="p-3 text-blue-400 font-mono">{fmtTli(r.tli)}</td>
                    <td className="p-3 text-green-400 font-mono">{fmtYuan(r.yuan)}</td>
                    <td className="p-3 text-gray-400">{r.count}</td>
                  </tr>
                ))}
                {data.breakdown.redeem.count > 0 && (
                  <tr className="border-b border-gray-800/50 hover:bg-gray-800/50">
                    <td className="p-3 text-gray-200">兑换码</td>
                    <td className="p-3 text-blue-400 font-mono">{fmtTli(data.breakdown.redeem.tli)}</td>
                    <td className="p-3 text-gray-500">—</td>
                    <td className="p-3 text-gray-400">{data.breakdown.redeem.count}</td>
                  </tr>
                )}
                {data.breakdown.topup_admin.count > 0 && (
                  <tr className="border-b border-gray-800/50 hover:bg-gray-800/50">
                    <td className="p-3 text-gray-200">后台充值</td>
                    <td className="p-3 text-blue-400 font-mono">{fmtTli(data.breakdown.topup_admin.tli)}</td>
                    <td className="p-3 text-gray-500">—</td>
                    <td className="p-3 text-gray-400">{data.breakdown.topup_admin.count}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Recent top-ups */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-800 text-sm text-gray-400 font-medium">最近充值记录</div>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-left">
                    <th className="p-3 font-medium">用户</th>
                    <th className="p-3 font-medium">T粒</th>
                    <th className="p-3 font-medium">金额</th>
                    <th className="p-3 font-medium">方式</th>
                    <th className="p-3 font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.recent_topups || []).map((r: any, i: number) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                      <td className="p-3 text-gray-200">{r.username}</td>
                      <td className="p-3 text-blue-400 font-mono">{fmtTli(r.amount)}</td>
                      <td className="p-3 text-green-400 font-mono">{fmtYuan(r.money)}</td>
                      <td className="p-3 text-gray-400">{r.method}</td>
                      <td className="p-3 text-gray-500 text-xs">{r.time?.replace('T', ' ').slice(0, 19)}</td>
                    </tr>
                  ))}
                  {(!data.recent_topups || data.recent_topups.length === 0) && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">当前时间范围内暂无成功充值记录</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>

          {/* Consumption */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
            <div className="text-sm text-gray-400 mb-2">同期 API 消费</div>
            <div className="flex gap-6 text-sm">
              <span className="text-amber-400 font-mono">{fmtTli(data.newapi.tli_consumed)} T粒已消耗</span>
              <span className="text-gray-500">{data.summary.active_users} 个活跃用户</span>
            </div>
          </div>

          {/* Per-user */}
          {(data.per_user.alipay.length > 0 || data.per_user.wechat.length > 0) && (
            <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-800 text-sm text-gray-400 font-medium">用户充值排行</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-left">
                    <th className="p-3 font-medium">用户ID</th>
                    <th className="p-3 font-medium">渠道</th>
                    <th className="p-3 font-medium">T粒</th>
                    <th className="p-3 font-medium">金额</th>
                    <th className="p-3 font-medium">次数</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.per_user.alipay.map((u: any) => ({ ...u, channel: '支付宝' })),
                    ...data.per_user.wechat.map((u: any) => ({ ...u, channel: '微信' }))]
                    .sort((a: any, b: any) => b.yuan - a.yuan)
                    .map((u: any, i: number) => (
                      <tr key={`${u.channel}-${u.user_id}-${i}`} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                        <td className="p-3 text-gray-200 font-mono text-xs">{u.user_id}</td>
                        <td className="p-3 text-gray-400">{u.channel}</td>
                        <td className="p-3 text-blue-400 font-mono">{fmtTli(u.tli)}</td>
                        <td className="p-3 text-green-400 font-mono">{fmtYuan(u.yuan)}</td>
                        <td className="p-3 text-gray-400">{u.count}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
      <div className={`mb-1.5 ${color}`}>{icon}</div>
      <div className={`text-xl font-bold ${color} font-mono`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
