import { useState } from 'react'
import { Copy, Check, Terminal, Cpu, AlertTriangle, Download, Wrench, Play, Settings } from 'lucide-react'

export default function CodexGuide() {
  const [copied, setCopied] = useState<Record<string, boolean>>({})

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied({ ...copied, [id]: true })
    setTimeout(() => setCopied({ ...copied, [id]: false }), 2000)
  }

  const CodeBlock = ({ id, code, lang }: { id: string; code: string; lang: string }) => (
    <div className="relative group rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-800">
        <span className="text-xs text-gray-500 font-mono">{lang}</span>
        <button onClick={() => copy(id, code)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-400 transition-colors">
          {copied[id] ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          {copied[id] ? '已复制' : '复制'}
        </button>
      </div>
      <pre className="p-4 text-sm text-gray-300 overflow-x-auto font-mono leading-relaxed"><code>{code}</code></pre>
    </div>
  )

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ai.aiotedu.cc'

  const moonbridgeConfig = `# yaml-language-server: $schema=./config.schema.json
mode: "Transform"

log:
  level: "info"
  format: "text"

server:
  addr: "127.0.0.1:38440"

persistence:
  active_provider: db_sqlite

extensions:
  deepseek_v4:
    config:
      reinforce_instructions: true
      reinforce_prompt: "[System Reminder]: Please pay close attention to the system instructions, AGENTS.md files, and any other context provided. Follow them carefully and completely in your response.\\n[User]:"
  kimi_workaround:
    config:
      max_tool_rounds: 50
      convergence_margin: 0.8
  db_sqlite:
    enabled: true
    config:
      path: ./data/moonbridge.db
      wal: true
      busy_timeout_ms: 5000
      max_open_conns: 1
  metrics:
    enabled: true
    config:
      default_limit: 100
      max_limit: 1000

cache:
  mode: "explicit"
  ttl: "5m"
  prompt_caching: true
  automatic_prompt_cache: false
  explicit_cache_breakpoints: true
  allow_retention_downgrade: false
  max_breakpoints: 4
  min_cache_tokens: 1024
  expected_reuse: 2
  minimum_value_score: 2048
  min_breakpoint_tokens: 1024

defaults:
  model: "moonbridge"
  max_tokens: 65536

trace:
  enabled: false

providers:
  default:
    base_url = "${origin}"
    api_key = "sk-你的APIKey"
    version: "2023-06-01"
    user_agent: "moonbridge/1.0"
    web_search:
      support: "auto"
    offers:
      - model: deepseek-v4-pro
        pricing:
          input_price: 2
          output_price: 8
          cache_write_price: 1
          cache_read_price: 0.2
      - model: deepseek-v4-flash
        pricing:
          input_price: 1
          output_price: 2
          cache_write_price: 1
          cache_read_price: 0.02
      - model: claude-sonnet-4-6
        pricing:
          input_price: 3
          output_price: 15
          cache_write_price: 3.75
          cache_read_price: 0.30

routes:
  moonbridge:
    model: deepseek-v4-pro
    provider: default`

  const codexConfig = `model = "moonbridge"
model_provider = "moonbridge"
model_context_window = 1000000
model_max_output_tokens = 384000
model_catalog_json = "C:\\\\Users\\\\<用户名>\\\\.codex\\\\models_catalog.json"

[model_providers.moonbridge]
name = "Moon Bridge"
base_url = "http://127.0.0.1:38440/v1"
wire_api = "responses"`

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal size={24} className="text-blue-400" />
            <span className="text-lg font-semibold">T粒加油站</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/guide" className="text-gray-400 hover:text-gray-200 transition-colors">← 使用说明</a>
            <a href="/register" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">注册使用</a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        {/* ── Title ── */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Windows 从零安装 Codex
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Codex CLI + Moon Bridge 中转方案 · 国内直连 · 免翻墙免信用卡
          </p>
        </section>

        {/* ── 一、安装 nvm 和 Node.js ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Download size={24} className="text-blue-400" /> 一、安装 nvm 和 Node.js
          </h2>
          <p className="text-gray-400">打开 PowerShell，执行以下命令安装 nvm：</p>
          <CodeBlock id="nvm1" lang="PowerShell" code={`winget install CoreyButler.NVMforWindows
nvm version
nvm install 24.14.1
nvm list
node -v`} />

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200/90 space-y-1.5">
            <p>⚠️ 如果 <code className="font-mono">npm --version</code> 报权限错误，以<b>管理员身份</b>打开 PowerShell 执行：</p>
            <CodeBlock id="nvm2" lang="PowerShell (管理员)" code={`Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`} />
            <p>输入 <b>Y</b> 确认，关掉终端重新打开即可正常使用 npm。</p>
          </div>
        </section>

        {/* ── 二、下载安装 Codex ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Download size={24} className="text-green-400" /> 二、下载并安装 Codex
          </h2>
          <p className="text-gray-400">
            访问 <a href="https://developers.openai.com/codex/quickstart" target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 underline">OpenAI Codex 快速开始</a>，下载 Windows 版安装包 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-xs">Codex Installer.exe</code>，双击安装。
          </p>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200/90 space-y-2">
            <p className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-400 shrink-0" /> <b>安装过程中如报错</b></p>
            <p>先备份再删除损坏的数据库：</p>
            <CodeBlock id="codex-fix" lang="PowerShell" code={`# 备份（以防万一）
Copy-Item -Path "$env:USERPROFILE\\.codex" -Destination "$env:USERPROFILE\\.codex.backup" -Recurse

# 删除损坏的数据库
Remove-Item -Path "$env:USERPROFILE\\.codex" -Recurse -Force`} />
            <p>然后重新运行安装程序。</p>
          </div>
        </section>

        {/* ── 三、配置 Moon Bridge ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Settings size={24} className="text-purple-400" /> 三、配置 Moon Bridge（中转）
          </h2>
          <p className="text-gray-400">
            Moon Bridge 负责将 Codex 的 Anthropic 格式请求转发到 T粒加油站。需要先安装 Go 语言环境。
          </p>

          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs">1</span>
            安装 Go
          </h3>
          <CodeBlock id="go1" lang="PowerShell" code={`winget install GoLang.Go
go version

# 查看 Go 环境路径
go env GOROOT    # Go 安装位置，通常 C:\\Program Files\\Go
go env GOPATH    # 工作目录，默认 C:\\Users\\<用户名>\\go`} />
          <p className="text-gray-400 text-sm">如果想把 GOPATH 改到其他盘（如 D 盘）：</p>
          <CodeBlock id="go2" lang="PowerShell" code={`[System.Environment]::SetEnvironmentVariable('GOPATH', 'D:\\go-workspace', 'User')`} />
          <CodeBlock id="go3" lang="PowerShell" code={`# 配置国内代理（加速下载）
go env -w GOPROXY=https://goproxy.cn,direct`} />

          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs">2</span>
            克隆 Moon Bridge 仓库
          </h3>
          <p className="text-gray-400">
            用 Git 将 Moon Bridge 下载到本地（如没有 Git，先执行 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-xs">winget install Git.Git</code>）：
          </p>
          <CodeBlock id="mb0" lang="PowerShell" code={`# 创建工作目录（可换成你想要的路径）
mkdir D:\\workspace
cd D:\\workspace

# 克隆 Moon Bridge
git clone https://github.com/anthropics/moon-bridge.git
cd moon-bridge`} />

          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs">3</span>
            创建配置文件
          </h3>
          <p className="text-gray-400">
            在 Moon Bridge 目录下创建 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-xs">config.yml</code>，<b className="text-orange-300">把 api_key 改成你的 Key</b>：
          </p>
          <CodeBlock id="mb1" lang="config.yml" code={moonbridgeConfig} />

          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs">4</span>
            启动 Moon Bridge
          </h3>
          <CodeBlock id="mb2" lang="PowerShell" code={`cd D:\\workspace\\moon-bridge
go run ./cmd/moonbridge -config config.yml`} />
          <p className="text-gray-400 text-sm">看到 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-green-400 font-mono text-xs">Moon Bridge 监听于 127.0.0.1:38440</code> 就说明启动成功。</p>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-sm text-blue-200/90">
            <p><b>保持此窗口运行</b>，后续步骤需要 Moon Bridge 在后台持续监听。</p>
          </div>
        </section>

        {/* ── 四、配置 Codex ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Wrench size={24} className="text-orange-400" /> 四、配置 Codex 连接 Moon Bridge
          </h2>
          <p className="text-gray-400">
            新开一个 PowerShell 窗口，逐条执行以下命令来生成 Codex 配置：
          </p>

          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs">1</span>
            生成配置
          </h3>
          <CodeBlock id="cg1" lang="PowerShell (新窗口)" code={`# 第 1 条：设置 Codex 目录路径
$CODEX_HOME_DIR = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { "$HOME\\.codex" }

# 第 2 条：获取默认模型名
$MODEL = go run ./cmd/moonbridge -print-codex-model -config "D:\\workspace\\moon-bridge\\config.yml"

# 第 3 条：生成 config.toml + models_catalog.json
go run ./cmd/moonbridge -print-codex-config "$MODEL" -codex-base-url "http://127.0.0.1:38440/v1" -codex-home "$CODEX_HOME_DIR" -config "D:\\workspace\\moon-bridge\\config.yml" | Set-Content -Path "$CODEX_HOME_DIR\\config.toml" -NoNewline`} />
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-sm text-blue-200/90">
            <p>注意：上述路径 <code className="font-mono">D:\\workspace\\moon-bridge</code> 请替换为你的实际 Moon Bridge 目录。</p>
          </div>

          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs">2</span>
            额外配置（手动添加到 config.toml）
          </h3>
          <p className="text-gray-400">
            编辑 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-orange-400 font-mono text-xs">~/.codex/config.toml</code>，确保包含以下内容：
          </p>
          <CodeBlock id="cg2" lang="config.toml" code={codexConfig} />
          <p className="text-gray-400 text-sm">
            路径中的 <code className="font-mono">&lt;用户名&gt;</code> 请替换为你的 Windows 用户名。
          </p>

          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs">3</span>
            重启 Codex App
          </h3>
          <p className="text-gray-400">
            完成配置后，完全退出 Codex App（右键任务栏图标退出或任务管理器结束进程），然后重新启动。
          </p>
        </section>

        {/* ── 五、验证 ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Play size={24} className="text-green-400" /> 五、验证是否成功
          </h2>
          <p className="text-gray-400">
            重启 Codex 后，在 Codex 终端中测试对话。如果正常回复，说明配置成功。
          </p>
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-sm space-y-2">
            <p className="text-green-200 font-medium">✅ 成功的标志：</p>
            <ul className="list-disc list-inside text-gray-400 space-y-1">
              <li>Moon Bridge 窗口中看到请求日志</li>
              <li>Codex 能正常回复对话</li>
              <li><a href="/" className="text-blue-400 hover:text-blue-300 underline">T粒加油站</a> 的使用记录中能看到扣费</li>
            </ul>
          </div>
        </section>

        {/* ── 常见问题 ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-amber-400">
            <AlertTriangle size={24} /> 常见问题
          </h2>

          <div className="space-y-4">
            <details className="p-4 rounded-xl bg-gray-900 border border-gray-800 group">
              <summary className="text-sm font-medium text-gray-200 cursor-pointer hover:text-white">Q: Codex 提示 "No available channel for model claude-sonnet-4-20250514"？</summary>
              <p className="mt-3 text-sm text-gray-400">
                这是模型名不匹配。当前 T粒加油站使用的 Claude Sonnet 模型 ID 是 <code className="px-1 py-0.5 rounded bg-gray-800 text-orange-400 font-mono text-xs">claude-sonnet-4-6</code>，不是 <code className="font-mono">claude-sonnet-4-20250514</code>。请按上文配置文件使用正确的模型名。可用模型列表见<a href="/guide" className="text-blue-400 hover:text-blue-300 underline">使用说明</a>。
              </p>
            </details>

            <details className="p-4 rounded-xl bg-gray-900 border border-gray-800 group">
              <summary className="text-sm font-medium text-gray-200 cursor-pointer hover:text-white">Q: npm install 报权限错误？</summary>
              <p className="mt-3 text-sm text-gray-400">
                需要以<b>管理员身份</b>打开 PowerShell，执行 <code className="px-1 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-xs">Set-ExecutionPolicy RemoteSigned -Scope CurrentUser</code>，输入 Y 确认后重启终端。
              </p>
            </details>

            <details className="p-4 rounded-xl bg-gray-900 border border-gray-800 group">
              <summary className="text-sm font-medium text-gray-200 cursor-pointer hover:text-white">Q: go run 下载依赖很慢？</summary>
              <p className="mt-3 text-sm text-gray-400">
                已在上文配置了 <code className="px-1 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-xs">GOPROXY=https://goproxy.cn,direct</code>，国内下载应该在秒级完成。如果没有执行此命令，请先执行。
              </p>
            </details>

            <details className="p-4 rounded-xl bg-gray-900 border border-gray-800 group">
              <summary className="text-sm font-medium text-gray-200 cursor-pointer hover:text-white">Q: 如何确认配置的是哪个模型？</summary>
              <p className="mt-3 text-sm text-gray-400">
                Codex 最终使用的模型由 Moon Bridge 的 <code className="font-mono">routes.moonbridge.model</code> 决定（配置文件中设为 <code className="font-mono">deepseek-v4-pro</code>）。如果要换模型，修改该行并重启 Moon Bridge 即可。
              </p>
            </details>
          </div>
        </section>

        <div className="text-center py-8">
          <a href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-lg font-semibold transition-all shadow-lg shadow-blue-600/25">
            还没有 Key？立即注册
          </a>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-600">
        T粒加油站 · ai.aiotedu.cc · <a href="/guide" className="hover:text-gray-400 transition-colors">使用说明</a>
      </footer>
    </div>
  )
}
