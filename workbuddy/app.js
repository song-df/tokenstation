const toast = document.querySelector('#toast')
const prompt = document.querySelector('#prompt')
const loginButton = document.querySelector('#oauth-login')
const userMenu = document.querySelector('#user-menu')
const userMenuTrigger = document.querySelector('#user-menu-trigger')
const userMenuName = document.querySelector('#user-menu-name')
let toastTimer

function showToast(message) {
  toast.textContent = message
  toast.classList.add('visible')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2600)
}

document.querySelectorAll('.mode').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.mode').forEach((item) => item.classList.remove('active'))
    button.classList.add('active')
    showToast(button.dataset.mode === 'code' ? '代码开发模式即将接入模型服务。' : '已切换到日常办公模式。')
  })
})

document.querySelectorAll('[data-task]').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.task) prompt.value = button.dataset.task
    prompt.focus()
  })
})

// ── 首页对话 ──
const chatLog = document.querySelector('#chat-log')
const modelSelect = document.querySelector('#model-select')
const sendButton = document.querySelector('.send-button')
// 与账号设置页生成的 models.json 保持一致的模型列表
const MODELS = [
  { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash' },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro' },
  { id: 'glm-5.2', name: 'GLM-5.2' },
  { id: 'z-ai/glm-5.1', name: 'GLM-5.1' },
  { id: 'z-ai/glm-5v-turbo', name: 'GLM-5v Turbo' },
  { id: 'kimi-k2.6', name: 'Kimi K2.6' },
  { id: 'moonshotai/kimi-k2.7-code', name: 'Kimi K2.7-Code' },
  { id: 'tencent/hy3-preview', name: 'Hy3 Preview' },
  { id: 'minimax-m3', name: 'MiniMax M3' },
]
modelSelect.replaceChildren(...MODELS.map((model) => {
  const option = document.createElement('option')
  option.value = model.id
  option.textContent = model.name
  return option
}))

let loggedIn = false
let chatKey = null
let sending = false
const history = []

async function authed(path, options = {}) {
  const response = await fetch(`/workbuddy-auth${path}`, { credentials: 'same-origin', ...options })
  if (response.status === 401) throw new Error('login')
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.detail || '操作失败')
  return body
}

async function ensureChatKey() {
  if (chatKey) return chatKey
  let keys = (await authed('/keys')).filter((key) => key.status === 1)
  if (!keys.length) {
    await authed('/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'WorBuddy' }),
    })
    keys = (await authed('/keys')).filter((key) => key.status === 1)
  }
  if (!keys.length) throw new Error('没有可用的 API Key')
  chatKey = (await authed(`/keys/${keys[0].id}/secret`, { method: 'POST' })).key
  return chatKey
}

function appendMessage(role, text) {
  const bubble = document.createElement('div')
  bubble.className = `chat-msg ${role}`
  bubble.textContent = text
  chatLog.appendChild(bubble)
  chatLog.scrollTop = chatLog.scrollHeight
  return bubble
}

// 过滤模型输出中的思考块（<think>/<mm:think>），包括流式中未闭合或缺失开标签的情况
function stripThink(text) {
  let out = text.replace(/<(?:mm:)?think>[\s\S]*?<\/(?:mm:)?think>/g, '')
  const parts = out.split(/<\/(?:mm:)?think>/)
  out = parts[parts.length - 1]
  return out.replace(/<(?:mm:)?think>[\s\S]*$/, '')
}

async function sendChat(text) {
  sending = true
  sendButton.disabled = true
  chatLog.hidden = false
  appendMessage('user', text)
  history.push({ role: 'user', content: text })
  const bubble = appendMessage('assistant', '思考中…')
  try {
    const key = await ensureChatKey()
    const response = await fetch('/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: modelSelect.value, messages: history, stream: true }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.error?.message || `请求失败（${response.status}）`)
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let content = ''
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (!data || data === '[DONE]') continue
        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content
          if (delta) {
            content += delta
            bubble.textContent = stripThink(content).trimStart() || '思考中…'
            chatLog.scrollTop = chatLog.scrollHeight
          }
        } catch { /* 忽略无法解析的分片 */ }
      }
    }
    const finalContent = stripThink(content).trim()
    if (!finalContent) throw new Error('模型没有返回内容')
    bubble.textContent = finalContent
    history.push({ role: 'assistant', content: finalContent })
  } catch (error) {
    history.pop()
    if (error.message === 'login') {
      bubble.remove()
      showToast('请先登录后再对话。')
    } else {
      bubble.textContent = `出错了：${error.message}`
    }
  } finally {
    sending = false
    sendButton.disabled = false
  }
}

document.querySelector('#prompt-form').addEventListener('submit', (event) => {
  event.preventDefault()
  const text = prompt.value.trim()
  if (!text || sending) return
  if (!loggedIn) {
    showToast('登录后即可使用我伙伴。')
    return
  }
  prompt.value = ''
  sendChat(text)
})

prompt.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    document.querySelector('#prompt-form').requestSubmit()
  }
})

function applySession(user) {
  loggedIn = true
  const displayName = user.display_name || user.username
  userMenuTrigger.textContent = displayName
  userMenuName.textContent = displayName
  userMenu.hidden = false
  loginButton.hidden = true
}

async function refreshSession() {
  try {
    const response = await fetch('/workbuddy-auth/me', { credentials: 'same-origin' })
    if (!response.ok) return
    applySession(await response.json())
  } catch {
    // Keep the anonymous state when the session service is not available.
  }
}

loginButton.addEventListener('click', (event) => {
  event.preventDefault()
  window.location.assign('/workbuddy-auth/login')
})

userMenuTrigger.addEventListener('click', () => {
  const expanded = userMenuTrigger.getAttribute('aria-expanded') === 'true'
  userMenuTrigger.setAttribute('aria-expanded', String(!expanded))
})

document.querySelectorAll('[data-user-action]').forEach((item) => {
  item.addEventListener('click', async () => {
    const action = item.dataset.userAction
    if (action === 'contact') {
      showToast('联系我们：请关注我伙伴客服渠道。')
      return
    }
    if (action !== 'logout') return
    try {
      const response = await fetch('/workbuddy-auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      })
      if (!response.ok) throw new Error('logout failed')
      loggedIn = false
      chatKey = null
      userMenu.hidden = true
      loginButton.hidden = false
      loginButton.href = '/workbuddy-auth/login'
      showToast('已退出登录。')
    } catch {
      showToast('退出登录失败，请稍后重试。')
    }
  })
})

refreshSession()
