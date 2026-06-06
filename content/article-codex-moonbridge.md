# 为什么 Codex CLI 接不了大多数 AI 网关？一个协议层面的深度解析

> 适用于：Codex CLI、Moonbridge、Claude Code 用户，以及想搞清楚「为什么我的工具连不上」的开发者。

---

## 一次失败的接入

上周我用 Codex CLI 对接自己搭的 AI 网关（ai.aiotedu.cc），配置填好，回车——

```
unexpected status 404 Not Found: Invalid URL (GET /v1/responses)
```

换了个配置项，又报：

```
invalid configuration: `wire_api = "chat"` is no longer supported.
```

两行报错，指向同一个结论：**Codex 要的东西，我没给——不是不想给，是整个行业都没给。**

---

## Codex 说的是一种「小众方言」

要理解这件事，得先搞清楚 AI API 的协议格局。

目前业界公认的 API 通用语言有两种：

| 协议 | 代表工具 | 特点 |
|------|---------|------|
| **OpenAI Chat Completions** (`/v1/chat/completions`) | Cursor、Aider、Continue、几乎所有第三方客户端 | 无状态、简单、兼容性最强 |
| **Anthropic Messages** (`/v1/messages`) | Claude Code、Claude API 生态 | 设计优雅、支持流式、Claude Code 原生协议 |

几乎所有的 AI 网关——OpenRouter、SiliconFlow、DeepSeek 官方、包括我们的 T粒加油站——都同时支持这两种。因为上游厂商也讲这两种。

**但 Codex 两边都不说。**

Codex 只认 OpenAI 在 2024 年推出的 **Responses 协议**（`/v1/responses`）。这是一个比较新的、有状态的协议：服务端替你保存对话历史、内置工具编排、有自己的一套流式事件模型。听起来很强大——**问题是，除了 OpenAI 自己，基本没人实现它。**

实测证据：

| 端点 | 结果 |
|---|---|
| `api.openai.com/v1/responses` | ✅ 200（只有 OpenAI） |
| `api.deepseek.com/v1/responses` | ❌ 404 |
| `ai.aiotedu.cc/v1/responses` | ❌ 404 |
| `ai.aiotedu.cc/v1/chat/completions` | ✅ 200（Chat Completions 正常） |
| `ai.aiotedu.cc/v1/messages` | ✅ 200（Anthropic Messages 正常） |

**结论：除了 OpenAI 自己，全行业没人实现 Responses。** 这不是 T粒加油站的问题，这是 Codex 选了条少有人走的路。

更关键的是，Codex 新版本已经把 `wire_api = "chat"` 这个降级选项移除了——它不再允许你「降级」到 Chat Completions 协议。你要么接 Responses，要么别用。

---

## 解法：Moonbridge，一个协议翻译桥

既然网关不讲 Responses、Codex 不降级，那就需要一个中间层——在本地把 Codex 的 Responses 请求翻译成网关能听懂的 Chat Completions 或 Messages。

我们做了一个叫 **Moonbridge** 的本地服务（开源，跑在本机 `127.0.0.1:38440`），架构如下：

```
Codex CLI（说 Responses）
  ↓
Moonbridge（翻译：Responses → Chat / Messages）
  ↓
T粒加油站 网关（ai.aiotedu.cc）
  ↓
上游模型（DeepSeek V4 Pro / Claude / GPT / ...）
```

配置只要几行：

**~/.codex/config.toml：**
```toml
model = "moonbridge"
model_provider = "moonbridge"

[model_providers.moonbridge]
name = "Moon Bridge"
base_url = "http://127.0.0.1:38440/v1"
wire_api = "responses"
```

实测效果：缓存命中率 ~98%，响应 ~2s，工具调用正常。

---

## 如果你不想折腾桥

换个工具就行。

**Claude Code** 说的是 Anthropic Messages 协议，**T粒加油站原生支持，直连无需任何桥：**

```
Base URL: https://ai.aiotedu.cc/api
API Key: 你的 Key
模型: claude-opus-4-8
```

三行环境变量，或者写入 `~/.claude/settings.json`，然后 `claude` 直接进。

**Cursor / Aider / Continue** 说的是 Chat Completions，同样直连：

```
Base URL: https://ai.aiotedu.cc/api/v1
API Key: 你的 Key
```

---

## 速查表

| 工具 | 协议 | 直连 T粒加油站？ | 需要什么 |
|------|------|:---:|------|
| **Claude Code** | Anthropic Messages | ✅ | 配 Base URL + Key 即可 |
| **Cursor / Aider / Continue** | Chat Completions | ✅ | 配 Base URL + Key 即可 |
| **Codex CLI** | Responses（仅 OpenAI 有） | ❌ | 需要 Moonbridge 桥 |

---

## 写在最后

这篇文章的初衷不是推广某个工具——而是解释一个很多开发者踩过的坑：**「我的网关明明支持 Claude Code，为什么 Codex 接不上？」**

答案不是「网关做得不够」。而是 Codex 选了一个目前只有 OpenAI 实现的协议。这就像你开了一个支持银联和 Visa 的 POS 机，但有人掏出一张 American Express——不是 POS 机的问题，是卡的生态还不够广。

好消息是，如果你只是想在国内稳定地用 AI 写代码，**Claude Code + T粒加油站 直连已经足够好用了。** 16 款模型、一个 Key、三行命令、免翻墙免信用卡。Codex 用户如果有桥的需求，Moonbridge 也已经开源可用。

---

*利益相关：本文提到的 T粒加油站（ai.aiotedu.cc）和 Moonbridge 均为作者自建/参与的项目。*

🔗 T粒加油站：https://ai.aiotedu.cc/
