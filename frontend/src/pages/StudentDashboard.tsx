import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Copy, Check, Coins, Wallet, TrendingUp, Clock, Cpu, Ticket, ShoppingCart, ExternalLink } from 'lucide-react'

interface ModelInfo {
  model_name: string
  display_name: string
  provider: string
  input_price: number
  output_price: number
  max_tokens: number
}

// 按输出价(T粒/千)划分价格档位标签
function priceTier(outputPrice: number) {
  if (outputPrice >= 30) return { label: '非常贵', cls: 'bg-red-500/15 text-red-400 border border-red-500/30' }
  if (outputPrice >= 10)  return { label: '贵',     cls: 'bg-orange-500/15 text-orange-400 border border-orange-500/30' }
  if (outputPrice >= 3)   return { label: '中等',   cls: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' }
  return { label: '低价', cls: 'bg-green-500/15 text-green-400 border border-green-500/30' }
}

export default function StudentDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [logs, setLogs] = useState<any>({ total: 0, items: [] })
  const [topups, setTopups] = useState<any>({ total: 0, items: [] })
  const [redeemCode, setRedeemCode] = useState('')
  const [redeemMsg, setRedeemMsg] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [copiedModel, setCopiedModel] = useState<string | null>(null)
  const [purchaseUrl, setPurchaseUrl] = useState('')

  useEffect(() => {
    api.getStudentProfile().then(setProfile)
    api.getStudentModels().then(setModels)
    api.getStudentLogs(1, 10).then(setLogs)
    api.getStudentTopups(1, 10).then(setTopups)
    api.getSiteConfig('purchase_link').then((r: any) => setPurchaseUrl(r.value || ''))
  }, [])

  const copyModelName = (name: string) => { navigator.clipboard.writeText(name); setCopiedModel(name); setTimeout(() => setCopiedModel(null), 1500) }

  const doRedeem = async () => {
    if (!redeemCode.trim()) return
    setRedeeming(true); setRedeemMsg('')
    try { const res: any = await api.useRedeemCode(redeemCode.trim()); setRedeemMsg('兑换成功!+' + res.amount.toLocaleString() + ' T粒'); setRedeemCode(''); api.getStudentProfile().then(setProfile) }
    catch (e: any) { setRedeemMsg(e.message) }
    finally { setRedeeming(false) }
  }

  if (!profile) return <div className="text-center text-gray-500 py-12">加载中...</div>

  return (<div className="space-y-6">
    <div id="overview" className="scroll-mt-20 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-4 rounded-xl bg-gray-900 border border-gray-800"><div className="flex items-center gap-2 text-gray-400 text-sm mb-1"><Coins size={16} className="text-yellow-400"/> T粒 余额</div><p className="text-2xl font-semibold text-white">{profile.quota.toFixed(2)}</p></div>
      <div className="p-4 rounded-xl bg-gray-900 border border-gray-800"><div className="flex items-center gap-2 text-gray-400 text-sm mb-1"><TrendingUp size={16} className="text-orange-400"/> 已消耗</div><p className="text-2xl font-semibold text-white">{profile.used_quota.toFixed(2)}</p></div>
      <div className="p-4 rounded-xl bg-gray-900 border border-gray-800"><div className="flex items-center gap-2 text-gray-400 text-sm mb-1"><Wallet size={16} className="text-green-400"/> 累计充值</div><p className="text-2xl font-semibold text-white">&yen;{profile.total_cash?.toLocaleString()||'0.00'}</p></div>
    </div>

    <div id="redeem" className="scroll-mt-20 p-4 rounded-xl bg-gray-900 border border-gray-800">
      <div className="flex items-center gap-2 text-gray-400 text-sm mb-3"><Ticket size={16} className="text-yellow-400" /> 兑换码</div>
      <div className="flex items-center gap-2">
        <input className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500" placeholder="输入兑换码" value={redeemCode} onChange={e => setRedeemCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && doRedeem()} />
        <button onClick={doRedeem} disabled={redeeming || !redeemCode.trim()} className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-sm disabled:opacity-50 transition-colors shrink-0">{redeeming ? '兑换中' : '兑换'}</button>
        {false && <Link to="/purchase" className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 border border-orange-600/30 text-orange-400 text-xs transition-colors shrink-0"><ShoppingCart size={12} /> T粒充值</Link>}
        {false && <Link to="/purchase" className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 text-green-400 text-xs transition-colors shrink-0"><ShoppingCart size={12} /> T粒充值 (微信)</Link>}
        {purchaseUrl && (
          <a href={purchaseUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-600/10 hover:bg-pink-600/20 border border-pink-600/20 text-pink-400 text-xs transition-colors shrink-0"><ExternalLink size={12} /> 淘兑换码</a>
        )}
      </div>
      {redeemMsg && <p className={'text-xs mt-2 ' + (redeemMsg.includes('成功') ? 'text-green-400' : 'text-red-400')}>{redeemMsg}</p>}
    </div>

    <div id="models" className="scroll-mt-20 rounded-xl bg-gray-900 border border-gray-800 overflow-hidden"><div className="p-4 border-b border-gray-800"><h2 className="flex items-center gap-2 text-lg font-semibold text-white"><Cpu size={18} className="text-purple-400"/> 可用模型</h2></div>
      <table className="w-full text-sm"><thead><tr className="border-b border-gray-800 text-gray-400 text-left"><th className="p-3 font-medium">模型名称</th><th className="p-3 font-medium">价格档位</th><th className="p-3 font-medium">供应商</th><th className="p-3 font-medium">最大 T粒</th></tr></thead>
      <tbody>{models.map((m,i)=>{const t=priceTier(m.output_price);return(<tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/50"><td className="p-3"><span className="text-gray-100 font-mono text-xs">{m.model_name}</span>{m.display_name&&<span className="ml-2 text-gray-500 text-xs">{m.display_name}</span>}<button onClick={() => copyModelName(m.model_name)} className="ml-2 p-0.5 rounded hover:bg-gray-700 text-gray-600 hover:text-gray-300 transition-colors inline-flex align-middle" title="复制模型名">{copiedModel === m.model_name ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}</button></td><td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${t.cls}`}>{t.label}</span></td><td className="p-3"><span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-xs">{m.provider}</span></td><td className="p-3 text-gray-400 font-mono text-xs">{m.max_tokens.toLocaleString()}</td></tr>)})}{models.length===0&&<tr><td colSpan={4} className="p-6 text-center text-gray-500">暂无可用的模型</td></tr>}</tbody></table>
    </div>

    <div id="logs" className="scroll-mt-20 rounded-xl bg-gray-900 border border-gray-800 overflow-hidden"><div className="p-4 border-b border-gray-800"><h2 className="flex items-center gap-2 text-lg font-semibold text-white"><Clock size={18} className="text-purple-400"/> 使用记录 <span className="text-sm text-gray-500 font-normal ml-2">最近 10 条</span></h2></div>
      <table className="w-full text-sm"><thead><tr className="border-b border-gray-800 text-gray-400 text-left"><th className="p-3 font-medium">时间</th><th className="p-3 font-medium">模型</th><th className="p-3 font-medium">T粒 消耗</th><th className="p-3 font-medium">状态</th></tr></thead>
      <tbody>{logs.items?.map((log:any)=>(<tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/50"><td className="p-3 text-gray-500 text-xs">{new Date(log.created_at).toLocaleString()}</td><td className="p-3 text-gray-300 font-mono text-xs">{log.model}</td><td className="p-3 text-gray-400 font-mono text-xs">{log.cost.toFixed(4)}<span className="text-gray-600 ml-1">(入:{log.prompt_tokens} 出:{log.completion_tokens})</span></td><td className="p-3"><span className={'px-2 py-0.5 rounded text-xs '+(log.success?'bg-green-900/50 text-green-400':'bg-red-900/50 text-red-400')}>{log.success?'成功':'失败'}</span></td></tr>))}{(!logs.items||logs.items.length===0)&&<tr><td colSpan={4} className="p-6 text-center text-gray-500">暂无使用记录</td></tr>}</tbody></table>
    </div>

    <div id="topups" className="scroll-mt-20 rounded-xl bg-gray-900 border border-gray-800 overflow-hidden"><div className="p-4 border-b border-gray-800"><h2 className="flex items-center gap-2 text-lg font-semibold text-white"><Wallet size={18} className="text-green-400"/> 充值记录 <span className="text-sm text-gray-500 font-normal ml-2">最近 10 条</span></h2></div>
      <table className="w-full text-sm"><thead><tr className="border-b border-gray-800 text-gray-400 text-left"><th className="p-3 font-medium">时间</th><th className="p-3 font-medium">T粒 数量</th><th className="p-3 font-medium">金额</th><th className="p-3 font-medium">备注</th></tr></thead>
      <tbody>{topups.items?.map((t:any)=>(<tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/50"><td className="p-3 text-gray-500 text-xs">{new Date(t.created_at).toLocaleString()}</td><td className="p-3 text-gray-300 font-mono text-xs">{t.amount.toFixed(2)}</td><td className="p-3 text-green-400 font-mono text-xs">&yen;{t.payment_amount?.toFixed(2)||'-'}</td><td className="p-3 text-gray-500 text-xs">{t.remark||'-'}</td></tr>))}{(!topups.items||topups.items.length===0)&&<tr><td colSpan={4} className="p-6 text-center text-gray-500">暂无充值记录</td></tr>}</tbody></table>
    </div>
  </div>)
}
