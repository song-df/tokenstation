import { useState, FormEvent } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function Register() {
  const [searchParams] = useSearchParams()
  const ref = searchParams.get('ref') || ''
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setLoading(true)
    try {
      const res = await api.register({ username, email, password, referral_code: ref })
      setResult(res)
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const inputClass = "w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"

  if (result) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="w-96 p-6 rounded-xl bg-gray-900 border border-gray-800 space-y-4 text-center">
          <p className="text-green-400 text-lg">注册成功</p>
          <p className="text-gray-300">用户名: {result.username}</p>
          {result.quota > 0 && <p className="text-gray-300">初始T粒: {result.quota.toFixed(2)}</p>}
          <Link to="/login" className="block w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors">进入平台</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <form onSubmit={submit} className="w-96 p-6 rounded-xl bg-gray-900 border border-gray-800 space-y-4">
        <h1 className="text-xl font-semibold text-white text-center">注册账号</h1>
        {ref && <p className="text-xs text-center text-green-400">通过推荐链接注册，双方各得 100 T粒</p>}
        {err && <p className="text-sm text-red-400 text-center">{err}</p>}
        <input className={inputClass} type="email" placeholder="邮箱" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
        <input className={inputClass} placeholder="用户名" value={username} onChange={e => setUsername(e.target.value)} />
        <input className={inputClass} type="password" placeholder="密码" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit" disabled={loading} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors disabled:opacity-50">
          {loading ? '注册中...' : '注册'}
        </button>
        <p className="text-center text-xs text-gray-500">已有账号？ <Link to="/login" className="text-blue-400 hover:text-blue-300">登录</Link></p>
      </form>
    </div>
  )
}
