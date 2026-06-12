import { useEffect, useState } from 'react'
import { Share2, Copy, Check, Users, Coins, TrendingUp } from 'lucide-react'
import { api } from '../lib/api'

interface Referee {
  user_id: number; username: string; display_name: string;
  quota: number; total_topup: number; joined_at: number;
}

export default function ReferralPage() {
  const [referralCode, setReferralCode] = useState('')
  const [referralCount, setReferralCount] = useState(0)
  const [referralQuota, setReferralQuota] = useState(0)
  const [referees, setReferees] = useState<Referee[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const d = await api.getReferral()
      setReferralCode(d.referral_code)
      setReferralCount(d.referral_count)
      setReferralQuota(d.referral_quota)
      setReferees(d.referees || [])
    } catch (e: any) {
      setMsg(e.message || '加载失败')
    } finally { setLoading(false) }
  }

  const copyRefLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/register?ref=${referralCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="text-center text-gray-500 py-12">加载中...</div>

  const refLink = `${window.location.origin}/register?ref=${referralCode}`

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
        <Share2 size={22} className="text-pink-400" /> 推荐有礼
      </h2>

      {msg && <p className="text-sm text-red-400">{msg}</p>}

      {/* Referral link card */}
      <div className="p-6 rounded-xl bg-gray-900 border border-gray-800">
        <h3 className="text-sm font-medium text-gray-300 mb-3">推荐链接</h3>
        <p className="text-xs text-gray-500 mb-3">
          分享推荐链接，新用户注册后双方各得 100 T粒。好友每次充值你还能获得 10% 返利。
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-sm font-mono truncate">
            {refLink}
          </code>
          <button
            onClick={copyRefLink}
            className="p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-pink-400 shrink-0 transition-colors"
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Users size={16} className="text-blue-400" /> 已推荐
          </div>
          <p className="text-2xl font-semibold text-white">{referralCount} 人</p>
        </div>
        <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Coins size={16} className="text-yellow-400" /> 返利 T粒
          </div>
          <p className="text-2xl font-semibold text-white">{referralQuota.toFixed(2)}</p>
        </div>
        <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <TrendingUp size={16} className="text-green-400" /> 推荐佣金
          </div>
          <p className="text-xs text-gray-500">好友充值额的 10%</p>
        </div>
      </div>

      {/* Referred users */}
      <div className="p-6 rounded-xl bg-gray-900 border border-gray-800">
        <h3 className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-4">
          <Users size={16} className="text-blue-400" /> 推荐成功列表
        </h3>

        {referees.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">还没有推荐成功的用户</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs border-b border-gray-800">
                  <th className="py-2 pr-4">用户</th>
                  <th className="py-2 pr-4">T粒余额</th>
                  <th className="py-2 pr-4">累计充值</th>
                  <th className="py-2">注册时间</th>
                </tr>
              </thead>
              <tbody>
                {referees.map(r => (
                  <tr key={r.user_id} className="border-b border-gray-800/50">
                    <td className="py-2 pr-4 text-gray-200">
                      <div className="font-medium">{r.display_name}</div>
                      <div className="text-xs text-gray-500">{r.username}</div>
                    </td>
                    <td className="py-2 pr-4 text-gray-300">{r.quota.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-yellow-400">{r.total_topup.toFixed(2)}</td>
                    <td className="py-2 text-gray-400 text-xs">
                      {r.joined_at ? new Date(r.joined_at * 1000).toLocaleDateString('zh-CN') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
