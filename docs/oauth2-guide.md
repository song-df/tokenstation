# T粒加油站 OAuth2 接入指南

## 概述

T粒加油站（wiselink.cc）提供标准 OAuth2 Authorization Code 授权，第三方项目可以让用户使用加油站账号登录，无需单独注册。

| 端点 | 方法 | 说明 |
|---|---|---|
| `/oauth/authorize` | GET | 展示登录页，用户输入账号密码 |
| `/oauth/authorize` | POST | 提交登录，成功后重定向回业务方并携带 `code` |
| `/oauth/token` | POST | 用 `code` 换取 `access_token`（JWT） |
| `/oauth/userinfo` | GET | 用 `access_token` 获取当前用户信息 |

## 接入步骤

### 1. 在加油站注册客户端

联系站长提供以下信息：

- `client_id`：客户端标识（如 `my-app`）
- `client_secret`：客户端密钥
- `redirect_uris`：回调地址列表（如 `["https://mysite.com/oauth/callback"]`）

站长会在配置文件 `oauth_clients_json` 中添加对应条目。

### 2. 引导用户授权

将用户浏览器重定向到加油站授权页：

```
GET https://api.wiselink.cc/oauth/authorize
  ?client_id=my-app
  &redirect_uri=https://mysite.com/oauth/callback
  &response_type=code
  &state=随机字符串
```

参数说明：

| 参数 | 必填 | 说明 |
|---|---|---|
| `client_id` | 是 | 注册时获得的客户端标识 |
| `redirect_uri` | 是 | 必须与注册时提交的回调地址完全一致 |
| `response_type` | 是 | 固定为 `code` |
| `state` | 推荐 | 防 CSRF，回调时会原样带回 |

用户输入加油站账号密码登录后，浏览器会跳转到：

```
https://mysite.com/oauth/callback?code=AUTH_CODE&state=随机字符串
```

### 3. 用 code 换 token

你的**后端**调用 token 端点：

```bash
curl -X POST https://api.wiselink.cc/oauth/token \
  -d "grant_type=authorization_code" \
  -d "code=AUTH_CODE" \
  -d "client_id=my-app" \
  -d "client_secret=your-secret"
```

成功响应：

```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

> **注意**：`code` 一次性有效，5 分钟内过期。`access_token` 有效期 24 小时（可在配置中调整）。

### 4. 获取用户信息

用 `access_token` 调用 userinfo：

```bash
curl https://api.wiselink.cc/oauth/userinfo \
  -H "Authorization: Bearer eyJhbGciOi..."
```

响应：

```json
{
  "sub": "3",
  "username": "oauthtest",
  "display_name": "",
  "email": "oa@t.com",
  "role": "student"
}
```

### 5. 建立本地会话

拿到 `sub`（用户 ID）之后，在你的系统中创建或匹配用户，签发自己的会话/Cookie。`access_token` 仅用于获取用户身份，不应作为你系统的长期凭证。

## 安全注意事项

- `client_secret` **只能在后端使用**，绝不能暴露到前端代码中
- `state` 参数务必每次随机生成并校验，防止 CSRF 攻击
- `redirect_uri` 必须精确匹配，不允许通配符
- `code` 是一次性的，用完即弃

## 完整示例（Python）

```python
import secrets, requests

CLIENT_ID = "my-app"
CLIENT_SECRET = "your-secret"
REDIRECT_URI = "https://mysite.com/oauth/callback"
AUTH_BASE = "https://api.wiselink.cc"

# 1. 生成随机 state，构建授权 URL
state = secrets.token_urlsafe(16)
auth_url = (
    f"{AUTH_BASE}/oauth/authorize"
    f"?client_id={CLIENT_ID}"
    f"&redirect_uri={REDIRECT_URI}"
    f"&response_type=code"
    f"&state={state}"
)
# 将用户浏览器重定向到 auth_url

# 2. 用户登录后回调：
#    GET /oauth/callback?code=xxx&state=yyy
#    先校验 state == yyy，然后：

# 3. 换 token
resp = requests.post(f"{AUTH_BASE}/oauth/token", data={
    "grant_type": "authorization_code",
    "code": request.args["code"],
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
})
access_token = resp.json()["access_token"]

# 4. 拿用户信息
resp = requests.get(
    f"{AUTH_BASE}/oauth/userinfo",
    headers={"Authorization": f"Bearer {access_token}"},
)
user = resp.json()
# user = {"sub": "3", "username": "oauthtest", ...}

# 5. 用 user["sub"] 在你的系统中查找或创建用户
```

## 常见问题

**Q: 能不跳转登录页，直接后端调 API 登录？**

可以。直接调 `POST /api/auth/login` 拿 JWT，然后 `GET /api/auth/me` 验证。适用于服务端到服务端、不需要用户浏览器参与的场景。

**Q: access_token 过期了怎么办？**

目前需要用户重新走 OAuth 授权流程。如需 `refresh_token` 支持，联系站长。

**Q: 用户没有加油站账号怎么办？**

引导用户到加油站注册：`https://www.wiselink.cc/register`
