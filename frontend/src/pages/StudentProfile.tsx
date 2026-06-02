import { useEffect, useState, FormEvent } from 'react'
import { api, setToken } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { Key, Copy, Check, Share2, Ticket, User, Mail, Lock, LogOut } from 'lucide-react'

export default function StudentProfile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<any>(null)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedRef, setCopiedRef] = useState(false)
  const [redeemCode, setRedeemCode] = useState('')
  const [redeemMsg, setRedeemMsg] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  useEffect(() => {
    api.getStudentProfile().then(p => {
      setProfile(p)
      setDisplayName(p.display_name || '')
      setEmail(p.email || '')
    })
  }, [])

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault(); setMsg(''); setSaving(true)
    try {
      await api.updateProfile({ display_name: displayName, email, password: password || undefined })
      setMsg('保存成功'); setMsgType('success')
    } catch (e: any) { setMsg(e.message); setMsgType('error') }
    finally { setSaving(false) }
  }

  const copyKey = () => {
    navigator.clipboard.writeText(profile?.api_key || '')
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const copyRefLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/register?ref=${profile?.referral_code || ''}`)
    setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2000)
  }

  const doRedeem = async () => {
    if (!redeemCode.trim()) return
    setRedeeming(true); setRedeemMsg('')
    try {
      const res: any = await api.useRedeemCode(redeemCode.trim())
      setRedeemMsg(`兑换成功！+${res.amount.toLocaleString()} T粒`)
      setRedeemCode('')
      api.getStudentProfile().then(p => { setProfile(p); setDisplayName(p.display_name || ''); setEmail(p.email || '') })
    } catch (e: any) { setRedeemMsg(e.message) }
    finally { setRedeeming(false) }
  }

  if (!profile) return <div className="text-center text-gray-500 py-12">加载中...</div>

  const doLogout = () => { setToken(null); navigate('/login'); window.location.reload() }


  const inputClass = "w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold text-white">个人设置</h2>

      {/* Profile edit */}
      <form onSubmit={saveProfile} className="p-6 rounded-xl bg-gray-900 border border-gray-800 space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-medium text-gray-300">
          <User size={16} className="text-blue-400" /> 基本信息
        </h3>
        {msg && <p className={`text-sm ${msgType === 'success' ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">用户名</label>
            <input className={inputClass} value={profile.username} disabled />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">显示名称</label>
            <input className={inputClass} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={profile.username} />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-500 mb-1"><Mail size={12} /> 邮箱</label>
            <input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-500 mb-1"><Lock size={12} /> 新密码（留空不修改）</label>
            <input className={inputClass} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="留空则不修改密码" />
          </div>
        </div>
        <button type="submit" disabled={saving} className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors disabled:opacity-50">
          {saving ? '保存中...' : '保存'}
        </button>
      </form>

      {/* API Key */}
      <div className="p-6 rounded-xl bg-gray-900 border border-gray-800">
        <h3 className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
          <Key size={16} className="text-yellow-400" /> API Key
        </h3>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm font-mono truncate">
            {profile.api_key}
          </code>
          <button onClick={copyKey} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-green-400 shrink-0">
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* Referral */}
      <div className="p-6 rounded-xl bg-gray-900 border border-gray-800">
        <h3 className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
          <Share2 size={16} className="text-pink-400" /> 推荐有礼
        </h3>
        <p className="text-xs text-gray-500 mb-3">分享推荐链接，双方各得 100 T粒。好友充值你还能拿 10% 返利。</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-1.5 rounded bg-gray-800 text-xs text-gray-400 truncate">
            {window.location.origin}/register?ref={profile?.referral_code || '...'}
          </code>
          <button onClick={copyRefLink} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-pink-400 shrink-0">
            {copiedRef ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
        </div>
        {profile?.referral_count > 0 && (
          <p className="text-xs text-green-400 mt-2">已推荐 {profile.referral_count} 人</p>
        )}
      </div>

      {/* Redeem code */}
      <div className="p-6 rounded-xl bg-gray-900 border border-gray-800">
        <h3 className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
          <Ticket size={16} className="text-yellow-400" /> 兑换码
        </h3>
        <div className="flex items-center gap-2">
          <input
            className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500"
            placeholder="输入兑换码"
            value={redeemCode}
            onChange={e => setRedeemCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doRedeem()}
          />
          <button
            onClick={doRedeem}
            disabled={redeeming || !redeemCode.trim()}
            className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-sm disabled:opacity-50 transition-colors"
          >
            {redeeming ? '兑换中' : '兑换'}
          </button>
        </div>
        {redeemMsg && <p className={`text-xs mt-2 ${redeemMsg.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>{redeemMsg}</p>}
      </div>
      <button onClick={doLogout} className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-gray-800 hover:bg-red-900/30 border border-gray-700 hover:border-red-800 text-gray-500 hover:text-red-400 text-sm transition-colors mt-4"><LogOut size={14} />退出登录</button>
    </div>
  )
}
