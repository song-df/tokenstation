# 模型 ID 规范化方案（t.wiselink.cc 网关）

> 生成：2026-06-02。数据来源：DeepSeek / OpenRouter / SiliconFlow 官方 `/models` 接口实测 + `backend/services/relay.py`。
> **铁律：只增不改不删** —— 现有在用 ID 全部保留为别名，避免学生/工具断访问。
> 命名原则：对外 = 各家**官方原生 ID**；只放**旗舰最新**；走指定渠道（deepseek / openrouter / siliconflow）。

---

## 一、最终对外模型清单（官方 ID → 渠道 → 上游名）

### deepseek 渠道（api.deepseek.com 官方直连）
| 对外官方 ID | 上游名 | 备注 |
|---|---|---|
| `deepseek-v4-pro` | `deepseek-v4-pro` | 官方标准 ID |
| `deepseek-v4-flash` | `deepseek-v4-flash` | 官方标准 ID（已一致）|

### openrouter 渠道（对外官方 ID → OpenRouter slug）
| 对外官方 ID | OpenRouter 上游 slug |
|---|---|
| `claude-opus-4-8` | `anthropic/claude-opus-4.8` |
| `claude-sonnet-4-6` | `anthropic/claude-sonnet-4.6` |
| `claude-haiku-4-5` | `anthropic/claude-haiku-4.5` |
| `gpt-5.5` | `openai/gpt-5.5` |
| `gpt-5.5-pro` | `openai/gpt-5.5-pro` |
| `gpt-5.3-codex` | `openai/gpt-5.3-codex` |
| `gemini-3.5-flash` | `google/gemini-3.5-flash` |
| `gemini-3.1-pro` | `google/gemini-3.1-pro-preview` |
| `step-3.7-flash` | `stepfun/step-3.7-flash` |
| `qwen3.7-max` | `qwen/qwen3.7-max` |

### siliconflow 渠道（中国厂商官方简名 → SiliconFlow slug）
| 对外官方 ID | SiliconFlow 上游 slug |
|---|---|
| `glm-5.1` | `Pro/zai-org/GLM-5.1` |
| `kimi-k2.6` | `Pro/moonshotai/Kimi-K2.6` |
| `minimax-m2.5` | `MiniMaxAI/MiniMax-M2.5` |
| `qwen3.5-397b-a17b` | `Qwen/Qwen3.5-397B-A17B` |

> 注意：Anthropic 官方用**短横线**（`claude-opus-4-8`），OpenRouter 上游用点号（`claude-opus-4.8`），靠下面 `_MODEL_MAP` 转换。Gemini 最新 Pro 只有 preview 版。

---

## 二、`services/relay.py` 的 `_MODEL_MAP`（完整替换）

```python
_MODEL_MAP = {
    # ========== OpenRouter 渠道：对外官方 ID → OpenRouter slug ==========
    # --- Anthropic（官方短横线 → OpenRouter 点号）---
    "claude-opus-4-8":    "anthropic/claude-opus-4.8",
    "claude-sonnet-4-6":  "anthropic/claude-sonnet-4.6",
    "claude-haiku-4-5":   "anthropic/claude-haiku-4.5",
    # --- OpenAI ---
    "gpt-5.5":            "openai/gpt-5.5",
    "gpt-5.5-pro":        "openai/gpt-5.5-pro",
    "gpt-5.3-codex":      "openai/gpt-5.3-codex",
    # --- Google ---
    "gemini-3.5-flash":   "google/gemini-3.5-flash",
    "gemini-3.1-pro":     "google/gemini-3.1-pro-preview",
    # --- StepFun ---
    "step-3.7-flash":     "stepfun/step-3.7-flash",
    # --- Qwen Max（闭源旗舰）---
    "qwen3.7-max":        "qwen/qwen3.7-max",

    # ========== SiliconFlow 渠道：官方简名 → SiliconFlow slug ==========
    "glm-5.1":            "Pro/zai-org/GLM-5.1",
    "kimi-k2.6":          "Pro/moonshotai/Kimi-K2.6",
    "minimax-m2.5":       "MiniMaxAI/MiniMax-M2.5",
    "qwen3.5-397b-a17b":  "Qwen/Qwen3.5-397B-A17B",

    # ========== deepseek 渠道：官方 ID（上游同名，直通，无需映射）==========
    # deepseek-v4-pro / deepseek-v4-flash 客户端名 == 上游名，靠 .get(name,name) 直通

    # ========== 旧别名（保留, 勿删；继续可用，零断访问）==========
    "claude-opus-4-20250514":    "anthropic/claude-opus-4.7",
    "claude-sonnet-4-20250514":  "anthropic/claude-sonnet-4.6",
    "claude-haiku-4-20250514":   "anthropic/claude-haiku-4.5",
    "claude-haiku-4-5-20251001": "anthropic/claude-haiku-4.5",
    # 以下旧 ID 客户端名==上游 slug，靠直通即可，无需列出：
    #   anthropic/claude-opus-4.8, openai/gpt-5.1, openai/gpt-5.2, openai/o3,
    #   openai/o4-mini, google/gemini-2.5-pro/flash, deepseek-ai/DeepSeek-V3/R1...,
    #   Qwen/..., Pro/zai-org/GLM-5.1, deepseek-ai/DeepSeek-V4-Pro
}
```

`map_model()` 仍是 `return _MODEL_MAP.get(name, name)` —— 表里有的转换，没有的原样透传（旧 slug 全部继续可用）。

---

## 三、`model_configs`（新增官方 ID 的 SQL，价格为占位，**按实际成本调整**）

