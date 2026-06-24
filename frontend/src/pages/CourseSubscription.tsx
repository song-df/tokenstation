import { useEffect, useState } from 'react'
import { BookOpen, ShoppingCart, Copy, Check, Coins, History } from 'lucide-react'
import { api } from '../lib/api'

interface CourseCode {
  id: number; code: string; amount: number; state: string; purchased_at: string; used_at: string | null;
}

const STATE_LABELS: Record<string, string> = {
  shipped: '未使用',
  used: '已使用',
}

export default function CourseSubscription() {
  const [tliBalance, setTliBalance] = useState(0)
  const [purchasing, setPurchasing] = useState(false)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(true)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<CourseCode[]>([])

  const load = async () => {
    try {
      const [status, codes] = await Promise.all([
        api.getProxyStatus(),
        api.getCourseCodes(),
      ])
      setTliBalance(status.tli_balance)
      setHistory(codes || [])
    } catch (e: any) {
      setMsg(e.message || '加载失败')
      setMsgOk(false)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const doPurchase = async () => {
    setPurchasing(true); setMsg(''); setCode('')
    try {
      const res = await api.purchaseCourse()
      setCode(res.code)
      setMsg('购买成功！邀请码已生成')
      setMsgOk(true)
      setTliBalance(res.tli_balance)
      const codes = await api.getCourseCodes()
      setHistory(codes || [])
    } catch (e: any) {
      setMsg(e.message || '购买失败')
      setMsgOk(false)
    } finally { setPurchasing(false) }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const price = 1000
  const canAfford = tliBalance >= price

  if (loading) return <div className="text-center text-gray-500 py-12">加载中...</div>

  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
        <BookOpen size={22} className="text-indigo-400" /> 课程订阅
      </h2>

      {/* Purchase card */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">AI 课程邀请码</h3>
        <p className="text-sm text-gray-400 mb-4">
          购买后可获得一个 AI 课程平台邀请码，用于注册课程账号。
          先去看看课程平台：
          <a href="https://aiotedu.cc" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline ml-1">
            aiotedu.cc →
          </a>
        </p>

        <div className="flex items-center gap-2 mb-4 text-sm">
          <Coins size={16} className="text-yellow-400" />
          <span className="text-gray-400">T粒余额：</span>
          <span className="text-white font-semibold">{tliBalance.toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800 border border-gray-700 mb-4">
          <div>
            <div className="text-white font-semibold">{price.toLocaleString()} T粒</div>
            <div className="text-xs text-gray-500">获得 1 个课程邀请码</div>
          </div>
          <button
            onClick={doPurchase}
            disabled={purchasing || !canAfford}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm disabled:opacity-50 transition-colors"
          >
            <ShoppingCart size={16} />
            {purchasing ? '购买中...' : '立即购买'}
          </button>
        </div>

        {!canAfford && (
          <p className="text-xs text-red-400">T粒余额不足，请先兑换</p>
        )}

        {msg && (
          <p className={`text-sm mt-3 ${msgOk ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>
        )}

        {code && (
          <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="text-xs text-gray-400 mb-2">你的邀请码</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-3 rounded-lg bg-gray-950 border border-gray-700 text-green-400 text-xl font-mono font-bold tracking-widest text-center">
                {code}
              </code>
              <button
                onClick={copyCode}
                className="p-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-green-400 shrink-0 transition-colors"
              >
                {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
              </button>
            </div>
            <p className="text-xs text-green-400/70 mt-2">请妥善保管，遗失不补</p>
          </div>
        )}
      </div>

      {/* Purchase history */}
      {history.length > 0 && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
            <History size={16} className="text-gray-400" /> 购买记录
          </h3>
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-800 border border-gray-700"
              >
                <div>
                  <code className="text-sm font-mono text-gray-200 tracking-wide">{item.code}</code>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(item.purchased_at).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{item.amount.toLocaleString()} T粒</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.state === 'used'
                      ? 'bg-gray-600 text-gray-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {STATE_LABELS[item.state] || item.state}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
