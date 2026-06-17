import { useEffect, useState, FormEvent } from 'react'
import { api, setToken } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Lock, LogOut } from 'lucide-react'

export default function StudentProfile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<any>(null)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')
  const [saving, setSaving] = useState(false)

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
      if (!currentPassword) throw new Error('请输入当前密码以验证身份')

      // 只提交变更的字段
      const body: any = { original_password: currentPassword }
      if (displayName !== (profile.display_name || '')) body.display_name = displayName
      if (email !== (profile.email || '')) body.email = email

      const changingPassword = !!(newPassword || confirmPassword)
      if (changingPassword) {
        if (!newPassword) throw new Error('请输入新密码')
        if (newPassword.length < 6) throw new Error('新密码至少需要 6 个字符')
        if (newPassword !== confirmPassword) throw new Error('两次输入的新密码不一致')
        body.password = newPassword
      }

      // 如果没有字段变更且没有改密码
      if (!body.display_name && !body.email && !changingPassword) {
        throw new Error('没有需要保存的修改')
      }

      await api.updateProfile(body)
      // 密码修改成功后清空所有密码字段
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMsg('保存成功'); setMsgType('success')
    } catch (e: any) { setMsg(e.message); setMsgType('error') }
    finally { setSaving(false) }
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
            <label className="flex items-center gap-1 text-xs text-gray-500 mb-1"><Lock size={12} /> 当前密码</label>
            <input className={inputClass} type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="验证身份，必填" />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-500 mb-1"><Lock size={12} /> 新密码</label>
            <input className={inputClass} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="留空则不修改密码" />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-500 mb-1"><Lock size={12} /> 确认新密码</label>
            <input className={inputClass} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="请再次输入新密码" />
          </div>
        </div>
        <button type="submit" disabled={saving} className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors disabled:opacity-50">
          {saving ? '保存中...' : '保存'}
        </button>
      </form>

      <button onClick={doLogout} className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-gray-800 hover:bg-red-900/30 border border-gray-700 hover:border-red-800 text-gray-500 hover:text-red-400 text-sm transition-colors mt-4"><LogOut size={14} />退出登录</button>
    </div>
  )
}
