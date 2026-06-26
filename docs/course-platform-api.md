# 课程平台对接接口文档

wiselink.cc（T粒加油站）对外接口，供课程平台（aiotedu.cc）调用。

## 鉴权

所有接口通过 `system_secret` 鉴权，由双方线下约定共享。请求体中带上：

```json
{ "system_secret": "约定的密钥", ... }
```

## 接口一览

| 接口 | 用途 |
|---|---|
| `POST /api/redeem/external/verify` | 验证学生提交的邀请码（消费码） |
| `POST /api/redeem/external/allocate` | 从 wiselink.cc 码池申请一个码 |
| `POST /api/redeem/external/codes` | 从 wiselink.cc 码池批量申请码 |

---

## 场景一：学生在 wiselink.cc 买码，课程平台验证

**流程：** 学生在 wiselink.cc 花 T粒 购买邀请码 → 拿到码去课程平台注册 → 课程平台调 verify 验证 → 验证通过后码被消费，不可再用。

### POST /api/redeem/external/verify

**请求**

```
POST https://t.wiselink.cc/api/redeem/external/verify
Content-Type: application/json
```

```json
{
  "system_secret": "约定的密钥",
  "code": "6ECCBB1E7BFC0416"
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `system_secret` | string | 是 | 鉴权密钥 |
| `code` | string | 是 | 学生提交的邀请码，大小写不敏感 |

**响应（验证通过，200）**

```json
{
  "valid": true,
  "code": "6ECCBB1E7BFC0416",
  "amount": 1000,
  "batch_id": "2ff5760d",
  "used_at": "2026-06-23T18:25:27"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `valid` | boolean | 固定 `true` |
| `code` | string | 邀请码 |
| `amount` | number | 面值（T粒） |
| `batch_id` | string | 批次号 |
| `used_at` | string | 消费时间（ISO 8601） |

**错误响应**

| HTTP 状态码 | `detail` | 说明 |
|---|---|---|
| 403 | Invalid system secret | 密钥错误 |
| 400 | 该邀请码已被使用 | 码已消费过了 |
| 404 | 邀请码不存在 | 无效的码 |

---

## 场景二：课程平台从 wiselink.cc 码池批量取码

**流程：** 课程平台定期从 wiselink.cc 拉取邀请码存入自己码池，自行分发给学生，自行验证。

> 此场景下课程平台自己管验证逻辑，wiselink.cc 不参与验证。但不推荐此模式，学生买了码去哪了不可追踪。

### POST /api/redeem/external/codes

批量获取未分配的邀请码。返回后这些码标记为**预留**，不会被 `allocate` 重复分配。

**请求**

```
POST https://t.wiselink.cc/api/redeem/external/codes
Content-Type: application/json
```

```json
{
  "system_secret": "约定的密钥",
  "amount": 1000,
  "batch_id": "",
  "limit": 10
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `system_secret` | string | 是 | 鉴权密钥 |
| `amount` | integer | 否 | 面值筛选，不传则不限制 |
| `batch_id` | string | 否 | 指定批次 |
| `limit` | integer | 否 | 数量上限，建议指定 |

**响应**

```json
{
  "batch_id": "all",
  "amount": 1000,
  "count": 3,
  "codes": [
    {
      "code": "6ECCBB1E7BFC0416",
      "amount": 1000,
      "batch_id": "2ff5760d",
      "created_at": "2026-06-23T10:00:00"
    }
  ]
}
```

### POST /api/redeem/external/allocate

申请一个未分配的码。返回后标记为**已分发**，不会被重复分配。

**请求**

```
POST https://t.wiselink.cc/api/redeem/external/allocate
Content-Type: application/json
```

```json
{
  "system_secret": "约定的密钥",
  "amount": 1000
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `system_secret` | string | 是 | 鉴权密钥 |
| `amount` | integer | 是 | 面值 |

**响应**

```json
{
  "code": "6ECCBB1E7BFC0416",
  "amount": 1000,
  "batch_id": "2ff5760d",
  "created_at": "2026-06-23T10:00:00"
}
```

| HTTP 状态码 | `detail` | 说明 |
|---|---|---|
| 404 | No available codes for amount 1000 | 该面值库存不足，联系管理员补码 |

---

## 推荐做法

**用场景一。** 学生在 wiselink.cc 买码 → 课程平台调一个 `/external/verify` 验证即可闭环。课程平台无需维护自己的码池，wislk.cc 后台自动补码保证库存。
