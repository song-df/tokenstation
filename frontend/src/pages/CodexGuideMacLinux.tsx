import { useState } from 'react'
import { Copy, Check, Terminal, Cpu, AlertTriangle, Download, Wrench, Play, Settings } from 'lucide-react'

export default function CodexGuideMacLinux() {
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

models:
  deepseek-v4-pro:
    context_window: 1000000
    max_output_tokens: 384000
    display_name: "DeepSeek V4 Pro"
    description: "DeepSeek V4 with selectable reasoning effort."
    default_reasoning_level: "high"
    supported_reasoning_levels:
      - effort: "high"
        description: "High reasoning effort"
      - effort: "xhigh"
        description: "Extra high reasoning effort"
    supports_reasoning_summaries: true
    default_reasoning_summary: "auto"
    web_search:
      support: "auto"
    extensions:
      deepseek_v4:
        enabled: true
  deepseek-v4-flash:
    context_window: 1000000
    max_output_tokens: 384000
    display_name: "DeepSeek V4 Flash"
    description: "DeepSeek V4 Flash with selectable reasoning effort."
    default_reasoning_level: "high"
    supported_reasoning_levels:
      - effort: "high"
        description: "High reasoning effort"
      - effort: "xhigh"
        description: "Extra high reasoning effort"
    supports_reasoning_summaries: true
    default_reasoning_summary: "auto"
    web_search:
      support: "auto"
    extensions:
      deepseek_v4:
        enabled: true
  claude-sonnet-4-6:
    context_window: 200000
    max_output_tokens: 64000
    display_name: "Claude Sonnet 4"
    description: "Frontier model for everyday coding."
    default_reasoning_level: "medium"
    supported_reasoning_levels:
      - effort: "low"
        description: "Fast responses with lighter reasoning"
      - effort: "medium"
        description: "Balances speed and reasoning depth"
      - effort: "high"
        description: "Greater reasoning depth for complex problems"
      - effort: "xhigh"
        description: "Extra high reasoning depth"
    input_modalities:
      - "text"
      - "image"
    supports_image_detail_original: true

providers:
  default:
    base_url: "${origin}"
    api_key: "sk-你的APIKey"
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

  const codexConfig = `cat >> ~/.codex/config.toml << 'TOML_EOF'
model = "moonbridge"
model_provider = "moonbridge"
model_context_window = 1000000
model_max_output_tokens = 384000
model_catalog_json = "\${HOME}/.codex/models_catalog.json"

[model_providers.moonbridge]
name = "Moon Bridge"
base_url = "http://127.0.0.1:38440/v1"
wire_api = "responses"
TOML_EOF`

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal size={24} className="text-green-400" />
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Mac / Linux 从零安装 Codex
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Codex CLI + Moon Bridge 中转方案 · 国内直连 · 免翻墙免信用卡
          </p>
        </section>

        {/* ── 一、安装 Node.js ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Download size={24} className="text-green-400" /> 一、安装 Node.js（Codex 运行环境）
          </h2>
          <p className="text-gray-400">
            Codex CLI 依赖 Node.js 20+。在终端输入 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-xs">node -v</code>，如果没输出版本号或版本 &lt; 20，需要安装。
          </p>

          <CodeBlock id="node-install" lang="终端" code={`# 安装 nvm（Node 版本管理器）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# 重启终端，或执行：
source ~/.zshrc   # 如果用 zsh（macOS 默认）
source ~/.bashrc   # 如果用 bash（Linux 常见）

# 安装并使用 Node.js LTS
nvm install --lts
node -v`} />

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200/90 space-y-1.5">
            <p className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-400 shrink-0" /> <b>macOS 用户注意</b></p>
            <p>如果系统未安装 Xcode Command Line Tools，先执行：</p>
            <CodeBlock id="xcode-clt" lang="终端" code={`xcode-select --install`} />
          </div>
        </section>

        {/* ── 二、下载安装 Codex ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Download size={24} className="text-cyan-400" /> 二、安装 Codex CLI
          </h2>
          <CodeBlock id="codex-install" lang="终端" code={`npm install -g @openai/codex
# 验证安装
codex --version`} />

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200/90 space-y-2">
            <p className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-400 shrink-0" /> <b>权限错误处理</b></p>
            <p>如果报 <code className="font-mono">EACCES</code> 权限错误：</p>
            <CodeBlock id="codex-perm" lang="终端" code={`# 推荐：配置 npm 全局安装目录
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc   # zsh
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc   # bash
source ~/.zshrc   # 或 source ~/.bashrc

# 重新安装
npm install -g @openai/codex`} />
          </div>
        </section>

        {/* ── 三、配置 Moon Bridge ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Settings size={24} className="text-purple-400" /> 三、配置 Moon Bridge（中转）
          </h2>
          <p className="text-gray-400">
            Moon Bridge 负责将 Codex 的 Anthropic 格式请求转发到 T粒加油站。需要安装 Go 语言环境。
          </p>

          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs">1</span>
            安装 Go
          </h3>
          <p className="text-gray-400 text-sm font-medium mt-2">🍎 macOS：</p>
          <CodeBlock id="go-mac" lang="终端" code={`brew install go
go version`} />
          <p className="text-gray-400 text-sm font-medium mt-2">🐧 Linux：</p>
          <CodeBlock id="go-linux" lang="终端" code={`# Debian / Ubuntu
sudo apt update && sudo apt install -y golang-go

# CentOS / RHEL / Fedora
sudo dnf install -y golang

# Arch
sudo pacman -S go

go version`} />
          <CodeBlock id="go-proxy" lang="终端" code={`# 配置国内代理（加速下载，所有平台通用）
go env -w GOPROXY=https://goproxy.cn,direct`} />

          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs">2</span>
            克隆 Moon Bridge 仓库
          </h3>
          <CodeBlock id="mb-clone" lang="终端" code={`# 创建工作目录（可换成你想要的路径）
mkdir -p ~/workspace
cd ~/workspace

# 克隆 Moon Bridge
git clone https://github.com/ZhiYi-R/moon-bridge.git
cd moon-bridge`} />

          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs">3</span>
            创建配置文件
          </h3>
          <p className="text-gray-400">
            在 Moon Bridge 目录下创建 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-xs">config.yml</code>，<b className="text-orange-300">把 api_key 改成你的 Key</b>：
          </p>
          <CodeBlock id="mb-config" lang="config.yml" code={moonbridgeConfig} />

          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-sm space-y-3">
            <p className="text-purple-200 font-medium">📋 如何添加其他模型</p>
            <p className="text-gray-400">配置中默认使用 <code className="font-mono">deepseek-v4-pro</code>，如果要添加其他模型（如 Claude、GPT 等），需要改<b>三个地方</b>：</p>
            <ol className="list-decimal list-inside text-gray-400 space-y-2 ml-2">
              <li>
                <b className="text-white">models 节</b>：复制现有模型块，修改模型名和参数。
                <CodeBlock id="mb-add-model" lang="yaml (追加到 models: 下)" code={`  claude-opus-4-8:
    context_window: 200000
    max_output_tokens: 64000
    display_name: "Claude Opus 4.8"
    description: "Most capable Claude model."
    default_reasoning_level: "high"
    supported_reasoning_levels:
      - effort: "medium"
        description: "Balanced reasoning"
      - effort: "high"
        description: "Deep reasoning"
    input_modalities:
      - "text"
      - "image"`} />
              </li>
              <li>
                <b className="text-white">providers.default.offers 节</b>：为新模型添加定价条目：
                <CodeBlock id="mb-add-offer" lang="yaml (追加到 offers: 下)" code={`      - model: claude-opus-4-8
        pricing:
          input_price: 3
          output_price: 15
          cache_write_price: 3.75
          cache_read_price: 0.30`} />
              </li>
              <li>
                <b className="text-white">routes.moonbridge.model</b>：如果要切换默认模型，修改此行即可。
                <CodeBlock id="mb-route" lang="yaml" code={`routes:
  moonbridge:
    model: claude-opus-4-8
    provider: default`} />
              </li>
            </ol>
            <p className="text-gray-500 text-xs">T粒加油站支持的模型 ID 及价格见<a href="/guide" className="text-blue-400 hover:text-blue-300 underline">使用说明</a>。修改配置后重启 Moon Bridge 生效。</p>
          </div>

          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs">4</span>
            启动前准备
          </h3>

          <p className="text-gray-300 font-medium mt-4">① 创建 data 目录（SQLite 数据库需要）</p>
          <CodeBlock id="mb-prep1" lang="终端" code={`cd ~/workspace/moon-bridge
mkdir -p data`} />

          <p className="text-gray-300 font-medium mt-4">② 检查端口是否被占用</p>
          <CodeBlock id="mb-prep2" lang="终端" code={`# 查看 38440 端口是否已被占用
lsof -i :38440`} />
          <p className="text-gray-400 text-sm">
            如果输出为空 → 端口空闲，可以启动。<br />
            如果有输出 → 端口被占用，记下最后一列的 <b>PID</b>，执行 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-red-400 font-mono text-xs">kill 进程号</code> 结束旧进程。
          </p>

          <p className="text-gray-300 font-medium mt-4">③ 替换 API Key</p>
          <p className="text-gray-400 text-sm">
            确认 <code className="font-mono">config.yml</code> 中 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-orange-400 font-mono text-xs">api_key: "sk-你的APIKey"</code> 已替换为你的真实 Key。在<a href="/" className="text-blue-400 hover:text-blue-300 underline">个人主页</a>可查看。
          </p>

          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs">5</span>
            启动 Moon Bridge
          </h3>
          <CodeBlock id="mb-run" lang="终端" code={`cd ~/workspace/moon-bridge
go run ./cmd/moonbridge -config config.yml`} />
          <p className="text-gray-400 text-sm">看到 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-green-400 font-mono text-xs">Moon Bridge 监听于 127.0.0.1:38440</code> 就说明启动成功。</p>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-sm text-blue-200/90">
            <p><b>保持此窗口运行</b>，后续步骤需要 Moon Bridge 在后台持续监听。</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200/90 space-y-2">
            <p className="flex items-center gap-2 font-medium">⚠️ 启动报错排查</p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li><b>unable to open database file</b> → 没创建 <code className="font-mono">data</code> 目录，执行上面第①步。</li>
              <li><b>bind: address already in use</b> → 端口被占用，执行上面第②步。</li>
              <li><b>Invalid token / 401</b> → <code className="font-mono">api_key</code> 还是占位符没改，执行上面第③步。</li>
            </ul>
          </div>

          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs">6</span>
            让 Moon Bridge 驻留后台（不绑定终端窗口）
          </h3>
          <p className="text-gray-400">
            直接用 <code className="font-mono">go run</code> 启动的话，关掉终端服务就没了。下面三种方式任选其一：
          </p>

          <p className="text-gray-300 font-medium mt-4">方式一：nohup（最简单）</p>
          <CodeBlock id="mb-nohup" lang="终端" code={`cd ~/workspace/moon-bridge
nohup go run ./cmd/moonbridge -config config.yml > /dev/null 2>&1 &`} />
          <p className="text-gray-400 text-sm">
            进程在后台运行，关终端不受影响。需要停止时执行 <code className="px-1 py-0.5 rounded bg-gray-800 text-red-400 font-mono text-xs">pkill -f moonbridge</code>。
          </p>

          <p className="text-gray-300 font-medium mt-4">方式二：tmux / screen</p>
          <CodeBlock id="mb-tmux" lang="终端" code={`# 使用 tmux
tmux new -s moonbridge
cd ~/workspace/moon-bridge
go run ./cmd/moonbridge -config config.yml
# 按 Ctrl+B 然后按 D 分离会话
# 下次查看: tmux attach -t moonbridge

# 或使用 screen
screen -S moonbridge
cd ~/workspace/moon-bridge
go run ./cmd/moonbridge -config config.yml
# 按 Ctrl+A 然后按 D 分离会话
# 下次查看: screen -r moonbridge`} />

          <p className="text-gray-300 font-medium mt-4">方式三：编译 + 后台启动（推荐长期使用）</p>
          <CodeBlock id="mb-build" lang="终端" code={`# 先编译成可执行文件
cd ~/workspace/moon-bridge
go build -o moonbridge ./cmd/moonbridge

# 后台启动
nohup ./moonbridge -config config.yml > /dev/null 2>&1 &

# 验证
curl http://127.0.0.1:38440/health`} />

          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm">
            <p className="text-emerald-200 font-medium mb-2">🍎 macOS 用户：开机自启（launchd）</p>
            <CodeBlock id="mb-launchd" lang="终端" code={`cat > ~/Library/LaunchAgents/com.moonbridge.plist << PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.moonbridge</string>
    <key>ProgramArguments</key>
    <array>
        <string>\${HOME}/workspace/moon-bridge/moonbridge</string>
        <string>-config</string>
        <string>\${HOME}/workspace/moon-bridge/config.yml</string>
    </array>
    <key>WorkingDirectory</key>
    <string>\${HOME}/workspace/moon-bridge</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>\${HOME}/Library/Logs/moonbridge.log</string>
    <key>StandardErrorPath</key>
    <string>\${HOME}/Library/Logs/moonbridge.log</string>
</dict>
</plist>
PLIST_EOF

launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.moonbridge.plist`} />
          <p className="text-gray-400 text-sm">
            一键创建并加载。<code className="font-mono">{'<< PLIST_EOF'}</code> 不带引号，shell 会把 <code className="font-mono">{'${HOME}'}</code> 展开为实际用户目录再写入 plist。
          </p>
        </div>

        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm">
          <p className="text-emerald-200 font-medium mb-2">🐧 Linux 用户：开机自启（systemd）</p>
          <CodeBlock id="mb-systemd" lang="终端" code={`sudo tee /etc/systemd/system/moonbridge.service << 'SVC_EOF'
[Unit]
Description=Moon Bridge
After=network.target

[Service]
Type=simple
User=\${USER}
WorkingDirectory=\${HOME}/workspace/moon-bridge
ExecStart=\${HOME}/workspace/moon-bridge/moonbridge -config config.yml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC_EOF

sudo systemctl daemon-reload
sudo systemctl enable moonbridge --now`} />
          <p className="text-gray-400 text-sm">
            同样，<code className="font-mono">{'${USER}'}</code> 和 <code className="font-mono">{'${HOME}'}</code> 在写入文件时自动展开为当前用户名和家目录。
          </p>
        </div>

        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-sm text-green-200/90">
          <p>✅ 选任意一种方式启动后，执行 <code className="px-1 py-0.5 rounded bg-gray-800 text-green-400 font-mono text-xs">curl http://127.0.0.1:38440/health</code> 验证服务在运行。</p>
        </div>
      </section>

        {/* ── 四、配置 Codex ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Wrench size={24} className="text-orange-400" /> 四、配置 Codex 连接 Moon Bridge
          </h2>
          <p className="text-gray-400">
            新开一个终端窗口，逐条执行以下命令来生成 Codex 配置：
          </p>

          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs">1</span>
            生成配置
          </h3>
          <CodeBlock id="cg1" lang="终端（新窗口）" code={`# 第 1 条：先进入 Moon Bridge 目录
cd ~/workspace/moon-bridge
export CODEX_HOME_DIR=$\x7bCODEX_HOME:-$HOME/.codex}

# 第 2 条：获取默认模型名
MODEL=$(go run ./cmd/moonbridge -print-codex-model -config config.yml)

# 第 3 条：生成 config.toml + models_catalog.json
# -print-codex-config 会同时做两件事：
#   ① 把 config.toml 内容输出到 stdout → 管道写入 ~/.codex/config.toml
#   ② 把 models_catalog.json 自动写入 -codex-home 指定的目录
go run ./cmd/moonbridge -print-codex-config "$MODEL" \\
  -codex-base-url "http://127.0.0.1:38440/v1" \\
  -codex-home "$CODEX_HOME_DIR" \\
  -config config.yml > "$CODEX_HOME_DIR/config.toml"`} />
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-sm text-blue-200/90">
            <p><code className="font-mono">models_catalog.json</code> 由 <code className="font-mono">-print-codex-config</code> 自动写入 <code className="font-mono">-codex-home</code> 目录，<b>无需手动创建</b>。</p>
          </div>

          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs">2</span>
            额外配置（手动添加到 config.toml）
          </h3>
          <p className="text-gray-400">
            编辑 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-orange-400 font-mono text-xs">~/.codex/config.toml</code>，确保包含以下内容：
          </p>
          <CodeBlock id="cg2" lang="config.toml" code={codexConfig} />

          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs">3</span>
            重启 Codex App
          </h3>
          <p className="text-gray-400">
            完成配置后，完全退出 Codex App（如果已经在运行的话），然后重新启动。
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
              <summary className="text-sm font-medium text-gray-200 cursor-pointer hover:text-white">Q: Codex 提示 "No available channel for model"？</summary>
              <p className="mt-3 text-sm text-gray-400">
                检查 Moon Bridge <code className="font-mono">config.yml</code> 中 <code className="font-mono">routes.moonbridge.model</code> 的模型名是否正确。可用模型列表见<a href="/guide" className="text-blue-400 hover:text-blue-300 underline">使用说明</a>。
              </p>
            </details>

            <details className="p-4 rounded-xl bg-gray-900 border border-gray-800 group">
              <summary className="text-sm font-medium text-gray-200 cursor-pointer hover:text-white">Q: macOS 提示 "go: command not found"？</summary>
              <p className="mt-3 text-sm text-gray-400">
                需要先安装 <a href="https://brew.sh/" target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 underline">Homebrew</a>，然后执行 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-xs">brew install go</code>。
              </p>
            </details>

            <details className="p-4 rounded-xl bg-gray-900 border border-gray-800 group">
              <summary className="text-sm font-medium text-gray-200 cursor-pointer hover:text-white">Q: go run 下载依赖很慢？</summary>
              <p className="mt-3 text-sm text-gray-400">
                已在上文配置了 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-xs">GOPROXY=https://goproxy.cn,direct</code>，国内下载应该在秒级完成。如果没有执行此命令，请先执行。
              </p>
            </details>

            <details className="p-4 rounded-xl bg-gray-900 border border-gray-800 group">
              <summary className="text-sm font-medium text-gray-200 cursor-pointer hover:text-white">Q: Linux 上 git clone 失败？</summary>
              <p className="mt-3 text-sm text-gray-400">
                先安装 Git：<code className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-xs">sudo apt install git -y</code>（Debian/Ubuntu）或 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-xs">sudo dnf install git -y</code>（CentOS/Fedora）。
              </p>
            </details>

            <details className="p-4 rounded-xl bg-gray-900 border border-gray-800 group">
              <summary className="text-sm font-medium text-gray-200 cursor-pointer hover:text-white">Q: 如何确认当前使用的是哪个模型？</summary>
              <p className="mt-3 text-sm text-gray-400">
                Codex 最终使用的模型由 Moon Bridge 的 <code className="font-mono">routes.moonbridge.model</code> 决定（配置文件中设为 <code className="font-mono">deepseek-v4-pro</code>）。如果要换模型，修改该行并重启 Moon Bridge 即可。
              </p>
            </details>

            <details className="p-4 rounded-xl bg-gray-900 border border-gray-800 group">
              <summary className="text-sm font-medium text-gray-200 cursor-pointer hover:text-white">Q: 如何升级 Moon Bridge 到最新版本？</summary>
              <p className="mt-3 text-sm text-gray-400">
                <CodeBlock id="mb-update" lang="终端" code={`cd ~/workspace/moon-bridge
# 先停掉正在运行的进程
pkill -f moonbridge
# 拉取最新代码
git pull
# 重新编译并启动
go build -o moonbridge ./cmd/moonbridge
nohup ./moonbridge -config config.yml > /dev/null 2>&1 &`} />
              </p>
            </details>
          </div>
        </section>

        <div className="text-center py-8">
          <a href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white text-lg font-semibold transition-all shadow-lg shadow-green-600/25">
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
