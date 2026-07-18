const userElement = document.querySelector('#account-user')
const balanceElement = document.querySelector('#balance')
const usedElement = document.querySelector('#used')
const requestsElement = document.querySelector('#requests')
const updatedElement = document.querySelector('#updated-at')
const recordsSection = document.querySelector('#recharge-records')
const formatNumber = (value) => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)
const STATUS_MAP = { TRADE_SUCCESS: '已付款', WAIT_BUYER_PAY: '待支付', TRADE_CLOSED: '已关闭', TRADE_FINISHED: '已完成' }

async function loadAccount() {
  const [userResponse, usageResponse] = await Promise.all([fetch('/workbuddy-auth/me', { credentials: 'same-origin' }), fetch('/workbuddy-auth/usage', { credentials: 'same-origin' })])
  if (userResponse.status === 401 || usageResponse.status === 401) return window.location.replace('/')
  if (!userResponse.ok || !usageResponse.ok) throw new Error('usage unavailable')
  const [user, usage] = await Promise.all([userResponse.json(), usageResponse.json()])
  userElement.textContent = user.display_name || user.username
  balanceElement.textContent = formatNumber(usage.balance_points)
  usedElement.textContent = formatNumber(usage.used_points)
  requestsElement.textContent = formatNumber(usage.request_count)
  updatedElement.textContent = `更新于 ${new Date().toLocaleString('zh-CN', { hour12: false })}`
}

async function loadRecords() {
  try {
    const response = await fetch('/workbuddy-auth/purchase/orders', { credentials: 'same-origin' })
    if (!response.ok) throw new Error('unavailable')
    const orders = await response.json()
    if (!orders.length) { recordsSection.textContent = '暂无充值记录。'; return }
    recordsSection.innerHTML = orders.map((o) => {
      let action = `${STATUS_MAP[o.trade_status] || o.trade_status}`
      if (o.trade_status === 'WAIT_BUYER_PAY') {
        action = `<button class="repay-button" data-order="${o.out_trade_no}">去支付</button>`
      }
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #eee"><span>${o.subject.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))} · <strong>${o.tli_amount}</strong> 积分 · <span style="color:#999">¥${o.total_amount}</span></span>${action}</div>`
    }).join('')
    // 绑定支付按钮
    recordsSection.querySelectorAll('.repay-button').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true
        btn.textContent = '正在生成…'
        try {
          const response = await fetch(`/workbuddy-auth/purchase/orders/${btn.dataset.order}/repay`, { method: 'POST', credentials: 'same-origin' })
          if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.detail || '无法生成支付链接') }
          window.location.assign((await response.json()).pay_url)
        } catch (error) { alert(error.message); btn.disabled = false; btn.textContent = '去支付' }
      })
    })
  } catch { recordsSection.textContent = '暂时无法获取充值记录。' }
}

loadAccount().catch(() => { updatedElement.textContent = '暂时无法获取积分用量，请稍后刷新。' })
loadRecords()
