const title = document.querySelector('#title')
const detail = document.querySelector('#detail')
const orderNumber = new URLSearchParams(window.location.search).get('out_trade_no')
let attempts = 0
async function checkPayment() {
  if (!orderNumber) { title.textContent = '未找到订单'; detail.textContent = '请返回个人中心后重新发起充值。'; return }
  const response = await fetch(`/workbuddy-auth/purchase/orders/${encodeURIComponent(orderNumber)}`, { credentials: 'same-origin' })
  if (response.status === 401) return window.location.replace('/')
  if (!response.ok) throw new Error('order unavailable')
  const order = await response.json()
  if (['TRADE_SUCCESS', 'TRADE_FINISHED'].includes(order.trade_status)) { title.textContent = '充值成功'; detail.textContent = `${order.points} 积分已到账，正在同步到你的账户。`; return }
  attempts += 1
  if (attempts >= 12) { title.textContent = '正在等待支付结果'; detail.textContent = '如已完成支付，请稍后在个人中心刷新积分余额。'; return }
  window.setTimeout(() => checkPayment().catch(() => { detail.textContent = '暂时无法确认订单状态，请稍后刷新。' }), 2500)
}
checkPayment().catch(() => { title.textContent = '暂时无法确认订单'; detail.textContent = '请稍后刷新，或返回个人中心查看积分余额。' })
