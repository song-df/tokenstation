# B站视频脚本：Claude Code 国内免翻墙，三行命令搞定

> 预计时长：6-8 分钟
> 风格：技术教程 + 轻度整活
> 目标观众：会用终端的开发者、学生

---

## 0. 封面文案

- 大字：「Claude Code 国内免翻墙」
- 小字：「三行命令 · 免信用卡 · 10元起充」
- 视觉：终端截图 + T粒加油站 logo

---

## 1. 开场 Hook（0:00 - 0:30）

**【画面：黑底终端，光标闪烁】**

> 「Claude Code 确实好用，但是——」
> 
> 【切到错误画面：Connection timeout / 403 Forbidden】
> 
> 「国内直连不了、代理不稳定、境外信用卡搞不定——这是不是你的日常？」

**【画面切回博主正面】**

> 「今天教你一个办法，三行命令，在国内直接用 Claude Code，还能顺带解锁 GPT、Gemini、DeepSeek 一共 16 款模型。」
> 
> 「不用翻墙、不用境外卡、10 块钱就能开始。保姆级教程，我们开始。」

---

## 2. 项目介绍（0:30 - 1:30）

**【画面：T粒加油站落地页滚动展示】**

> 「先说一下这个项目叫什么——T粒加油站（www.wiselink.cc）。」
> 
> 「它的本质是一个 AI API 网关。什么意思呢？就是它帮你去连 Anthropic、OpenAI、Google 这些官方 API，你只需要连它就行。国内直连，不用代理。」

**【画面：模型列表展示，逐个高亮】**

> 「支持的模型 16 款——Claude Opus、Sonnet、Haiku、GPT-5.5、Gemini 3.5、DeepSeek V4、Qwen、Kimi 等等。」
> 
> 「重要的是，它同时支持 Anthropic 原生协议和 OpenAI 兼容协议。也就是说——Claude Code 能用，Cursor 能用，Codex 能用，Aider 也能用。一个 Key 全搞定。」

---

## 3. 实操演示（1:30 - 4:30）

**【画面：浏览器打开 www.wiselink.cc，点击注册】**

> 「第一步，注册。邮箱注册就行，30 秒搞定。注册完进个人主页，这里就能看到你的 API Key。点一下复制。」

**【画面切到终端，全屏】**

> 「第二步，配置环境变量。把下面三行复制到终端——」
>
> 【逐行高亮显示命令】
> ```
> export ANTHROPIC_BASE_URL=https://www.wiselink.cc
> export ANTHROPIC_AUTH_TOKEN=sk-你的Key
> export ANTHROPIC_MODEL=claude-opus-4-8
> ```
>
> 「注意，ANTHROPIC_MODEL 必须设。因为网关用的不是 Claude 官方默认的模型名，不设会报模型不存在。」
>
> 「如果想永久生效，写到 ~/.claude/settings.json 里，我把格式放评论区。」

**【画面：终端运行 `claude`】**

> 「然后在项目目录里直接输入 `claude`——」
>
> 【Claude Code 启动界面出现】
>
> 「OK，进来了。试一下——让它帮我写一个文件上传组件。」
>
> 【展示 Claude Code 生成代码的过程，注意展示流式输出的速度】
>
> 「速度还可以吧？国内直连 TTFB 大概 1.7 秒，比挂代理走官方还快一点。」

---

## 4. 省钱技巧（4:30 - 5:15）

**【画面：切到定价页面】**

> 「说一下怎么省钱。定价是 10 元 = 1000 T粒。用 Sonnet 写一次代码大概消耗 0.08 T粒，也就是 10 块钱能用大概一万次。DeepSeek 更便宜，一次 0.01 T粒。」

**【画面：终端展示配置】**

> 「还有个技巧——设一下 SMALL_FAST_MODEL：」
> ```
> export ANTHROPIC_SMALL_FAST_MODEL=claude-haiku-4-5
> ```
> 「Claude Code 有很多后台小任务——文件索引、代码摘要这些——它会自动用 SMALL_FAST_MODEL 指定的便宜模型去跑。设成 Haiku 的话，这些后台消耗几乎可以忽略不计。」

---

## 5. 多工具接入（5:15 - 6:00）

**【画面：快速展示 Cursor / Codex 配置】**

> 「除了 Claude Code，同一个 Key 还能接其他工具——」
>
> 「Cursor 和 Continue：把 OpenAI Base URL 设成 www.wiselink.cc/v1，Key 填你的 API Key 就行。」
>
> 「Codex CLI：写到 ~/.codex/config.toml 里，格式评论区有。」
>
> 「所以你的 workflow 可以是：Claude Code 写主力代码，Cursor 做细节补全，Codex 跑自动化任务——一个 Key 全通。」

---

## 6. 结尾 CTA（6:00 - 6:30）

**【画面：回到落地页，高亮注册按钮】**

> 「总结一下——国内直连、免翻墙、免境外卡、16 款模型、10 元起充。」
>
> 「注册地址在简介和评论区，注册就送免费额度，可以先试试再决定充不充。」
>
> 「觉得有用的话三连支持一下，有问题评论区见。下期视频教你怎么把 T粒加油站接到手机上用。」
>
> 【画面渐黑，Logo + URL】

---

## 附：评论区置顶文案

```
🔗 注册地址：https://www.wiselink.cc/

📋 Claude Code 永久配置（~/.claude/settings.json）：
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://www.wiselink.cc",
    "ANTHROPIC_AUTH_TOKEN": "sk-你的APIKey",
    "ANTHROPIC_MODEL": "claude-opus-4-8",
    "ANTHROPIC_SMALL_FAST_MODEL": "claude-haiku-4-5"
  }
}

📋 Codex CLI 配置（~/.codex/config.toml）：
model = "deepseek-v4-pro"
model_provider = "aiotedu"

[model_providers.aiotedu]
name = "aiotedu"
base_url = "https://api.wiselink.cc/v1"
wire_api = "chat"
env_key = "AIOTEDU_API_KEY"

💡 省钱 tip：SMALL_FAST_MODEL 设成 Haiku，后台任务自动走便宜模型
```

---

## 制作备注

- **画面节奏：** 每个操作步骤配全屏终端画面，不要一直对着博主脸
- **代码展示：** 命令用逐行高亮效果，不要一次性全显示
- **音效：** 命令输入时用机械键盘音效，错误画面用 buzzer 音效
- **字幕：** 关键命令和数字加粗高亮
- **BGM：** 轻电子 / lo-fi，不要盖过人声
