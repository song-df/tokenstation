import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, setToken } from '../lib/api'
import PublicLayout from '../components/PublicLayout'

export default function Login({ onLogin }: { onLogin: (u: any) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.login(username, password)
      setToken(res.access_token)
      onLogin(res.user)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicLayout>
      <main className="flex min-h-[calc(100vh-145px)] items-center justify-center px-6 py-14">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-7 shadow-2xl shadow-black/20">
        <img src="/logo.png" alt="logo" className="w-16 h-16 mx-auto rounded-xl mb-2" /><h1 className="text-xl font-semibold text-white text-center">T粒加油站</h1>
        <p className="text-sm text-gray-500 text-center">登录学生服务平台</p>
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        <input
          className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
          placeholder="用户名"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
          placeholder="密码"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button
          disabled={loading}
          className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? '登录中...' : '登 录'}
        </button>
        <p className="text-center text-xs text-gray-500 mt-3">
          没有账号？ <Link to="/register" className="text-blue-400 hover:text-blue-300">注册</Link>
        </p>
      </form>
      </main>
    </PublicLayout>
  )
}
