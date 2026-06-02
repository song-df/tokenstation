import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { MessageCircle, X, Send } from 'lucide-react'

export default function FloatingMessage() {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.getMyMessages().then((msgs: any[]) => {
      const unreplied = msgs.filter((m: any) => !m.reply).length
      setUnread(unreplied)
    })
  }, [])

  useEffect(() => {
    if (open) {
      api.getMyMessages().then((msgs: any[]) => {
        setMessages(msgs)
        setUnread(0)
      })
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!content.trim()) return
    setSending(true); setStatus('')
    try {
      await api.sendMessage(content.trim())
      setContent('')
      api.getMyMessages().then(setMessages)
    } catch (e: any) { setStatus(e.message) }
    finally { setSending(false) }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 w-80 rounded-xl bg-gray-900 border border-gray-800 shadow-2xl overflow-hidden flex flex-col" style={{ height: '420px' }}>
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800/50 border-b border-gray-800 shrink-0">
            <span className="text-sm font-medium text-gray-200">客服留言</span>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.slice().reverse().map(m => (
              <div key={m.id} className="space-y-2">
                <div className="flex justify-end">
                  <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-br-md bg-blue-600 text-white text-sm">
                    {m.content}
                    <div className="text-xs text-blue-300 mt-0.5">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                </div>
                {m.reply && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-bl-md bg-gray-700 text-gray-200 text-sm">
                      {m.reply}
                      <div className="text-xs text-gray-500 mt-0.5">{new Date(m.replied_at).toLocaleString()}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">欢迎留言，我们会尽快回复</div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="p-3 border-t border-gray-800 shrink-0">
            {status && <p className={'text-xs mb-2 ' + (status.includes('已发送') ? 'text-green-400' : 'text-red-400')}>{status}</p>}
            <div className="flex items-center gap-2">
              <input
                className="flex-1 px-3 py-2 rounded-full bg-gray-800 border border-gray-700 text-gray-100 text-sm focus:outline-none focus:border-blue-500"
                placeholder="输入留言..."
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
              />
              <button onClick={send} disabled={sending || !content.trim()} className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(!open)} className="relative flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all hover:scale-105">
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && unread > 0 && <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">{unread > 99 ? "99+" : unread}</span>}
      </button>
    </div>
  )
}