```sql
-- 价格单位与现有库一致（元/百万 token）。max_tokens=输出上限。is_active=1 启用。
INSERT OR IGNORE INTO model_configs
  (model_name, display_name, provider, input_price, output_price, max_tokens, is_active, created_at)
VALUES
  -- deepseek 渠道
  ('deepseek-v4-pro',     'DeepSeek V4 Pro',     'deepseek',   0.26, 1.04, 8192,   1, datetime('now')),
  ('deepseek-v4-flash',   'DeepSeek V4 Flash',   'deepseek',   0.13, 0.26, 8192,   1, datetime('now')),
  -- openrouter 渠道
  ('claude-opus-4-8',     'Claude Opus 4.8',     'openrouter', 4.68, 23.4, 64000,  1, datetime('now')),
  ('claude-sonnet-4-6',   'Claude Sonnet 4.6',   'openrouter', 2.81, 14.04,64000,  1, datetime('now')),
  ('claude-haiku-4-5',    'Claude Haiku 4.5',    'openrouter', 0.94, 4.68, 64000,  1, datetime('now')),
  ('gpt-5.5',             'GPT-5.5',             'openrouter', 0.0,  0.0,  64000,  1, datetime('now')),
  ('gpt-5.5-pro',         'GPT-5.5 Pro',         'openrouter', 0.0,  0.0,  64000,  1, datetime('now')),
  ('gpt-5.3-codex',       'GPT-5.3 Codex',       'openrouter', 0.0,  0.0,  64000,  1, datetime('now')),
  ('gemini-3.5-flash',    'Gemini 3.5 Flash',    'openrouter', 0.0,  0.0,  64000,  1, datetime('now')),
  ('gemini-3.1-pro',      'Gemini 3.1 Pro',      'openrouter', 0.0,  0.0,  64000,  1, datetime('now')),
  ('step-3.7-flash',      'Step 3.7 Flash',      'openrouter', 0.0,  0.0,  32000,  1, datetime('now')),
  ('qwen3.7-max',         'Qwen 3.7 Max',        'openrouter', 0.0,  0.0,  32000,  1, datetime('now')),
  -- siliconflow 渠道
  ('glm-5.1',             'GLM-5.1',             'siliconflow',0.0,  0.0,  32000,  1, datetime('now')),
  ('kimi-k2.6',           'Kimi K2.6',           'siliconflow',0.0,  0.0,  32000,  1, datetime('now')),
  ('minimax-m2.5',        'MiniMax M2.5',        'siliconflow',0.0,  0.0,  32000,  1, datetime('now')),
  ('qwen3.5-397b-a17b',   'Qwen3.5-397B-A17B',   'siliconflow',0.0,  0.0,  32000,  1, datetime('now'));
```

> `INSERT OR IGNORE` + `model_name` 唯一索引 → 已存在的不会重复插入。`0.0` 价格请按各渠道实际成本填写后再开放计费。

---

## 四、`channels.models` 调整（把对外官方 ID 加进对应渠道）

`find_channel()` 按"渠道 `models` 文本是否**包含**该模型名 + priority 最高"选渠道。把对外 ID **追加**到对应渠道（逗号分隔，不要删旧的）：

| 渠道 | 追加这些对外 ID |
|---|---|
| deepseek | `deepseek-v4-pro,deepseek-v4-flash` |
| openrouter | `claude-opus-4-8,claude-sonnet-4-6,claude-haiku-4-5,gpt-5.5,gpt-5.5-pro,gpt-5.3-codex,gemini-3.5-flash,gemini-3.1-pro,step-3.7-flash,qwen3.7-max` |
| siliconflow | `glm-5.1,kimi-k2.6,minimax-m2.5,qwen3.5-397b-a17b` |

⚠️ **渠道优先级**：你要求 claude/gpt/google/step 走 **openrouter**。若线上还存在 native anthropic 等渠道也列了 claude，请确保 **openrouter 渠道 priority 最高**（或这些对外 ID 只在 openrouter 渠道出现），否则会被别的渠道抢走。

---

## 五、保留的旧别名（继续可用，**不要删**）
`claude-opus-4-20250514`、`claude-sonnet-4-20250514`、`claude-haiku-4-20250514`、`anthropic/claude-opus-4.8`、`deepseek-ai/DeepSeek-V4-Pro`、`openai/gpt-5.1`、`openai/gpt-5.2`、`openai/o3`、`openai/o4-mini`、`google/gemini-2.5-pro`、`google/gemini-2.5-flash`、`deepseek-ai/DeepSeek-V3`、`deepseek-ai/DeepSeek-R1(-0528)`、`Qwen/...`、`Pro/zai-org/GLM-5.1`、`cohere/...`、`mistralai/...` 等 —— 全部继续透传，老用户无感。

## 六、应用与验证
1. 改 `services/relay.py` 的 `_MODEL_MAP`（第二节），重启后端。
2. 执行第三节 SQL（在服务器 `backend/data.db` 上），或用 admin 后台逐个加。
3. 按第四节把对外 ID 追加进各渠道 `models` 字段，校准 priority。
4. 验证：
   - `GET /v1/models` 能看到新官方 ID；
   - 新 ID 各发一次：`claude-opus-4-8`、`gpt-5.5`、`gemini-3.5-flash`、`glm-5.1`、`deepseek-v4-pro` 都返回 200；
   - 旧别名（如 `claude-opus-4-20250514`、`deepseek-ai/DeepSeek-V4-Pro`）仍 200。

## 七、待确认 / 可选
- 第三节价格、max_tokens 为占位，**开放计费前务必按实际成本核对**。
- 可选追加：`qwen3.6-27b`（更新版本号但更小）、更多 GPT/Claude 变体。
- Gemini 正式版 Pro 出来后，把 `gemini-3.1-pro` 的上游从 `-preview` 切到正式 slug。
