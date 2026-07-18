const packagesElement = document.querySelector('#packages')
const format = (value) => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)

async function purchase(packageId, button) {
  button.disabled = true
  button.textContent = '正在创建订单…'
  try {
    const response = await fetch('/workbuddy-auth/purchase/orders', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ package_id: packageId }) })
    if (response.status === 401) return window.location.replace('/')
    if (!response.ok) throw new Error('create order failed')
    window.location.assign((await response.json()).pay_url)
  } catch {
    button.disabled = false
    button.textContent = '立即购买'
    window.alert('暂时无法创建订单，请稍后重试。')
  }
}

async function loadPackages() {
  const response = await fetch('/workbuddy-auth/purchase/packages', { credentials: 'same-origin' })
  if (response.status === 401) return window.location.replace('/')
  if (!response.ok) throw new Error('packages unavailable')
  const packages = await response.json()
  packagesElement.replaceChildren(...packages.map((item) => {
    const card = document.createElement('article')
    card.className = 'package'
    const amount = document.createElement('h2')
    amount.textContent = `${format(item.points)} 积分`
    const name = document.createElement('p')
    name.textContent = item.name
    const price = document.createElement('strong')
    price.textContent = `¥ ${format(item.price_yuan)}`
    const button = document.createElement('button')
    button.type = 'button'; button.textContent = '立即购买'
    button.addEventListener('click', () => purchase(item.id, button))
    card.append(amount, name, price, button)
    return card
  }))
}
loadPackages().catch(() => { packagesElement.innerHTML = '<p class="error">积分包暂时无法加载，请稍后刷新。</p>' })
