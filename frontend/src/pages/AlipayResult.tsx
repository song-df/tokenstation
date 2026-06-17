import { useEffect, useState, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Clock, Loader, ArrowLeft, Home } from 'lucide-react'
import { api } from '../lib/api'

export default function AlipayResult() {
  const [searchParams] = useSearchParams()
  const outTradeNo = searchParams.get('out_trade_no') || ''

  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading')
  const [order, setOrder] = useState<any>(null)
  const [error, setError] = useState('')
  const pollCount = useRef(0)
  const maxPolls = 10  // 10 * 3s = 30s max polling

  useEffect(() => {
    if (!outTradeNo) {
      setStatus('failed')
      setError('缺少订单号')
      return
    }

    let cancelled = false

    const checkStatus = async () => {
      try {
        const data = await api.getAlipayOrderStatus(outTradeNo)
        if (cancelled) return

        setOrder(data)

        if (data.trade_status === 'TRADE_SUCCESS' || data.trade_status === 'TRADE_FINISHED') {
          setStatus('success')
          return
        }

        if (data.trade_status === 'TRADE_CLOSED') {
          setStatus('failed')
          setError('订单已关闭')
          return
        }

        // Still waiting — poll if under limit
        pollCount.current++
        if (pollCount.current < maxPolls) {
          setTimeout(checkStatus, 3000)
        } else {
          setStatus('pending')
        }
      } catch (e: any) {
        if (!cancelled) {
          setStatus('failed')
          setError(e.message || '查询订单状态失败')
        }
      }
    }

    checkStatus()

    return () => { cancelled = true }
  }, [outTradeNo])

  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-8 text-center">
        {/* Icon */}
        {status === 'loading' && (
          <Loader size={48} className="mx-auto text-yellow-400 animate-spin" />
        )}
        {status === 'success' && (
          <CheckCircle size={48} className="mx-auto text-green-400" />
        )}
        {status === 'failed' && (
          <XCircle size={48} className="mx-auto text-red-400" />
        )}
        {status === 'pending' && (
          <Clock size={48} className="mx-auto text-yellow-400" />
        )}

        {/* Title */}
        <h2 className="mt-4 text-xl font-semibold text-white">
          {status === 'loading' && '正在查询支付结果...'}
          {status === 'success' && '支付成功！'}
          {status === 'failed' && '支付未完成'}
          {status === 'pending' && '支付处理中'}
        </h2>

        {/* Message */}
        <p className="mt-2 text-sm text-gray-400">
          {status === 'loading' && '请稍候，正在确认支付状态'}
          {status === 'success' && order && `${order.tli_amount.toLocaleString()} T粒已到账`}
          {status === 'failed' && (error || '支付未成功，请重试')}
          {status === 'pending' && '支付结果确认中，T粒将在到账后自动充值到您的账户。您也可以稍后查看订单状态'}
        </p>

        {/* Order info */}
        {order && (
          <div className="mt-4 p-3 rounded-lg bg-gray-800 border border-gray-700 text-left">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">订单号</span>
              <span className="text-gray-300 font-mono">{order.out_trade_no}</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">套餐</span>
              <span className="text-gray-300">{order.subject}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">金额</span>
              <span className="text-orange-400">&yen;{order.total_amount?.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors"
          >
            <Home size={16} /> 返回首页
          </Link>
          <Link
            to="/purchase"
            className="flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
          >
            <ArrowLeft size={16} /> 返回充值
          </Link>
        </div>
      </div>
    </div>
  )
}
