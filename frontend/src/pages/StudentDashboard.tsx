import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { ArrowUpRight, BookOpen, Check, Clock, Coins, Copy, ExternalLink, Key, KeyRound, ReceiptText, Ticket, TrendingUp, Wallet } from 'lucide-react'

export default function StudentDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [logs, setLogs] = useState<any>({ total: 0, items: [] })
  const [topups, setTopups] = useState<any>({ total: 0, items: [] })
  const [redeemCode, setRedeemCode] = useState('')
  const [redeemMsg, setRedeemMsg] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [purchaseUrl, setPurchaseUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.getStudentProfile().then(setProfile)
    api.getStudentLogs(1, 10).then(setLogs)
    api.getStudentTopups(1, 10).then(setTopups)
    api.getSiteConfig('purchase_link').then((result: any) => setPurchaseUrl(result.value || '')).catch(() => {})
  }, [])

  const copyKey = () => {
    if (!profile?.api_key) return
    navigator.clipboard.writeText(profile.api_key)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const redeem = async () => {
    if (!redeemCode.trim()) return
    setRedeeming(true)
    setRedeemMsg('')
    try {
      const result: any = await api.useRedeemCode(redeemCode.trim())
      setRedeemMsg(`兑换成功，增加 ${result.amount.toLocaleString()} T粒`)
      setRedeemCode('')
      api.getStudentProfile().then(setProfile)
    } catch (error: any) {
      setRedeemMsg(error.message)
    } finally {
      setRedeeming(false)
    }
  }

  if (!profile) return <div className="py-16 text-center text-slate-500">正在加载账户信息...</div>

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-400">学生控制台</p>
          <h1 className="mt-2 text-2xl font-bold text-white">你好，{profile.display_name || profile.username}</h1>
          <p className="mt-2 text-sm text-slate-500">管理余额、API Key，并查看最近的调用与充值记录。</p>
        </div>
        <Link to="/guide" className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-600 hover:bg-slate-700">
          <BookOpen size={16} /> 使用说明
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'T粒余额', value: profile.quota.toFixed(2), icon: Coins, color: 'text-yellow-400' },
          { label: '累计消耗', value: profile.used_quota.toFixed(2), icon: TrendingUp, color: 'text-orange-400' },
          { label: 'API Key', value: profile.api_key ? '已配置' : '尚未创建', icon: KeyRound, color: 'text-blue-400' },
        ].map(card => (
          <div key={card.label} className="rounded-2xl border border-slate-700 bg-slate-900/75 p-5">
            <div className="flex items-center gap-2 text-sm text-slate-500"><card.icon size={17} className={card.color} /> {card.label}</div>
            <p className="mt-3 text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/75 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Key size={16} className="text-blue-400" /> 当前 API Key</p>
              <p className="mt-1 text-xs text-slate-500">请勿将 Key 公开分享给他人。</p>
            </div>
            <Link to="/keys" className="text-sm font-semibold text-blue-400 hover:text-blue-300">管理 Key</Link>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 p-3">
            <code className="min-w-0 flex-1 truncate text-sm text-slate-300">{profile.api_key || '暂未创建 API Key'}</code>
            {profile.api_key && (
              <button onClick={copyKey} className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-blue-300" title="复制 API Key">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/75 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Ticket size={16} className="text-yellow-400" /> 兑换码充值</p>
          <div className="mt-4 flex gap-2">
            <input className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="输入兑换码" value={redeemCode} onChange={event => setRedeemCode(event.target.value)} onKeyDown={event => event.key === 'Enter' && redeem()} />
            <button onClick={redeem} disabled={redeeming || !redeemCode.trim()} className="rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">{redeeming ? '兑换中' : '兑换'}</button>
          </div>
          {redeemMsg && <p className={`mt-2 text-xs ${redeemMsg.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>{redeemMsg}</p>}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: '/keys', label: '创建或管理 Key', icon: KeyRound },
          { to: '/models', label: '查看模型价格', icon: ReceiptText },
          { to: '/purchase', label: '在线充值', icon: Wallet },
          { to: '/guide', label: '选择接入教程', icon: BookOpen },
        ].map(item => (
          <Link key={item.to} to={item.to} className="group flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/65 p-4 text-sm font-semibold text-slate-300 hover:border-blue-500/40 hover:text-white">
            <span className="flex items-center gap-2"><item.icon size={16} className="text-blue-400" /> {item.label}</span>
            <ArrowUpRight size={15} className="text-slate-600 group-hover:text-blue-400" />
          </Link>
        ))}
      </section>

      {purchaseUrl && (
        <a href={purchaseUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border border-pink-500/20 bg-pink-500/5 px-4 py-3 text-sm text-pink-300 hover:bg-pink-500/10">
          <span>也可以通过当前开放的外部兑换码渠道购买</span><ExternalLink size={15} />
        </a>
      )}

      <RecordTable
        title="使用记录"
        icon={<Clock size={18} className="text-purple-400" />}
        empty="暂无使用记录"
        headers={['时间', '模型', 'T粒消耗', '状态']}
        rows={(logs.items || []).map((log: any) => [
          new Date(log.created_at).toLocaleString(),
          log.model,
          `${log.cost.toFixed(4)}（入 ${log.prompt_tokens} / 出 ${log.completion_tokens}）`,
          log.success ? '成功' : '失败',
        ])}
      />

      <RecordTable
        title="充值记录"
        icon={<Wallet size={18} className="text-green-400" />}
        empty="暂无充值记录"
        headers={['时间', 'T粒数量', '金额', '备注']}
        rows={(topups.items || []).map((topup: any) => [
          new Date(topup.created_at).toLocaleString(),
          topup.amount.toFixed(2),
          topup.payment_amount ? `¥${topup.payment_amount.toFixed(2)}` : '-',
          topup.remark || '-',
        ])}
      />
    </div>
  )
}

function RecordTable({ title, icon, headers, rows, empty }: { title: string; icon: React.ReactNode; headers: string[]; rows: string[][]; empty: string }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/75">
      <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
        {icon}<h2 className="font-semibold text-white">{title}</h2><span className="text-xs text-slate-600">最近 10 条</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead><tr className="border-b border-slate-800 text-slate-500">{headers.map(header => <th key={header} className="px-4 py-3 font-medium">{header}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-slate-800/70 text-slate-400 last:border-0 hover:bg-slate-800/40">
                {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-xs">{cell}</td>)}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-slate-500">{empty}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
