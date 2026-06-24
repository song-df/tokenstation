import { useState } from 'react'
import { Copy, Check, Download, Monitor, Settings, Zap, Terminal } from 'lucide-react'

export default function VSCodeGuide() {
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

  const apiBase = 'https://api.wiselink.cc'

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor size={24} className="text-blue-400" />
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            VSCode + Claude Code 从零到起飞
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            免费 AI 编程助手 · 一键接入 T粒加油站 · Windows / macOS / Linux 通用
          </p>
        </section>

        {/* ── 一、安装 VSCode ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Download size={24} className="text-blue-400" /> 一、安装 Visual Studio Code
          </h2>
          <p className="text-gray-400">
            打开 <a href="https://code.visualstudio.com/Download" target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 underline">code.visualstudio.com</a>，下载对应系统的安装包。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
              <h3 className="text-white font-semibold mb-2">🪟 Windows</h3>
              <p className="text-gray-400 text-sm">下载 .exe 安装程序，一路下一步即可。</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
              <h3 className="text-white font-semibold mb-2">🍎 macOS</h3>
              <p className="text-gray-400 text-sm">下载 .dmg 或 .zip，拖入 Applications 文件夹。</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
              <h3 className="text-white font-semibold mb-2">🐧 Linux</h3>
              <p className="text-gray-400 text-sm">下载 .deb / .rpm 包，或用 Snap 安装：<code className="px-1.5 py-0.5 rounded bg-gray-800 text-xs font-mono">snap install code</code></p>
            </div>
          </div>
        </section>

        {/* ── 二、安装 Node.js ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Terminal size={24} className="text-green-400" /> 二、安装 Node.js（Claude Code 运行环境）
          </h2>
          <p className="text-gray-400">
            Claude Code 基于 Node.js。在终端输入 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-xs">node -v</code>，如果没输出版本号或版本 &lt; 18，需要安装。
          </p>

          <h3 className="text-base font-semibold text-white mt-4">🪟 Windows</h3>
          <CodeBlock id="node-win" lang="PowerShell" code={`# 安装 nvm（Node 版本管理器）
winget install CoreyButler.NVMforWindows
# 重启终端后
nvm install 24.14.1
nvm use 24.14.1
node -v`} />

          <h3 className="text-base font-semibold text-white mt-4">🍎 macOS / 🐧 Linux</h3>
          <CodeBlock id="node-unix" lang="终端" code={`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# 重启终端，若提示 nvm 命令不存在则执行:
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"' >> ~/.zshrc
source ~/.zshrc
# 安装 Node.js LTS
nvm install --lts
node -v`} />
        </section>

        {/* ── 三、获取 API Key ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Settings size={24} className="text-yellow-400" /> 三、获取 API Key
          </h2>
          <p className="text-gray-400">
            注册 <b>T粒加油站</b> 后在「概览」页面或「Key 管理」页面查看你的 API Key。接口地址：<code className="px-2 py-0.5 rounded bg-gray-800 text-blue-400 font-mono text-sm">{apiBase}</code>
          </p>
        </section>

        {/* ── 四、安装 Claude Code ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Zap size={24} className="text-orange-400" /> 四、安装 Claude Code
          </h2>
          <p className="text-gray-400">全局安装 Claude Code CLI：</p>
          <CodeBlock id="cc-install" lang="终端" code={`npm install -g @anthropic-ai/claude-code
# 验证安装
claude --version`} />

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200/90">
            <p>macOS / Linux 如果报 <code className="font-mono">EACCES</code> 权限错误，加 <code className="font-mono">sudo</code>：<code className="font-mono">sudo npm install -g @anthropic-ai/claude-code</code></p>
          </div>
        </section>

        {/* ── 五、安装 Claude Code VSCode 插件 ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Monitor size={24} className="text-purple-400" /> 五、安装 Claude Code VSCode 插件
          </h2>
          <p className="text-gray-400">
            打开 VSCode → 点击左侧扩展图标（或按 <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-xs">Ctrl+Shift+X</kbd>）→ 搜索
            <b className="text-purple-300"> Claude Code</b> → 点击安装。
          </p>
          <p className="text-gray-400 text-sm">
            插件名：<code className="px-1.5 py-0.5 rounded bg-gray-800 text-purple-300 font-mono text-xs">Anthropic.claude-code</code>
          </p>
        </section>

        {/* ── 六、配置 Claude Code 认证 ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Settings size={24} className="text-cyan-400" /> 六、配置 Claude Code 认证（关键步骤）
          </h2>
          <p className="text-gray-400">
            VSCode 插件依赖 Claude Code CLI 的配置文件来做认证。先在终端执行：
          </p>

          <p className="text-gray-400 text-sm mt-2">
            ⚠️ 把 <code className="px-1.5 py-0.5 rounded bg-gray-800 text-orange-300 font-mono text-xs">sk-你的APIKey</code> 替换为你的真实 Key。
          </p>

          <p className="text-gray-400 text-sm font-medium mt-4">🍎 macOS / 🐧 Linux（终端）：</p>
          <CodeBlock id="cc-config-unix" lang="终端" code={`mkdir -p ~/.claude
cat > ~/.claude/settings.json << 'EOF'
{
  "env": {
    "ANTHROPIC_BASE_URL": "${apiBase}",
    "ANTHROPIC_AUTH_TOKEN": "sk-你的APIKey",
    "ANTHROPIC_MODEL": "deepseek-v4-pro",
    "ANTHROPIC_SMALL_FAST_MODEL": "deepseek-v4-flash"
  }
}
EOF`} />

          <p className="text-gray-400 text-sm font-medium mt-4">🪟 Windows（PowerShell）：</p>
          <CodeBlock id="cc-config-win" lang="PowerShell" code={`mkdir "$env:USERPROFILE\\.claude" -Force
@'
{
  "env": {
    "ANTHROPIC_BASE_URL": "${apiBase}",
    "ANTHROPIC_AUTH_TOKEN": "sk-你的APIKey",
    "ANTHROPIC_MODEL": "deepseek-v4-pro",
    "ANTHROPIC_SMALL_FAST_MODEL": "deepseek-v4-flash"
  }
}
'@ | Out-File -FilePath "$env:USERPROFILE\\.claude\\settings.json" -Encoding utf8`} />

          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-200/90 space-y-2">
            <p>✅ 这个文件创建后，Claude Code（包括 VSCode 插件和命令行）会自动读取，不再提示登录。</p>
          </div>
        </section>

        {/* ── 七、启动 ── */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <Zap size={24} className="text-emerald-400" /> 七、起飞
          </h2>
          <p className="text-gray-400">
            重启 VSCode，按 <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-xs">Ctrl+Shift+L</kbd> 打开 Claude Code 面板，开始用 AI 写代码。
          </p>

          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm space-y-2">
            <p className="text-emerald-200">🚀 <b>至此配置完成！</b>你可以在任何项目里直接和 Claude Code 对话，让它帮你写代码、Debug、重构——全部走 T粒加油站，不用翻墙、不用海外信用卡。</p>
            <p className="text-gray-400">💡 提示：后续使用只需打开 VSCode → Ctrl+Shift+L，无需重复配置。</p>
            <p className="text-amber-300 text-xs">⚠️ 如仍弹出登录，选择 <b>API Key</b> 方式粘贴你的 Key 即可（选一次后不再出现）。</p>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center py-8">
          <a href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-lg font-semibold transition-all shadow-lg shadow-blue-600/25">
            <Zap size={20} /> 还没有账号？立即注册
          </a>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-600">
        T粒加油站 · wiselink.cc · <a href="/guide" className="hover:text-gray-400 transition-colors">使用说明</a>
      </footer>
    </div>
  )
}
