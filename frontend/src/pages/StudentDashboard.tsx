import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Copy, Check, Key, Coins, Wallet, TrendingUp, Clock, Cpu, Terminal, ChevronDown, ChevronUp, BookOpen, Ticket, ShoppingCart } from 'lucide-react'

interface ModelInfo {
  model_name: string
  display_name: string
  provider: string
  input_price: number
  output_price: number
  max_tokens: number
}

export default function StudentDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [logs, setLogs] = useState<any>({ total: 0, items: [] })
  const [topups, setTopups] = useState<any>({ total: 0, items: [] })
  const [copied, setCopied] = useState(false)
  const [copiedCc, setCopiedCc] = useState(false)
  const [copiedEnv, setCopiedEnv] = useState(false)
  const [showClaudeCode, setShowClaudeCode] = useState(false)
  const [showCcSwitch, setShowCcSwitch] = useState(false)
  const [showMoonbridge, setShowMoonbridge] = useState(false)
  const [tasks, setTasks] = useState<any>(null)
  const [redeemCode, setRedeemCode] = useState('')
  const [redeemMsg, setRedeemMsg] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [copiedRef, setCopiedRef] = useState(false)

  useEffect(() => {
    api.getStudentProfile().then(setProfile)
    api.getStudentModels().then(setModels)
    api.getStudentLogs(1, 10).then(setLogs)
    api.getStudentTopups(1, 10).then(setTopups)
    api.getTasks().then(setTasks)
  }, [])

  const copyKey = () => { if (profile?.api_key) { navigator.clipboard.writeText(profile.api_key); setCopied(true); setTimeout(() => setCopied(false), 2000) } }
  const copyCurl = () => { navigator.clipboard.writeText("curl "+window.location.origin+"/api/v1/chat/completions \\\n  -H \"Authorization: Bearer "+(profile?.api_key||'')+"\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"model\":\"deepseek-v4-flash\",\"messages\":[{\"role\":\"user\",\"content\":\"hello\"}]}'") }
  const copyClaudeCodeConfig = () => { navigator.clipboard.writeText("claude --set-env ANTHROPIC_BASE_URL="+window.location.origin+"/api\nclaude --set-env ANTHROPIC_API_KEY="+(profile?.api_key||'')); setCopiedCc(true); setTimeout(() => setCopiedCc(false), 2000) }
  const copyEnvVars = () => { navigator.clipboard.writeText("export ANTHROPIC_BASE_URL="+window.location.origin+"/api\nexport ANTHROPIC_API_KEY="+(profile?.api_key||'')); setCopiedEnv(true); setTimeout(() => setCopiedEnv(false), 2000) }

  const doRedeem = async () => {
    if (!redeemCode.trim()) return
    setRedeeming(true); setRedeemMsg('')
    try { const res: any = await api.useRedeemCode(redeemCode.trim()); setRedeemMsg('兑换成功!+' + res.amount.toLocaleString() + ' T粒'); setRedeemCode(''); api.getStudentProfile().then(setProfile); api.getTasks().then(setTasks) }
    catch (e: any) { setRedeemMsg(e.message) }
    finally { setRedeeming(false) }
  }

  if (!profile) return <div className="text-center text-gray-500 py-12">加载中...</div>

  const curlexample = "curl "+window.location.origin+"/api/v1/chat/completions \\\n  -H \"Authorization: Bearer "+(profile.api_key||'').slice(0,16)+"...\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"model\":\"deepseek-v4-flash\",\"messages\":[{\"role\":\"user\",\"content\":\"hello\"}]}'"
  const hasClaude = models.some(m => m.provider === 'anthropic')

  return (<div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-4 rounded-xl bg-gray-900 border border-gray-800"><div className="flex items-center gap-2 text-gray-400 text-sm mb-1"><Coins size={16} className="text-yellow-400"/> T粒 余额</div><p className="text-2xl font-semibold text-white">{profile.quota.toFixed(2)}</p></div>
      <div className="p-4 rounded-xl bg-gray-900 border border-gray-800"><div className="flex items-center gap-2 text-gray-400 text-sm mb-1"><TrendingUp size={16} className="text-orange-400"/> 已消耗</div><p className="text-2xl font-semibold text-white">{profile.used_quota.toFixed(2)}</p></div>
      <div className="p-4 rounded-xl bg-gray-900 border border-gray-800"><div className="flex items-center gap-2 text-gray-400 text-sm mb-1"><Wallet size={16} className="text-green-400"/> 累计充值</div><p className="text-2xl font-semibold text-white">&yen;{profile.total_cash?.toLocaleString()||'0.00'}</p></div>
    </div>

    <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
      <div className="flex items-center gap-2 text-gray-400 text-sm mb-3"><Ticket size={16} className="text-yellow-400" /> 兑换码</div>
      <div className="flex items-center gap-2">
        <input className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500" placeholder="输入兑换码" value={redeemCode} onChange={e => setRedeemCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && doRedeem()} />
        <button onClick={doRedeem} disabled={redeeming || !redeemCode.trim()} className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-sm disabled:opacity-50 transition-colors">{redeeming ? '兑换中' : '兑换'}</button>
      </div>
      {redeemMsg && <p className={'text-xs mt-2 ' + (redeemMsg.includes('成功') ? 'text-green-400' : 'text-red-400')}>{redeemMsg}</p>}
      <a href="https://m.tb.cn/h.R72ZONy?tk=UoTLgah5wvd" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 mt-3 py-1.5 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 border border-orange-600/30 text-orange-400 text-xs transition-colors"><ShoppingCart size={12} /> 购买兑换券</a>
    </div>

    <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
      <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">任务中心</div>
      <div className="space-y-2">
        {tasks?.tasks?.map((t: any) => (
          <div key={t.key} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-200">{t.title}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-600/20 text-yellow-400">+{t.reward} T粒</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
            </div>
            {t.is_commission ? (
              copiedRef ? <span className="text-xs text-green-400 px-3 py-1">已复制</span> :
              <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/register?ref=' + (profile?.referral_code || '')); setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2000) }} className="px-3 py-1 rounded-lg bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 text-xs border border-pink-600/30">复制分享链接</button>
            ) : t.key === 'verify_email' ? (
              t.completed ? <span className="text-xs text-green-400">已完成</span> :
              <button onClick={async () => { try { await api.verifyEmail(profile.email || ''); api.getStudentProfile().then(setProfile); api.getTasks().then(setTasks) } catch(e: any) { alert(e.message) } }} className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs">验证</button>
            ) : t.completed ? (
              <span className="text-xs text-green-400">已完成</span>
            ) : (
              <span className="text-xs text-gray-500">{t.count !== undefined ? '已' + t.count + '次' : '-'}</span>
            )}
          </div>
        ))}
      </div>
    </div>

    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4"><Key size={18} className="text-blue-400" /> API 配置</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="text-xs text-gray-500 mb-1 block">接口地址</label><code className="block px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm font-mono break-all">{window.location.origin}/api</code></div>
        <div><label className="text-xs text-gray-500 mb-1 block">API Key</label><div className="flex items-center gap-2"><code className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm font-mono truncate">{profile.api_key}</code><button onClick={copyKey} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-green-400 transition-colors shrink-0">{copied?<Check size={16} className="text-green-400"/>:<Copy size={16}/>}</button></div></div>
      </div>
      <div className="mt-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700"><div className="flex items-center justify-between mb-2"><span className="text-xs text-gray-400">curl 快速测试</span><button onClick={copyCurl} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"><Copy size={12}/> 复制命令</button></div><pre className="text-xs text-gray-300 overflow-x-auto"><code>{curlexample}</code></pre></div>
    </div>

    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-1"><BookOpen size={18} className="text-emerald-400" /> 快速使用说明</h2>
      <div className="divide-y divide-gray-800">
        {hasClaude && (<div className="py-3"><button onClick={()=>setShowClaudeCode(!showClaudeCode)} className="flex items-center justify-between w-full text-left py-1"><h3 className="flex items-center gap-2 text-sm font-medium text-gray-300"><Terminal size={14} className="text-orange-400"/> Claude Code 接入</h3>{showClaudeCode?<ChevronUp size={14} className="text-gray-500"/>:<ChevronDown size={14} className="text-gray-500"/>}</button>
          {showClaudeCode && (<div className="mt-3 space-y-2 text-sm text-gray-400"><p className="text-xs">配置环境变量后在本机使用 Claude Code。</p>
            <div><div className="flex items-center justify-between mb-1"><label className="text-xs text-gray-500">内置命令</label><button onClick={copyClaudeCodeConfig} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">{copiedCc?<Check size={12} className="text-green-400"/>:<Copy size={12}/>}{copiedCc?'已复制':'复制'}</button></div><pre className="text-xs text-gray-300 bg-gray-800/50 rounded-lg p-2 overflow-x-auto"><code>claude --set-env ANTHROPIC_BASE_URL={window.location.origin}/api{"\n"}claude --set-env ANTHROPIC_API_KEY={(profile.api_key||'').slice(0,12)}...</code></pre></div>
            <div><div className="flex items-center justify-between mb-1"><label className="text-xs text-gray-500">环境变量</label><button onClick={copyEnvVars} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">{copiedEnv?<Check size={12} className="text-green-400"/>:<Copy size={12}/>}{copiedEnv?'已复制':'复制'}</button></div><pre className="text-xs text-gray-300 bg-gray-800/50 rounded-lg p-2 overflow-x-auto"><code>export ANTHROPIC_BASE_URL={window.location.origin}/api{"\n"}export ANTHROPIC_API_KEY={(profile.api_key||'').slice(0,12)}...</code></pre></div>
          </div>)}
        </div>)}
        {hasClaude && (<div className="py-3"><button onClick={()=>setShowCcSwitch(!showCcSwitch)} className="flex items-center justify-between w-full text-left py-1"><h3 className="flex items-center gap-2 text-sm font-medium text-gray-300"><Terminal size={14} className="text-cyan-400"/> CC Switch 多工具配置</h3>{showCcSwitch?<ChevronUp size={14} className="text-gray-500"/>:<ChevronDown size={14} className="text-gray-500"/>}</button>
          {showCcSwitch && (<div className="mt-3 space-y-2 text-sm text-gray-400"><div><p className="text-xs text-gray-500 mb-1">安装</p><pre className="text-xs text-gray-300 bg-gray-800/50 rounded-lg p-2 overflow-x-auto"><code>npm install -g ccswitch</code></pre></div>
            <div><p className="text-xs text-gray-500 mb-1">创建配置</p><pre className="text-xs text-gray-300 bg-gray-800/50 rounded-lg p-2 overflow-x-auto"><code>ccswitch create ai-platform --env ANTHROPIC_BASE_URL={window.location.origin}/api --env ANTHROPIC_API_KEY={(profile?.api_key||'').slice(0,12)}...</code></pre></div>
            <div><p className="text-xs text-gray-500 mb-1">切换</p><pre className="text-xs text-gray-300 bg-gray-800/50 rounded-lg p-2 overflow-x-auto"><code>ccswitch use ai-platform</code></pre></div>
          </div>)}
        </div>)}
        <div className="py-3"><button onClick={()=>setShowMoonbridge(!showMoonbridge)} className="flex items-center justify-between w-full text-left py-1"><h3 className="flex items-center gap-2 text-sm font-medium text-gray-300"><Terminal size={14} className="text-indigo-400"/> Codex / MoonBridge 接入</h3>{showMoonbridge?<ChevronUp size={14} className="text-gray-500"/>:<ChevronDown size={14} className="text-gray-500"/>}</button>
          {showMoonbridge && (<div className="mt-3 space-y-2 text-sm text-gray-400"><p className="text-xs">使用 OpenAI 兼容接口调用平台模型。</p>
            <div><p className="text-xs text-gray-500 mb-1">环境变量</p><pre className="text-xs text-gray-300 bg-gray-800/50 rounded-lg p-2 overflow-x-auto"><code>export OPENAI_BASE_URL={window.location.origin}/api/v1{"\n"}export OPENAI_API_KEY={(profile?.api_key||'').slice(0,12)}...</code></pre></div>
            <div><p className="text-xs text-gray-500 mb-1">启动</p><pre className="text-xs text-gray-300 bg-gray-800/50 rounded-lg p-2 overflow-x-auto"><code>moonbridge --model deepseek-v4-flash</code></pre></div>
          </div>)}
        </div>
      </div>
    </div>

    <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden"><div className="p-4 border-b border-gray-800"><h2 className="flex items-center gap-2 text-lg font-semibold text-white"><Cpu size={18} className="text-purple-400"/> 可用模型</h2></div>
      <table className="w-full text-sm"><thead><tr className="border-b border-gray-800 text-gray-400 text-left"><th className="p-3 font-medium">模型名称</th><th className="p-3 font-medium">供应商</th><th className="p-3 font-medium">最大 T粒</th></tr></thead>
      <tbody>{models.map((m,i)=>(<tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/50"><td className="p-3"><span className="text-gray-100 font-mono text-xs">{m.model_name}</span>{m.display_name&&<span className="ml-2 text-gray-500 text-xs">{m.display_name}</span>}</td><td className="p-3"><span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-xs">{m.provider}</span></td><td className="p-3 text-gray-400 font-mono text-xs">{m.max_tokens.toLocaleString()}</td></tr>))}{models.length===0&&<tr><td colSpan={3} className="p-6 text-center text-gray-500">暂无可用的模型</td></tr>}</tbody></table>
    </div>

    <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden"><div className="p-4 border-b border-gray-800"><h2 className="flex items-center gap-2 text-lg font-semibold text-white"><Clock size={18} className="text-purple-400"/> 使用记录 <span className="text-sm text-gray-500 font-normal ml-2">最近 10 条</span></h2></div>
      <table className="w-full text-sm"><thead><tr className="border-b border-gray-800 text-gray-400 text-left"><th className="p-3 font-medium">时间</th><th className="p-3 font-medium">模型</th><th className="p-3 font-medium">T粒 消耗</th><th className="p-3 font-medium">状态</th></tr></thead>
      <tbody>{logs.items?.map((log:any)=>(<tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/50"><td className="p-3 text-gray-500 text-xs">{new Date(log.created_at).toLocaleString()}</td><td className="p-3 text-gray-300 font-mono text-xs">{log.model}</td><td className="p-3 text-gray-400 font-mono text-xs">{log.cost.toFixed(4)}<span className="text-gray-600 ml-1">(入:{log.prompt_tokens} 出:{log.completion_tokens})</span></td><td className="p-3"><span className={'px-2 py-0.5 rounded text-xs '+(log.success?'bg-green-900/50 text-green-400':'bg-red-900/50 text-red-400')}>{log.success?'成功':'失败'}</span></td></tr>))}{(!logs.items||logs.items.length===0)&&<tr><td colSpan={4} className="p-6 text-center text-gray-500">暂无使用记录</td></tr>}</tbody></table>
    </div>

    <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden"><div className="p-4 border-b border-gray-800"><h2 className="flex items-center gap-2 text-lg font-semibold text-white"><Wallet size={18} className="text-green-400"/> 充值记录 <span className="text-sm text-gray-500 font-normal ml-2">最近 10 条</span></h2></div>
      <table className="w-full text-sm"><thead><tr className="border-b border-gray-800 text-gray-400 text-left"><th className="p-3 font-medium">时间</th><th className="p-3 font-medium">T粒 数量</th><th className="p-3 font-medium">金额</th><th className="p-3 font-medium">备注</th></tr></thead>
      <tbody>{topups.items?.map((t:any)=>(<tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/50"><td className="p-3 text-gray-500 text-xs">{new Date(t.created_at).toLocaleString()}</td><td className="p-3 text-gray-300 font-mono text-xs">{t.amount.toFixed(2)}</td><td className="p-3 text-green-400 font-mono text-xs">&yen;{t.payment_amount?.toFixed(2)||'-'}</td><td className="p-3 text-gray-500 text-xs">{t.remark||'-'}</td></tr>))}{(!topups.items||topups.items.length===0)&&<tr><td colSpan={4} className="p-6 text-center text-gray-500">暂无充值记录</td></tr>}</tbody></table>
    </div>
  </div>)
}
