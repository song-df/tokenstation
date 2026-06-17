import { useEffect, useState, useRef } from 'react'
import { Loader, CheckCircle, XCircle, Clock, X } from 'lucide-react'
import { api } from '../lib/api'

interface Props {
  outTradeNo: string
  qrCode: string
  totalAmount: number
  subject: string
  onSuccess: () => void
  onCancel: () => void
}

export default function WechatQrCode({ outTradeNo, qrCode, totalAmount, subject, onSuccess, onCancel }: Props) {
  const [status, setStatus] = useState<'waiting' | 'success' | 'failed' | 'timeout'>('waiting')
  const [seconds, setSeconds] = useState(0)
  const polling = useRef<ReturnType<typeof setInterval> | null>(null)
  const count = useRef(0)

  useEffect(() => {
    // Start polling
    polling.current = setInterval(async () => {
      try {
        const data = await api.getWechatOrderStatus(outTradeNo)
        const s = data.trade_status

        if (s === 'SUCCESS') {
          setStatus('success')
          if (polling.current) clearInterval(polling.current)
          setTimeout(onSuccess, 1500)
          return
        }

        if (s === 'CLOSED' || s === 'PAYERROR') {
          setStatus('failed')
          if (polling.current) clearInterval(polling.current)
          return
        }

        count.current++
        setSeconds(count.current * 3)

        // Timeout after 5 minutes
        if (count.current > 100) {
          setStatus('timeout')
          if (polling.current) clearInterval(polling.current)
        }
      } catch {
        // continue polling on error
      }
    }, 3000)

    return () => {
      if (polling.current) clearInterval(polling.current)
    }
  }, [outTradeNo, onSuccess])

  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 text-center">
      {/* Status header */}
      {status === 'waiting' && (
        <>
          <h3 className="text-lg font-semibold text-white mb-2">微信扫码支付</h3>
          <p className="text-sm text-gray-400 mb-4">请使用微信扫描二维码完成支付</p>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle size={48} className="mx-auto text-green-400 mb-2" />
          <h3 className="text-lg font-semibold text-green-400 mb-1">支付成功！</h3>
          <p className="text-sm text-gray-400">{subject}</p>
        </>
      )}
      {status === 'failed' && (
        <>
          <XCircle size={48} className="mx-auto text-red-400 mb-2" />
          <h3 className="text-lg font-semibold text-red-400 mb-1">支付失败</h3>
          <p className="text-sm text-gray-400">订单已关闭，请重新下单</p>
        </>
      )}
      {status === 'timeout' && (
        <>
          <Clock size={48} className="mx-auto text-yellow-400 mb-2" />
          <h3 className="text-lg font-semibold text-yellow-400 mb-1">等待超时</h3>
          <p className="text-sm text-gray-400">请检查是否已完成支付，或重新下单</p>
        </>
      )}

      {/* QR Code */}
      {status === 'waiting' && (
        <div className="inline-block p-3 bg-white rounded-lg mb-3">
          <img src={qrCode} alt="微信支付二维码" className="w-56 h-56" />
        </div>
      )}

      {/* Order info */}
      <div className="flex justify-center gap-6 text-xs text-gray-500 mb-4">
        <span>¥{totalAmount.toFixed(2)}</span>
        <span>
          {status === 'waiting' && (
            <span className="flex items-center gap-1">
              <Loader size={12} className="animate-spin" />
              等待支付 {minutes > 0 ? `${minutes}分` : ''}{secs}秒
            </span>
          )}
        </span>
      </div>

      {/* Cancel button */}
      {status === 'waiting' && (
        <button
          onClick={onCancel}
          className="flex items-center justify-center gap-1 mx-auto px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm transition-colors"
        >
          <X size={14} /> 取消支付
        </button>
      )}

      {/* Retry / Close */}
      {(status === 'failed' || status === 'timeout') && (
        <button
          onClick={onCancel}
          className="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
        >
          返回
        </button>
      )}
    </div>
  )
}
