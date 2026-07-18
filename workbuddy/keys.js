const userName = document.querySelector('#account-user')
const list = document.querySelector('#key-list')
const dialog = document.querySelector('#key-dialog')
const form = document.querySelector('#key-form')
const nameInput = document.querySelector('#key-name')
const newKey = document.querySelector('#new-key')
const formatTime = (time) => time ? new Date(time * 1000).toLocaleString('zh-CN', { hour12: false }) : '从未使用'
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))

async function request(path, options = {}) {
  const response = await fetch(`/workbuddy-auth${path}`, { credentials: 'same-origin', ...options })
  if (response.status === 401) return window.location.replace('/')
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.detail || '操作失败')
  return body
}
function showNewKey(key) { newKey.hidden = false; newKey.innerHTML = `<strong>请立即保存 API Key</strong><code>${key}</code><button type="button">复制</button>`; newKey.querySelector('button').addEventListener('click', async () => { await navigator.clipboard.writeText(key); newKey.querySelector('button').textContent = '已复制' }) }
async function reveal(id) { const result = await request(`/keys/${id}/secret`, { method: 'POST' }); showNewKey(result.key) }
function render(keys) {
  list.replaceChildren(...keys.map((key) => { const card = document.createElement('article'); card.className = 'key-card'; const status = key.status === 1; card.innerHTML = `<div class="key-card-head"><div><h2>${escapeHtml(key.name)}</h2><span class="key-status ${status ? 'enabled' : 'disabled'}">${status ? '启用' : '已停用'}</span></div><div class="key-actions"><button data-action="reveal">显示</button><button data-action="toggle">${status ? '停用' : '启用'}</button><button class="danger" data-action="delete">删除</button></div></div><code>${escapeHtml(key.key)}</code><p>已用 ${key.used_points} 积分 · 剩余 ${key.remain_points} 积分 · 最后使用：${formatTime(key.accessed_time)}</p>`; card.querySelector('[data-action="reveal"]').addEventListener('click', () => reveal(key.id).catch((error) => alert(error.message))); card.querySelector('[data-action="toggle"]').addEventListener('click', () => request(`/keys/${key.id}/toggle`, { method: 'POST' }).then(loadKeys).catch((error) => alert(error.message))); card.querySelector('[data-action="delete"]').addEventListener('click', () => { if (window.confirm(`确定删除「${key.name}」吗？此操作不可恢复。`)) request(`/keys/${key.id}`, { method: 'DELETE' }).then(loadKeys).catch((error) => alert(error.message)) }); return card }))
}
async function loadKeys() { const keys = await request('/keys'); render(keys); if (!keys.length) list.innerHTML = '<p class="empty">还没有 API Key，点击右上角创建一个吧。</p>' }
document.querySelector('#create-key').addEventListener('click', () => dialog.showModal())
document.querySelector('#cancel-key').addEventListener('click', () => dialog.close())
form.addEventListener('submit', async (event) => { event.preventDefault(); try { const key = await request('/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nameInput.value }) }); dialog.close(); nameInput.value = ''; showNewKey(key.key); loadKeys() } catch (error) { alert(error.message) } })
Promise.all([request('/me'), loadKeys()]).then(([user]) => { userName.textContent = user.display_name || user.username }).catch((error) => { list.innerHTML = `<p class="empty">${error.message}</p>` })
