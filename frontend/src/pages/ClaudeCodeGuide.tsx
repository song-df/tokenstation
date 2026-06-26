import { useState } from 'react'
import { Copy, Check, Terminal, Zap, Key, Download, AlertTriangle } from 'lucide-react'

export default function ClaudeCodeGuide() {
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

  const apiBase = 'https://t.wiselink.cc'

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={24} className="text-blue-400" />
            <span className="text-lg font-semibold">T粒加油站</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/guide" className="text-gray-400 hover:text-gray-200 transition-colors">← 使用说明</a>
            <a href="/register" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">注册使用</a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Claude Code 零门槛上手
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            macOS / Linux / Windows 通用 · 环境变量一键接入
          </p>
        </section>

        {/* ── 一、获取 API Key ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Key size={24} className="text-blue-400" /> 一、获取 API Key
          </h2>
          <p className="text-gray-400">
            注册账号后在「概览」页面或「Key 管理」页面查看 API Key。Anthropic 原生接口地址：
            <code className="px-2 py-0.5 rounded bg-gray-800 text-blue-400 font-mono text-sm">{apiBase}</code>
          </p>
        </section>

        {/* ── 二、安装 Node.js ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Download size={24} className="text-green-400" /> 二、安装 Node.js
          </h2>
          <p className="text-gray-400">
            Claude Code 需要 Node.js 运行环境。如果已安装（<code className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-xs">node -v</code> 输出版本号 ≥ 18），可跳过此步骤。
          </p>

          <h3 className="text-base font-semibold text-white mt-4">🪟 Windows</h3>
          <p className="text-gray-400 text-sm">打开 PowerShell，执行以下命令安装 nvm，然后用 nvm 安装 Node.js：</p>
          <CodeBlock id="nvm-win" lang="PowerShell" code={`winget install CoreyButler.NVMforWindows
nvm version
nvm install 24.14.1
nvm list
node -v`} />

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200/90 space-y-1.5">
            <p className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-400 shrink-0" /> 如果 <code className="font-mono">npm --version</code> 报权限错误，以<b>管理员身份</b>打开 PowerShell 执行：</p>
            <CodeBlock id="nvm-fix" lang="PowerShell (管理员)" code={`Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`} />
            <p>输入 <b>Y</b> 确认，关掉终端重新打开即可正常使用 npm。</p>
          </div>

          <h3 className="text-base font-semibold text-white mt-6">🍎 macOS / 🐧 Linux</h3>
          <CodeBlock id="nvm-mac" lang="终端 (macOS / Linux)" code={`# 安装 nvm（Node 版本管理器）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# 重启终端，若提示 nvm 命令不存在则执行:
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"' >> ~/.zshrc
source ~/.zshrc
# 安装 Node.js LTS
nvm install --lts
node -v
npm -v`} />
        </section>

        {/* ── 三、安装 Claude Code ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Download size={24} className="text-orange-400" /> 三、安装 Claude Code
          </h2>
          <p className="text-gray-400">所有平台通用，终端执行一行命令即可：</p>
          <CodeBlock id="cc-install" lang="终端" code={`npm install -g @anthropic-ai/claude-code
# 验证安装
claude --version`} />

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200/90 space-y-1.5">
            <p className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-400 shrink-0" /> macOS / Linux 如果报 <code className="font-mono">EACCES</code> 权限错误，加 <code className="font-mono">sudo</code> 即可：<code className="font-mono">sudo npm install -g @anthropic-ai/claude-code</code>。</p>
            <p>也可以参考 <a href="https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally" target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 underline">npm 官方文档</a> 用非 root 方式安装全局包。</p>
          </div>
        </section>

        {/* ── 四、配置 ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Terminal size={24} className="text-cyan-400" /> 四、配置 Claude Code
          </h2>
          <p className="text-gray-400">选择下面一种方式，把 <b className="text-orange-300">sk-你的APIKey</b> 换成你的实际 Key。</p>

          <h3 className="text-base font-semibold text-white mt-4">方式 A · 环境变量（临时生效，推荐快速测试）</h3>

          <p className="text-gray-400 text-sm font-medium mt-4">🪟 Windows（PowerShell）：</p>
          <CodeBlock id="cc-env-win" lang="PowerShell" code={`$env:ANTHROPIC_BASE_URL="${apiBase}"
$env:ANTHROPIC_AUTH_TOKEN="sk-你的APIKey"
$env:ANTHROPIC_MODEL="claude-opus-4-8"
$env:ANTHROPIC_SMALL_FAST_MODEL="claude-haiku-4-5"`} />

          <p className="text-gray-400 text-sm font-medium mt-4">🍎 macOS / 🐧 Linux（终端）：</p>
          <CodeBlock id="cc-env-unix" lang="终端 (macOS / Linux)" code={`export ANTHROPIC_BASE_URL=${apiBase}
export ANTHROPIC_AUTH_TOKEN=sk-你的APIKey
export ANTHROPIC_MODEL=claude-opus-4-8
export ANTHROPIC_SMALL_FAST_MODEL=claude-haiku-4-5`} />

          <h3 className="text-base font-semibold text-white mt-8">方式 B · 永久配置（一次配置，始终生效）</h3>
          <p className="text-gray-400 text-sm">写入 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-xs">~/.claude/settings.json</code>（所有平台通用）：</p>

          <p className="text-gray-400 text-sm font-medium mt-4">🪟 Windows（PowerShell）：</p>
          <CodeBlock id="cc-perm-win" lang="PowerShell" code={`# 创建 .claude 目录
mkdir "$env:USERPROFILE\\.claude" -Force

# 写入配置文件
@'
{
  "env": {
    "ANTHROPIC_BASE_URL": "${apiBase}",
    "ANTHROPIC_AUTH_TOKEN": "sk-你的APIKey",
    "ANTHROPIC_MODEL": "claude-opus-4-8",
    "ANTHROPIC_SMALL_FAST_MODEL": "claude-haiku-4-5"
  }
}
'@ | Out-File -FilePath "$env:USERPROFILE\\.claude\\settings.json" -Encoding utf8`} />

          <p className="text-gray-400 text-sm font-medium mt-4">🍎 macOS / 🐧 Linux（终端）：</p>
          <CodeBlock id="cc-perm-unix" lang="终端 (macOS / Linux)" code={`mkdir -p ~/.claude
cat > ~/.claude/settings.json << 'EOF'
{
  "env": {
    "ANTHROPIC_BASE_URL": "${apiBase}",
    "ANTHROPIC_AUTH_TOKEN": "sk-你的APIKey",
    "ANTHROPIC_MODEL": "claude-opus-4-8",
    "ANTHROPIC_SMALL_FAST_MODEL": "claude-haiku-4-5"
  }
}
EOF`} />
        </section>

        {/* ── 五、启动 ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Terminal size={24} className="text-emerald-400" /> 五、启动 Claude Code
          </h2>
          <p className="text-gray-400">
            在你的项目目录打开终端，输入 <code className="px-2 py-0.5 rounded bg-gray-800 text-emerald-400 font-mono text-sm">claude</code> 即可开始使用。
          </p>
          <p className="text-gray-400 text-sm">
            💡 首次启动会提示登录，选择 <b>API Key</b> 方式，粘贴你的 Key 即可（如果已通过上面方式配置了环境变量或 settings.json，会自动跳过）。
          </p>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200/90 space-y-1.5">
            <p>⚠️ <b>必须设置 <code className="font-mono">ANTHROPIC_MODEL</code></b>：本站不使用 Claude 官方默认模型名，不设会报"模型不存在"。可选：</p>
            <ul className="list-disc list-inside ml-2 space-y-0.5">
              <li><code className="font-mono">claude-opus-4-8</code> — 最强模型</li>
              <li><code className="font-mono">claude-sonnet-4-6</code> — 性价比之选</li>
              <li><code className="font-mono">claude-haiku-4-5</code> — 快速便宜</li>
            </ul>
            <p className="mt-2">💡 <code className="font-mono">ANTHROPIC_SMALL_FAST_MODEL</code> 是后台小任务用的便宜模型，设为 <code className="font-mono">claude-haiku-4-5</code> 更省 T粒。</p>
          </div>
        </section>

        <div className="text-center py-8">
          <a href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-lg font-semibold transition-all shadow-lg shadow-blue-600/25">
            <Zap size={20} /> 还没有账号？立即注册
          </a>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-600">
        T粒加油站 · t.wiselink.cc · <a href="/guide" className="hover:text-gray-400 transition-colors">使用说明</a>
      </footer>
    </div>
  )
}
