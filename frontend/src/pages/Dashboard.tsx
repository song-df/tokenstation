import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Users, Radio, Cpu, Coins, TrendingUp, Zap, Ticket, DollarSign, Check, Share2 } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [codeStats, setCodeStats] = useState<any>({})
  const [refStats, setRefStats] = useState<any>({})
  const [referrals, setReferrals] = useState<any[]>([])

  useEffect(() => {
    api.getStats().then(setStats)
    api.codeStats().then(setCodeStats)
    api.getReferralStats().then(setRefStats)
    api.getReferrals().then(setReferrals)
  }, [])

  const cards = [
    { label: '用户数', value: stats?.user_count, icon: Users, color: 'text-blue-400' },
    { label: '渠道数', value: stats?.channel_count, icon: Radio, color: 'text-green-400' },
    { label: '模型数', value: stats?.model_count, icon: Cpu, color: 'text-purple-400' },
    { label: '总T粒', value: stats?.total_quota?.toLocaleString(), icon: Coins, color: 'text-yellow-400' },
    { label: '已消耗', value: stats?.total_used?.toLocaleString(), icon: TrendingUp, color: 'text-orange-400' },
    { label: '今日请求', value: stats?.today_requests, icon: Zap, color: 'text-cyan-400' },
  ]

  const redeemCards = [
    { label: '兑换码总数', value: codeStats.total ?? '-', icon: Ticket, color: 'text-yellow-400' },
    { label: '已使用', value: codeStats.used ?? '-', icon: Check, color: 'text-green-400' },
    { label: '未使用', value: codeStats.unused ?? '-', icon: Ticket, color: 'text-gray-400' },
    { label: '兑换总T粒', value: (codeStats.total_redeemed ?? 0).toLocaleString() + ' T粒', icon: Coins, color: 'text-yellow-400' },
    { label: '兑换等值金额', value: '¥' + ((codeStats.total_redeemed ?? 0) * 0.01).toLocaleString(), icon: DollarSign, color: 'text-green-400' },
  ]

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">仪表盘</h2>

      <h3 className="text-sm font-medium text-gray-500 mb-3">平台概览</h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 rounded-xl bg-gray-900 border border-gray-800">
            <div className="flex items-center gap-3">
              <Icon size={20} className={color} />
              <span className="text-sm text-gray-400">{label}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{value ?? '-'}</p>
          </div>
        ))}
      </div>

      <h3 className="text-sm font-medium text-gray-500 mb-3">兑换充值</h3>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {redeemCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 rounded-xl bg-gray-900 border border-gray-800">
            <div className="flex items-center gap-3">
              <Icon size={20} className={color} />
              <span className="text-sm text-gray-400">{label}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{value ?? '-'}</p>
          </div>
        ))}
      </div>
      <h3 className="text-sm font-medium text-gray-500 mb-3 mt-8">推荐统计</h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { label: '推荐关系数', value: refStats.total_referrals ?? '-', icon: Share2, color: 'text-pink-400' },
          { label: '有推荐用户数', value: refStats.active_referrers ?? '-', icon: Users, color: 'text-blue-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 rounded-xl bg-gray-900 border border-gray-800">
            <div className="flex items-center gap-3">
              <Icon size={20} className={color} />
              <span className="text-sm text-gray-400">{label}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{value ?? '-'}</p>
          </div>
        ))}
      </div>

      {referrals.length > 0 && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Share2 size={18} className="text-pink-400" /> 推荐关系列表
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800 text-gray-400 text-left">
              <th className="p-3 font-medium">推荐人</th><th className="p-3 font-medium">被推荐人</th><th className="p-3 font-medium">时间</th>
            </tr></thead>
            <tbody>
              {referrals.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                  <td className="p-3 text-gray-100">{r._referrer_name}</td>
                  <td className="p-3 text-gray-300">{r._referred_name}</td>
                  <td className="p-3 text-gray-500 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
