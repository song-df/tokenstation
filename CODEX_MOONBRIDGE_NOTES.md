# Codex 接入 new-api 说明:为什么必须经 moonbridge

> 记录 Codex app 接入 `t.wiselink.cc`(new-api 网关)时遇到的协议问题、根因、验证过程与解决方案。

---

## 1. 现象

在 Codex app 里把 provider 直接指向 `t.wiselink.cc`,发消息报错:

```
unexpected status 404 Not Found: Invalid URL (GET /v1/responses),
url: http://t.wiselink.cc/v1/responses
```

改成 `wire_api = "chat"` 后又报:

```
invalid configuration: `wire_api = "chat"` is no longer supported.
How to fix: set `wire_api = "responses"` in your provider config.
```

---

## 2. 根因:协议不匹配

**Codex 只认 OpenAI 的 Responses 协议(`/v1/responses`),而且新版已移除 `wire_api = "chat"` 的支持** —— 即 Codex 强制走 Responses,无法降级到 chat completions。

**而 new-api(以及几乎所有非 OpenAI 后端)不提供 `/v1/responses` 端点。** new-api 只提供:
- `/v1/chat/completions`（OpenAI Chat Completions）
- `/v1/messages`（Anthropic Messages）

两边对不上 → 404。

### 为什么 new-api 不提供 Responses

1. **Responses 是 OpenAI 较新且"重"的有状态协议**：服务端保存对话状态（`previous_response_id` 串联）、内置工具编排（web_search/file_search/code_interpreter/computer_use）、自有流式事件模型。和无状态的 chat completions 不是一个量级。
2. **new-api 定位是"通用中继"**，抽象层建在两个几乎所有家都支持的格式上：OpenAI Chat Completions + Anthropic Messages。上游（deepseek、硅基流动、OpenRouter…）全都讲 chat completions，**没人讲 Responses**。
3. **要对外提供 Responses，等于要在无状态 chat 之上模拟一整套有状态语义** —— 工程量大，而且这正是 moonbridge 这类桥在做的事。new-api 选择不背这个包袱。
4. Responses 目前基本只有 **OpenAI 第一方工具**（Codex、Agents SDK）在用，对多家中继网关是小众前端。

> 注：new-api 有"反向"能力（能去**调用**一个用 Responses 协议的上游，源码 `relay/chat_completions_via_responses.go`），但它**不对外当 Responses 服务端**，方向相反，救不了 Codex。

---

## 3. 实测证据（2026-06-06）

直连 deepseek 官方也一样不行，同一个原因：

| 端点 | 结果 |
|---|---|
| `POST api.deepseek.com/v1/responses` | **404**（没这个端点）|
| `POST api.deepseek.com/chat/completions` | 200 ✅ |
| `POST api.deepseek.com/anthropic/v1/messages` | 200 ✅ |
| `POST t.wiselink.cc/v1/responses` | **404**（new-api 没有）|
| `POST t.wiselink.cc/v1/chat/completions` | 200 ✅（工具调用 `finish_reason=tool_calls` 正常）|

**结论：除了 OpenAI 自己（api.openai.com），基本没人实现 Responses API。** 所以 Codex 想用任何"非 OpenAI"后端，都必须经一个把 Responses 翻译成 chat/anthropic 的桥。

---

## 4. 解决方案:moonbridge（Codex ↔ new-api 的协议翻译桥）

```
Codex app (Responses 协议)
  → moonbridge :38440 (接住 Responses,翻译成 chat/messages)
  → provider=aiotedu → https://t.wiselink.cc (new-api)
  → deepseek-v4-pro
```

moonbridge 同时还**在服务端持有 API key**，所以 Codex 不用自己配 key。

### 生效配置

**`~/.codex/config.toml`：**
```toml
model = "moonbridge"
model_provider = "moonbridge"

[model_providers.moonbridge]
name = "Moon Bridge"
base_url = "http://127.0.0.1:38440/v1"
wire_api = "responses"
```

**`~/workspace/moon-bridge/config.yml`（关键部分）：**
```yaml
providers:
  aiotedu:
    base_url: "https://t.wiselink.cc"        # 生产 new-api,中继在 /v1
    api_key: "sk-..."                         # 一把有效的 new-api token(如 songdf 的)
    offers:
      - model: deepseek-v4-pro
        # ...
routes:
  moonbridge:
    model: deepseek-v4-pro
    provider: aiotedu
```

改 bridge 配置后重启：`launchctl kickstart -k gui/$(id -u)/com.df.moonbridge`

实测：缓存命中 ~98%、~2s，工具调用正常。

> ⚠️ **CC Switch 替代不了 moonbridge**。CC Switch 只是个图形化"配置切换器"（帮你填 base_url/key/model），**不翻译协议**。Codex 用了 CC Switch 后还是说 Responses，照样不通。

---

## 5. 替代方案:用 Claude Code（直连,无需桥）

如果不想要 moonbridge 这个本地桥,可以**换用 Claude Code**(另一个 agent 编程 CLI)——它说的是 Anthropic `/v1/messages`,**new-api 原生支持,直连即可**：

```
Base URL: https://t.wiselink.cc
API Key:  你的 key
模型:     claude-opus-4-8
```

（CC Switch 里配 "Claude Code" 这个工具填上述即可,或手动设 `ANTHROPIC_BASE_URL=https://t.wiselink.cc`、`ANTHROPIC_AUTH_TOKEN=sk-...`、`ANTHROPIC_MODEL=claude-opus-4-8`。）

---

## 6. 速查

| 工具 | 协议 | 直连 new-api? | 怎么接 |
|---|---|---|---|
| **Codex** | 只认 Responses | ❌ 不行 | **必须经 moonbridge** |
| **Claude Code** | Anthropic Messages | ✅ 可以 | 直接配 `t.wiselink.cc` |
| curl / OpenAI SDK | Chat Completions | ✅ 可以 | `t.wiselink.cc/v1/chat/completions` |

**一句话**：Codex 协议太特殊（全行业只有 OpenAI 实现了 Responses），不是 new-api 的问题；Codex 接 new-api 必须用 moonbridge 翻译,或者改用 Claude Code 直连。
