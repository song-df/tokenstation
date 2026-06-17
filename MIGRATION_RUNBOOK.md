# ai.aiotedu.cc → new-api 迁移 Runbook

> 基于 2026-06-05 本地真数据演练（50 用户 / 54 key / 188 兑换码全程跑通验证）编写。
> 原则:**并行部署 + 灰度切换 + 可回滚,全程旧后端保留待命。**

---

## 0. 决策记录（已定）

| # | 决策 |
|---|---|
| 1 | **打 key 补丁**(让含 `-` 的旧 key 平移可用)。新 key 也走此逻辑(向后兼容)。后期旧 key 基本淘汰后,再评估是否移除补丁、恢复原版处理。 |
| 2 | **定制功能先砍**:学生任务/奖励、点对点站内信、兑换码自动补货——不迁、不重建。 |
| 3 | **前端:保留你现在的 React 界面,重写对接层**(见 §6 的大白话说明,待你最终确认)。 |
| 4 | **缓存计费配 cache ratio**,且在管理后台暴露为可配置项(new-api 原生支持)。 |
| 5 | **合规开关**:后台确认一次以启用兑换/支付。 |

---

## 1. 目标架构

```
学生/Claude Code/Codex
   │
   ▼
nginx (ai.aiotedu.cc)
   ├── /api/  → new-api  (127.0.0.1:8002)   ← 中继 + 计费内核(替换旧 FastAPI :8001)
   └── /      → 你的 React 前端(保留,api.ts 改对接 new-api)
                     │
   new-api ──► deepseek / 硅基流动 / OpenRouter
```

- 旧后端 `llm-gateway.service`(:8001)迁移期间**保留**,切换后待命数天再下线。

---

## 2. 关键参数（演练验证过）

- **额度单位换算:`1 T粒 = 10000 quota`**(整数 quota 保 4 位小数精度)。
- **价格→倍率:`modelRatio = 输入价(T粒/1k) × 10`,`completionRatio = 输出价 / 输入价`,`groupRatio = 1`。**
  - 例:deepseek-v4-pro(0.45/0.9)→ 4.5 / 2;claude-opus-4-8(5.4/27)→ 54 / 5。
  - 计费公式:`quota = (prompt + completion×completionRatio) × modelRatio`,演练逐条精确命中。
- **密码:bcrypt 直接兼容**(prod passlib `$2b$12$` ↔ new-api Go bcrypt),学生不用改密码。
- **quota 显示:** 配 `QuotaDisplayType=CUSTOM`,自定义符号 `T粒`,汇率使 quota/10000 显示为 T粒。

---

## 3. Phase 1 — 并行部署 new-api（不碰现有）

1. 服务器上拉 new-api 源码,**打 key 补丁**(§附录A),编译:
   ```bash
   GOPROXY=https://goproxy.cn,direct GOSUMDB=off CGO_ENABLED=0 go build -o new-api .
   ```
   （或用官方 docker 镜像 + 补丁；自建可控性更高。）
2. systemd 跑在 **:8002**,独立 SQLite,`SQLITE_PATH=/www/.../newapi/data.db`。
3. nginx 临时挂测试入口(如 `location /newapi/ { proxy_pass http://127.0.0.1:8002/; }`)验证,**不动 `ai.aiotedu.cc` 现有 `/api/`**。
4. 首启 `POST /api/setup` 建 root。

---

## 4. Phase 2 — 配置

> 全部可用 `PUT /api/option/`(带 root 会话 + `New-Api-User: 1` 头)或后台 UI。

1. **渠道**:deepseek(type 43)、硅基流动、OpenRouter,各填 key + models + base_url。
2. **价格→倍率**:用 §附录C 脚本从旧 `model_configs` 生成 `ModelRatio` / `CompletionRatio` JSON,写入 option。
3. **缓存计费(决策4)**:配 `CacheRatio`(命中缓存的输入 token 折扣,如 deepseek 设 0.1 表示缓存 token 按 1 折计)。new-api 原生支持、后台可改。**这一步必须做,否则缓存 token 按全价收、学生被多扣。**
4. **额度显示**:`QuotaDisplayType=CUSTOM`、`CustomCurrencySymbol=T粒`、汇率设成 1 T粒=10000 quota 对应值。
5. **合规开关(决策5)**:后台「系统设置」里勾选确认合规条款,启用兑换/支付/邀请。
6. 关 `SelfUseModeEnabled`、按需开放注册/邮箱验证(对齐旧站策略)。

---

## 5. Phase 3 — 数据迁移（脚本，见附录B）

迁移项（旧 SQLite → new-api SQLite，停 new-api → 跑脚本 → 重启）:
- **用户**:`quota/used_quota ×10000`,bcrypt hash 原样,role(student→1, admin→10),旧 admin(id=1)跳过(用 new-api root)。
- **API key**:`User.api_key`(legacy)+ `user_api_keys`(named)→ new-api `tokens`,Key=去 `sk-` 前缀,`unlimited_quota=1`(额度从 user 扣)。
- **兑换码**:未用的(`is_used=0`)→ `redemptions`,Key=原码,`quota=amount×10000`,status=1。
- **不迁(决策2砍掉)**:日志、任务/奖励、站内信、兑换码自动补货配置。

