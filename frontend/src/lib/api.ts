// ── new-api adapter ───────────────────────────────────────────────────────
// 学生端前端保留原有组件不变;此文件把旧接口(/auth、/student、/keys、/redeem)
// 适配到 new-api(/api/user、/api/token、/api/log)。鉴权由 JWT 改为 new-api
// 会话 cookie + `New-Api-User` 头。额度单位:1 T粒 = 10000 quota(new-api 内部
// 把 quota 当 USD 存,quotaPerUnit=500000,故 T粒 = quota/10000)。

const BASE = '/api';
const QUOTA_PER_TLI = 10000; // 1 T粒 = 10000 quota

// 模型输出价格 (T粒/1k tokens) = ModelRatio × CompletionRatio / 10
// 从 new-api options 同步，后续可改为动态 API
const MODEL_OUTPUT_PRICE: Record<string, number> = {
  'deepseek-v4-pro':       0.11,    // 0.275 × 4.0 / 10
  'deepseek-v4-flash':     0.30,    // 1.5 × 2.0 / 10
  'claude-opus-4-8':      27.0,     // 54.0 × 5.0 / 10
  'claude-sonnet-4-6':    16.2,     // 32.4 × 5.0 / 10
  'claude-haiku-4-5':      5.4,     // 10.8 × 5.0 / 10
  'gpt-5.5':              32.4,     // 54.0 × 6.0 / 10
  'gpt-5.5-pro':         194.4,     // 324.0 × 6.0 / 10
  'gpt-5.3-codex':        15.12,    // 18.9 × 8.0 / 10
  'gemini-3.5-flash':      9.72,    // 16.2 × 6.0 / 10
  'gemini-3.1-pro':       12.96,    // 21.6 × 6.0 / 10
  'step-3.7-flash':        1.242,   // 2.16 × 5.75 / 10
  'qwen3.7-max':           4.05,    // 13.5 × 3.0 / 10
  'glm-5.1':               3.6,     // 9.0 × 4.0 / 10
  'kimi-k2.6':             4.05,    // 9.75 × 4.1538 / 10
  'minimax-m2.5':          1.26,    // 3.15 × 4.0 / 10
  'qwen3.5-397b-a17b':     1.08,    // 1.8 × 6.0 / 10
};

// 兼容旧调用:仍把登录态存 localStorage,但存的是用户 id(用于 New-Api-User 头),
// 真正的会话靠 new-api 的 cookie。
let token: string | null = localStorage.getItem('token');

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}
export function getToken() { return token; }

function quotaToTli(q: number): number { return (q || 0) / QUOTA_PER_TLI; }

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['New-Api-User'] = token; // token 这里存的是 user id
  const res = await fetch(`${BASE}${path}`, { ...options, headers, credentials: 'include' });
  if (res.status === 401) { setToken(null); window.location.href = '/login'; throw new Error('登录已过期，请重新登录'); }
  let body: any = null;
  try { body = await res.json(); } catch { /* noop */ }
  if (!res.ok || (body && body.success === false)) {
    throw new Error((body && (body.message || body.detail)) || res.statusText || '请求失败');
  }
  // new-api 统一 {success,message,data};旧前端期望直接拿 data
  return body && 'data' in body ? body.data : body;
}

// ── 用户档案:把 new-api self 映射成旧前端期望的 profile 形状 ──
async function buildProfile() {
  const self = await request('/user/self');
  // 取一把可用 key 作为"主 key"显示(优先名为 legacy 的;否则第一把)
  let apiKey = '';
  try {
    const toks = await request('/token/?p=1&size=50');
    const items = (toks && toks.items) ? toks.items : (Array.isArray(toks) ? toks : []);
    const active = items.filter((t: any) => t.status === 1);
    const primary = active.find((t: any) => t.name === 'legacy') || active[0];
    if (primary) {
      const r = await request(`/token/${primary.id}/key`, { method: 'POST' });
      apiKey = 'sk-' + (r.key || r.data?.key || '');
    }
  } catch { /* 没有 key 时留空 */ }
  return {
    id: self.id,
    username: self.username,
    display_name: self.display_name,
    email: self.email,
    role: self.role >= 100 ? 'admin' : 'student',
    quota: quotaToTli(self.quota),
    used_quota: quotaToTli(self.used_quota),
    api_key: apiKey,
    referral_code: self.aff_code,
  };
}

function mapLog(l: any) {
  return {
    id: l.id,
    created_at: (l.created_at || 0) * 1000, // new-api 用秒
    model: l.model_name,
    prompt_tokens: l.prompt_tokens,
    completion_tokens: l.completion_tokens,
    cost: quotaToTli(l.quota),
    success: true,
  };
}
function mapTopup(l: any) {
  return {
    id: l.id,
    created_at: (l.created_at || 0) * 1000,
    amount: quotaToTli(l.quota),
    remark: l.content || '',
  };
}

