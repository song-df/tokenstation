import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Log { id: number; _username: string; model: string; prompt_tokens: number; completion_tokens: number; cost: number; success: boolean; error_message: string; created_at: string }

export default function Logs() {
  const [data, setData] = useState<{ total: number; items: Log[] }>({ total: 0, items: [] })
  const [page, setPage] = useState(1)
  const pageSize = 50

  useEffect(() => { api.getLogs(page, pageSize).then(setData) }, [page])

  const totalPages = Math.ceil(data.total / pageSize)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">请求日志</h2>
        <span className="text-sm text-gray-500">共 {data.total} 条</span>
      </div>

      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800 text-gray-400 text-left">
            <th className="p-3 font-medium">时间</th><th className="p-3 font-medium">用户</th><th className="p-3 font-medium">模型</th><th className="p-3 font-medium">T粒</th><th className="p-3 font-medium">消耗</th><th className="p-3 font-medium">状态</th>
          </tr></thead>
          <tbody>
            {data.items.map(log => (
              <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                <td className="p-3 text-gray-500 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                <td className="p-3 text-gray-100">{log._username}</td>
                <td className="p-3 text-gray-300 font-mono text-xs">{log.model}</td>
                <td className="p-3 text-gray-400 font-mono text-xs">入:{log.prompt_tokens} 出:{log.completion_tokens}</td>
                <td className="p-3 text-gray-300 font-mono text-xs">{log.cost.toLocaleString()}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${log.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                    {log.success ? '成功' : '失败'}
                  </span>
                  {log.error_message && <span className="ml-2 text-red-400 text-xs" title={log.error_message}>!</span>}
                </td>
              </tr>
            ))}
            {data.items.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-500">暂无请求记录</td></tr>}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30"><ChevronLeft size={16} /></button>
          <span className="text-sm text-gray-400">第 {page} / {totalPages} 页</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  )
}
