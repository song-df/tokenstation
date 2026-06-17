import { useEffect, useState, useRef } from 'react'
import { api } from '../lib/api'
import { Send, MessageCircle, ChevronLeft } from 'lucide-react'

export default function Messages() {
  const [messages, setMessages] = useState<any[]>([])
  const [activeUser, setActiveUser] = useState<any>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { const load = () => api.getMessages().then(setMessages); load(); const timer = setInterval(load, 60000); return () => clearInterval(timer) }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeUser])

  // Group by user_id
  const grouped: Record<number, any> = {}
  messages.forEach(m => {
    if (!grouped[m.user_id]) {
      grouped[m.user_id] = { user_id: m.user_id, display_name: m.display_name, username: m.username, messages: [], lastTime: m.created_at, unread: 0 }
    }
    grouped[m.user_id].messages.push(m)
    if (!m.reply) grouped[m.user_id].unread++
    if (m.created_at > grouped[m.user_id].lastTime) grouped[m.user_id].lastTime = m.created_at
  })
  const users = Object.values(grouped).sort((a: any, b: any) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime())

  const doReply = async () => {
    if (!activeUser || !reply.trim()) return
    setSending(true)
    const latest = activeUser.messages[activeUser.messages.length - 1]
    try {
      await api.replyMessage(latest.id, reply.trim())
      setReply('')
      api.getMessages().then(msgs => {
        setMessages(msgs)
        // Refresh active conversation
        const updated = msgs.filter((m: any) => m.user_id === activeUser.user_id)
        setActiveUser({ ...activeUser, messages: updated })
      })
      setStatus('回复成功')
      setTimeout(() => setStatus(''), 2000)
    } finally { setSending(false) }
  }

  if (activeUser) {
    return (
      <div className="flex flex-col h-[calc(100vh-6rem)]">
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <button onClick={() => { setActiveUser(null); api.getMessages().then(setMessages) }} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400"><ChevronLeft size={20} /></button>
          <h2 className="text-xl font-semibold text-white">{activeUser.display_name}</h2>
          <span className="text-xs text-gray-600">{activeUser.username}</span>
        </div>
        <div className="flex-1 overflow-y-auto rounded-xl bg-gray-900 border border-gray-800 p-4 space-y-3">
          {activeUser.messages.map((m: any) => (
            <div key={m.id} className="space-y-2">
              <div className="flex justify-end">
                <div className="max-w-[70%] px-4 py-2.5 rounded-2xl rounded-br-md bg-blue-600/30 border border-blue-800/30">
                  <p className="text-sm text-gray-200">{m.content}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(m.created_at).toLocaleString()}</p>
                </div>
              </div>
              {m.reply && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] px-4 py-2.5 rounded-2xl rounded-bl-md bg-green-900/20 border border-green-800/30">
                    <p className="text-sm text-green-200">{m.reply}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(m.replied_at).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="mt-3 shrink-0">
          {status && <p className="text-xs text-green-400 mb-2">{status}</p>}
          <div className="flex items-center gap-2">
            <input className="flex-1 px-4 py-2.5 rounded-full bg-gray-900 border border-gray-700 text-gray-100 text-sm focus:outline-none focus:border-green-500" value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && doReply()} placeholder="输入回复..." autoFocus />
            <button onClick={doReply} disabled={sending || !reply.trim()} className="p-2.5 rounded-full bg-green-600 hover:bg-green-500 text-white disabled:opacity-50 transition-colors"><Send size={18} /></button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">用户留言</h2>
      <div className="space-y-2">
        {users.map((u: any) => (
          <button key={u.user_id} onClick={() => setActiveUser(u)} className="w-full text-left p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <span className="text-blue-400 text-sm font-medium">{(u.display_name || u.username)[0]}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-200">{u.display_name}</span>
                    {u.unread > 0 && <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs">{u.unread}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{u.messages[u.messages.length - 1]?.content?.slice(0, 40)}</p>
                </div>
              </div>
              <span className="text-xs text-gray-600">{new Date(u.lastTime).toLocaleString()}</span>
            </div>
          </button>
        ))}
        {users.length === 0 && <div className="text-center py-12 text-gray-500"><MessageCircle size={32} className="mx-auto mb-2 opacity-30" /><p>暂无留言</p></div>}
      </div>
    </div>
  )
}
