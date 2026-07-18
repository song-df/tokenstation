const userName = document.querySelector('#account-user')
const keySelect = document.querySelector('#key-select')
const downloadButton = document.querySelector('#download-config')
const copyButton = document.querySelector('#copy-config')
const preview = document.querySelector('#config-preview')
const hint = document.querySelector('#config-hint')

const CONFIG_URL = 'https://t.wiselink.cc/v1'
// 模型清单参考 Buddy 官方配置，id 换成 t.wiselink.cc 可识别的模型 ID
const MODELS = [
  { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', maxInputTokens: 1000000 },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', maxInputTokens: 1000000 },
  { id: 'glm-5.2', name: 'GLM-5.2', maxInputTokens: 1000000 },
  { id: 'z-ai/glm-5.1', name: 'GLM-5.1', maxInputTokens: 200000 },
  { id: 'z-ai/glm-5v-turbo', name: 'GLM-5v Turbo', maxInputTokens: 200000 },
  { id: 'kimi-k2.6', name: 'Kimi K2.6', maxInputTokens: 256000 },
  { id: 'moonshotai/kimi-k2.7-code', name: 'Kimi K2.7-Code', maxInputTokens: 256000 },
  { id: 'tencent/hy3-preview', name: 'Hy3 Preview', maxInputTokens: 192000 },
  { id: 'minimax-m3', name: 'MiniMax M3', maxInputTokens: 512000 },
]

async function request(path, options = {}) {
  const response = await fetch(`/workbuddy-auth${path}`, { credentials: 'same-origin', ...options })
  if (response.status === 401) return window.location.replace('/')
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.detail || '操作失败')
  return body
}

function buildConfig(apiKey) {
  return JSON.stringify(MODELS.map((model) => ({
    id: model.id,
    name: '',
    vendor: 'Custom',
    url: CONFIG_URL,
    apiKey,
    maxInputTokens: model.maxInputTokens,
    maxOutputTokens: 8192,
    supportsToolCall: true,
    supportsImages: true,
    supportsReasoning: true,
    useCustomProtocol: false,
  })), null, 2)
}

async function generateConfig() {
  const keyId = keySelect.value
  if (!keyId) throw new Error('请先选择一个 API Key')
  const { key } = await request(`/keys/${keyId}/secret`, { method: 'POST' })
  const config = buildConfig(key)
  preview.hidden = false
  preview.textContent = config
  return config
}

const backupInput = document.querySelector('#backup-file')
const backupButton = document.querySelector('#backup-config')
const pickButton = document.querySelector('#pick-backup')
const backupName = document.querySelector('#backup-name')

let backupFile = null
function setBackupFile(file) {
  backupFile = file
  backupName.textContent = file ? `已选择：${file.name}` : ''
  backupButton.disabled = !file
}

pickButton.addEventListener('click', async () => {
  // showOpenFilePicker 的 id 会记住上次目录：首次定位到 ~/.workbuddy 后，之后每次直接打开该目录
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        id: 'workbuddy-config',
        types: [{ description: 'WorBuddy 配置', accept: { 'application/json': ['.json'] } }],
      })
      setBackupFile(await handle.getFile())
    } catch (error) { /* 用户取消 */ }
    return
  }
  backupInput.click()
})
backupInput.addEventListener('change', () => setBackupFile(backupInput.files[0] || null))

// 按操作系统展示对应的配置文件路径与直达提示
const isMac = /Mac/i.test(navigator.platform || navigator.userAgent)
const CONFIG_PATH = isMac ? '~/.workbuddy/models.json' : '%USERPROFILE%\\.workbuddy\\models.json'
document.querySelector('#config-path').textContent = CONFIG_PATH
document.querySelector('#path-tip').textContent = isMac
  ? '—— 选择窗口中按 Cmd+Shift+G 粘贴路径可直达（隐藏目录可按 Cmd+Shift+. 显示）；选过一次后，下次会自动打开该目录。'
  : '—— 选择窗口的「文件名」输入框中粘贴路径后回车可直达；选过一次后，下次会自动打开该目录。'

document.querySelector('#copy-path').addEventListener('click', async (event) => {
  await navigator.clipboard.writeText(CONFIG_PATH)
  event.target.textContent = '已复制'
  setTimeout(() => { event.target.textContent = '复制路径' }, 2000)
})

backupButton.addEventListener('click', () => {
  if (!backupFile) return alert('请先选择本机原有的 models.json 文件')
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const name = `models-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}.json`
  const link = document.createElement('a')
  link.href = URL.createObjectURL(backupFile)
  link.download = name
  link.click()
  URL.revokeObjectURL(link.href)
  hint.textContent = `已备份为 ${name}，可继续下载新配置文件。`
})

downloadButton.addEventListener('click', async () => {
  try {
    const config = await generateConfig()
    const blob = new Blob([config], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'models.json'
    link.click()
    URL.revokeObjectURL(link.href)
    hint.textContent = `已下载 models.json，请替换 WorBuddy 配置目录中的原文件（${CONFIG_PATH}），然后退出 WorBuddy 并重新打开，新配置才会生效。`
  } catch (error) { alert(error.message) }
})

copyButton.addEventListener('click', async () => {
  try {
    const config = await generateConfig()
    await navigator.clipboard.writeText(config)
    copyButton.textContent = '已复制'
    setTimeout(() => { copyButton.textContent = '复制内容' }, 2000)
  } catch (error) { alert(error.message) }
})

function setOptions(options) {
  keySelect.replaceChildren(...options.map(({ value, label }) => {
    const option = document.createElement('option')
    option.value = value
    option.textContent = label
    return option
  }))
}

async function loadKeys() {
  let keys = (await request('/keys')).filter((key) => key.status === 1)
  if (!keys.length) {
    // 没有可用 Key 时自动创建一个专用 Key
    setOptions([{ value: '', label: '正在为您创建 API Key…' }])
    await request('/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'WorBuddy' }),
    })
    keys = (await request('/keys')).filter((key) => key.status === 1)
  }
  if (!keys.length) {
    setOptions([{ value: '', label: '暂无可用的 API Key' }])
    return
  }
  setOptions(keys.map((key) => ({ value: key.id, label: `${key.name}（${key.key}）` })))
  downloadButton.disabled = false
  copyButton.disabled = false
}

Promise.all([request('/me'), loadKeys()])
  .then(([user]) => { userName.textContent = user.display_name || user.username })
  .catch((error) => { setOptions([{ value: '', label: error.message }]) })