export const api = {
  // ── 登录:new-api 下发会话 cookie;我们存 user id 供后续 New-Api-User 头 ──
  login: async (username: string, password: string) => {
    const data = await request('/user/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    setToken(String(data.id));
    // 旧前端 login 后通常会再调 me();这里返回兼容结构
    return { access_token: String(data.id), token_type: 'session', user: data };
  },
  me: async () => buildProfile(),

  // ── 学生档案 ──
  getStudentProfile: async () => buildProfile(),
  updateProfile: (data: any) => request('/user/self', { method: 'PUT', body: JSON.stringify(data) }),

  // ── 可用模型(旧前端期望 [{model_name, provider, output_price, max_tokens, display_name}]) ──
  getStudentModels: async () => {
    const list: string[] = await request('/user/models');
    return (list || []).map((name) => ({
      model_name: name, display_name: '', provider: name.includes('/') ? name.split('/')[0] : '',
      input_price: 0, output_price: MODEL_OUTPUT_PRICE[name] ?? 0, max_tokens: 0,
    }));
  },

  // ── 用量 / 充值记录(new-api /log/self,type=2 消费 / type=1 充值) ──
  getStudentLogs: async (page = 1, pageSize = 20) => {
    const d = await request(`/log/self?p=${page}&page_size=${pageSize}&type=2`);
    return { items: (d.items || []).map(mapLog), total: d.total, page: d.page, page_size: d.page_size };
  },
  getStudentTopups: async (page = 1, pageSize = 20) => {
    const d = await request(`/log/self?p=${page}&page_size=${pageSize}&type=1`);
    return { items: (d.items || []).map(mapTopup), total: d.total, page: d.page, page_size: d.page_size };
  },

  // ── 注册 ──
  register: (data: any) => request('/user/register', { method: 'POST', body: JSON.stringify(data) }),

  // ── 兑换码:new-api 返回新增的 quota(单位 quota),换算成 T粒 给前端 ──
  useRedeemCode: async (code: string) => {
    const d = await request('/user/topup', { method: 'POST', body: JSON.stringify({ key: code }) });
    const added = typeof d === 'number' ? d : (d?.quota ?? d?.data ?? 0);
    return { amount: quotaToTli(Number(added)) };
  },

  // ── 学生 API key 管理 ──
  listMyKeys: async () => {
    const d = await request('/token/?p=1&size=100');
    const items = (d && d.items) ? d.items : (Array.isArray(d) ? d : []);
    return items.map((t: any) => ({
      id: t.id, name: t.name, key: '',            // 列表不返回明文;需要时单独取
      is_active: t.status === 1,
      created_at: (t.created_time || 0) * 1000,
      usage_count: 0, total_tokens: 0,
    }));
  },
  // 取某把 key 的明文(供"复制"按钮调用)
  getKeyPlain: async (id: number) => {
    const r = await request(`/token/${id}/key`, { method: 'POST' });
    return 'sk-' + (r.key || r.data?.key || '');
  },
  createKey: async (name: string) => {
    // new-api 创建接口不返回明文 key,需创建后再单独取明文(同 buildProfile 的做法)
    const res = await request('/token/', {
      method: 'POST',
      body: JSON.stringify({ name, unlimited_quota: true, expired_time: -1, group: 'default', model_limits_enabled: false }),
    });
    let id = res && (res.id ?? res.data?.id);
    if (!id) {
      // 创建接口没回 id 时,列出 token 找刚建的那把(同名取 id 最大者)
      const toks = await request('/token/?p=1&size=100');
      const items = (toks && toks.items) ? toks.items : (Array.isArray(toks) ? toks : []);
      const sorted = [...items].sort((a: any, b: any) => b.id - a.id);
      id = (sorted.find((t: any) => t.name === name) || sorted[0])?.id;
    }
    if (!id) return { name, key: '' };
    const r = await request(`/token/${id}/key`, { method: 'POST' });
    return { id, name, key: 'sk-' + (r.key || r.data?.key || '') };
  },
  toggleKey: async (id: number) => {
    // new-api 没有 toggle;读当前状态后 PUT 反转
    const d = await request(`/token/${id}`);
    const cur = d.status === 1 ? 1 : 2;
    return request('/token/', { method: 'PUT', body: JSON.stringify({ id, status: cur === 1 ? 2 : 1 }) });
  },
  deleteKey: (id: number) => request(`/token/${id}`, { method: 'DELETE' }),

  // ── 已砍掉的定制功能:留空实现,避免组件报错(任务/站内信,决策2) ──
  getTasks: async () => ({ items: [], tasks: [] }),
  sendMessage: async (_content: string) => ({ success: false, message: '该功能已下线' }),
  verifyEmail: (email: string) => request('/user/register', { method: 'POST', body: JSON.stringify({ email, verification_only: true }) }),
  getMyMessages: async () => ({ items: [] }),
};