---

## 6. Phase 4 — 前端（决策已定）

**定稿:学生端保留你现在的 React 界面,只重写对接层 `src/lib/api.ts` 改调 new-api;管理端直接用 new-api 自带后台(管理员是你/技术人员,不做定制)。**

界面(React 组件/页面/样式)不动,改的是"调哪个接口、怎么解析返回"。

### 6.1 鉴权模型变化（要先改这块）
- 旧:登录拿 JWT 存 localStorage,后续请求带 `Authorization: Bearer <jwt>`。
- 新:`POST /api/user/login` 成功后 new-api 下发**会话 cookie**;此外**几乎所有用户接口都要带头 `New-Api-User: <用户id>`**。也可 `GET /api/user/token` 生成 access token 走 `Authorization`。
- api.ts 改造要点:登录后保存 user.id,封装请求时统一加 `New-Api-User` 头 + 带 cookie(`credentials: 'include'`);401 仍跳登录。

### 6.2 学生端接口对照表(api.ts 逐个改）

| 你前端现在调的 | 改成 new-api 的 | 备注 |
|---|---|---|
| `POST /api/auth/login` | `POST /api/user/login` | 存 user.id 供后续 `New-Api-User` 头 |
| `GET /api/auth/me` / `GET /student/profile` | `GET /api/user/self` | `quota/used_quota ÷10000 = T粒` |
| `PUT /student/profile` | `PUT /api/user/self` | 改资料 |
| `GET /student/models` | `GET /api/user/models` | 可用模型 |
| `GET /student/logs` | `GET /api/log/self?type=2` | 用量,`quota÷10000` |
| `GET /student/topups` | `GET /api/log/self?type=1` | 充值/兑换记录 |
| `POST /public/register` | `POST /api/user/register` | 注册 |
| 邮箱验证码 `/student/tasks/verify-email` | `GET /api/verification?email=…` | new-api 邮箱验证 |
| `POST /redeem/use` | `POST /api/user/topup` `{key}` | 兑换码;需先开合规(§4.5) |
| `GET /keys/my` | `GET /api/token/` | 我的 key 列表 |
| `POST /keys/create` | `POST /api/token/` | 建 key |
| `PUT /keys/:id` / `DELETE /keys/:id` | `PUT /api/token/` / `DELETE /api/token/:id` | 改/删 key |
| `/student/messages`、`/student/tasks` | **删除**(决策2砍) | 移除这些页面与调用 |

> 接入指南、模型列表等**纯展示页**不依赖后端逻辑,原样保留(URL/Key 显示从 `/api/user/self` 取)。

### 6.3 管理端
- **不改你的 admin 代码,直接用 new-api 自带后台**:管理员访问 new-api 的 `/`(或单独子路径)用 root 账号登录,管理渠道/用户/日志/充值/兑换码/价格倍率。
- 你前端里所有 `/admin/*`、`/redeem/admin/*`、`/admin/autogen/*`、`/admin/guide/*`、`/admin/referrals/*`、`/admin/messages/*` 调用**全部废弃**(对应页面不再用)。
- 部署上:nginx 把 new-api 自带前端挂在一个管理入口(如 `admin.ai.aiotedu.cc` 或 `/console/`),学生入口仍是你的 React。

---

## 7. Phase 5 — 灰度验证

1. 用**迁移过来的真实学生 key** 调 `/v1/chat/completions` 与 `/v1/messages`:认证、中继、计费、**扣对人**(演练已验证 songdf 全对)。
2. 用真实学生账号登录(bcrypt 兼容,密码不变)。
3. 兑换一个迁移过来的码,核对余额到账。
4. 先切**一小批用户**(改他们的请求入口指向 new-api),观察 1~2 天计费/报错。

---

## 8. Phase 6 — 切换 + 回滚

1. nginx 把 `ai.aiotedu.cc` 的 `location /api/` 的 `proxy_pass` 从 `:8001` 改到 `:8002`,`nginx -t && reload`。
2. 前端换成新 build(api.ts 已对接 new-api)。
3. **旧后端 :8001 保留运行**,出问题把 nginx 切回去即可秒回滚。
4. 盯日志/计费 3~7 天。

---

## 9. Phase 7 — 收尾

- 稳定后下线旧 `llm-gateway.service`。
- **key 补丁**随 new-api 每次升级 re-apply(4 行,§附录A)。
- (后期)旧 key 基本淘汰后,评估移除补丁、恢复原版 key 处理。
- 兑换码自动补货:改为后台手动批量生成,或单独写个旁挂小脚本。

---

## 附录 A — Key 兼容补丁（`middleware/auth.go`）

> 原因:new-api 鉴权按 `-` 拆 key 只取首段,而旧 key 是 `secrets.token_urlsafe(32)` 含 `-`(实测 49% 命中)。补丁:**先查全 key,失败才回退到原版拆分**——对 new-api 自带 key/渠道后缀完全向后兼容。

**`TokenAuth`(relay 用)的 else 分支:**
```go
} else {
    key = strings.TrimPrefix(key, "sk-")
    // migration patch: prefer full key (token_urlsafe keys contain "-");
    // only fall back to "-"-delimited channel-suffix form if full lookup fails.
    if _, e := model.ValidateUserToken(key); e != nil {
        parts = strings.Split(key, "-")
        key = parts[0]
    }
}
```

**`TokenAuthReadOnly` 同理:**
```go
key = strings.TrimPrefix(key, "sk-")
if _, e := model.GetTokenByKey(key, false); e != nil {
    key = strings.Split(key, "-")[0]
}
```

---

## 附录 B — 数据迁移脚本（演练已验证）

> 用法:停 new-api → `python3 migrate.py` → 重启。`PROD` 指向旧库副本,`NA` 指向 new-api 库。

```python
import sqlite3, time
SCALE=10000; now=int(time.time())
PROD='/path/old-data.db'; NA='/path/newapi/data.db'
prod=sqlite3.connect(PROD); prod.row_factory=sqlite3.Row
na=sqlite3.connect(NA)
users=prod.execute("SELECT * FROM users").fetchall()
uc=tc=rc=0
for u in users:
    if u['id']==1: continue            # 旧 admin 与 new-api root(1) 冲突,跳过
    na.execute('INSERT INTO users (id,username,password,display_name,role,status,email,quota,used_quota,request_count,"group",aff_code,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      (u['id'],u['username'],u['hashed_password'],u['display_name'] or u['username'],
       10 if u['role']=='admin' else 1,
       1 if (u['is_active'] in (1,'1',None,True)) else 2, u['email'] or '',
       int(round(u['quota']*SCALE)), int(round(u['used_quota']*SCALE)),0,'default',u['referral_code'] or '',now)); uc+=1
for u in users:                         # legacy User.api_key
    if u['id']==1 or not u['api_key']: continue
    k=u['api_key']; k=k[3:] if k.startswith('sk-') else k
    na.execute('INSERT INTO tokens (user_id,key,status,name,created_time,accessed_time,expired_time,remain_quota,unlimited_quota,used_quota,"group") VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      (u['id'],k,1,'legacy',now,now,-1,0,1,0,'default')); tc+=1
for k in prod.execute("SELECT * FROM user_api_keys").fetchall():   # named keys
    key=k['key']; key=key[3:] if key.startswith('sk-') else key
    try:
        na.execute('INSERT INTO tokens (user_id,key,status,name,created_time,accessed_time,expired_time,remain_quota,unlimited_quota,used_quota,"group") VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          (k['user_id'],key,1,k['name'] or 'named',now,now,-1,0,1,0,'default')); tc+=1
    except sqlite3.IntegrityError: pass
for c in prod.execute("SELECT * FROM redeem_codes WHERE is_used=0 OR is_used IS NULL").fetchall():
    na.execute('INSERT INTO redemptions (user_id,key,status,name,quota,created_time,expired_time) VALUES (?,?,?,?,?,?,?)',
      (0,c['code'],1,c['batch_id'] or 'migrated',int(round(c['amount']*SCALE)),now,0)); rc+=1
na.commit(); print(f"users={uc} tokens={tc} redemptions={rc}")
```

---

## 附录 C — 价格→倍率换算（从旧 model_configs 生成）

```python
import sqlite3, json
db=sqlite3.connect('/path/old-data.db')
mr={}; cr={}
for m in db.execute("SELECT model_name,input_price,output_price FROM model_configs WHERE is_active=1"):
    name,ip,op=m
    if ip and ip>0:
        mr[name]=round(ip*10, 6)          # modelRatio = 输入T粒/1k × 10
        cr[name]=round(op/ip, 6)          # completionRatio = 输出/输入
print("ModelRatio="+json.dumps(mr, ensure_ascii=False))
print("CompletionRatio="+json.dumps(cr, ensure_ascii=False))
# 把这两个 JSON 通过 PUT /api/option/ 写入 new-api
```

---

## 附录 D — 演练已确认的事实清单

- ✅ 用户/余额精确平移、bcrypt 密码不用改、计费倍率精确、兑换码原值可迁。
- ✅ key 补丁后,含 `-` 的真实 key 认证+中继+扣费归属全对。
- ✅ deepseek 工具调用经 new-api 正常(Anthropic↔OpenAI 翻译,无 DSML 泄漏);流式计费正常。
- ✅ 延迟开销小(总时长几乎不增,首字 +0.2~0.3s)。
- ⚠️ 兑换/支付需后台确认合规一次;缓存计费需配 cache ratio;quota 默认 $ 显示需改 T粒。
</content>
</invoke>
