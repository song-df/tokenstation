// ── new-api adapter ───────────────────────────────────────────────────────
// 学生端前端保留原有组件不变;此文件把旧接口(/auth、/student、/keys、/redeem)
// 适配到 new-api(/api/user、/api/token、/api/log)。鉴权由 JWT 改为 new-api
// 会话 cookie + `New-Api-User` 头。
// new-api USD 模式, QuotaPerUnit=500000, 目标 1 T粒 = ¥0.01。
// 推导: 1 T粒 = $0.01/7.25 = $0.001379, 500000×0.001379 ≈ 690 quota。
// T粒 = quota / 690

const BASE = '/api';
const QUOTA_PER_TLI = 690; // 1 T粒 = 690 quota (1 T粒 ≈ ¥0.01)

// 模型输出价格 (T粒/1k tokens) 基于 new-api ModelRatio × CompletionRatio
// 计算公式中 new-api 原始 quota 不变，仅前端显示用 QUOTA_PER_TLI=690 换算
// 原值 ×(10000/690) 等比缩放，保持 T粒 定价与 ¥0.01/T粒 一致
const MODEL_OUTPUT_PRICE: Record<string, number> = {
  'deepseek-v4-pro': 0.63,    // 0.232 ×(10000/690)
  'deepseek-v4-flash': 0.1,    // 0.036 ×(10000/690)
  'claude-opus-4-8': 77.68,    // 28.8 ×(10000/690)
  'claude-sonnet-4-6': 46.61,    // 17.28 ×(10000/690)
  'claude-haiku-4-5': 15.54,    // 5.76 ×(10000/690)
  'claude-fable-5': 233.03,    // 86.4 ×(10000/690)
  'gpt-5.5': 93.21,    // 34.56 ×(10000/690)
  'gpt-5.5-pro': 466.07,    // 172.8 ×(10000/690)
  'gpt-5.3-codex': 43.51,    // 16.13 ×(10000/690)
  'gemini-3.5-flash': 27.97,   // 10.37 ×(10000/690)
  'gemini-3.1-pro': 37.27,    // 13.82 ×(10000/690)
  'step-3.7-flash': 3.57,    // 1.324 ×(10000/690)
  'qwen3.7-max': 11.65,    // 4.32 ×(10000/690)
  'glm-5.1': 12.43,    // 4.61 ×(10000/690)
  'kimi-k2.6': 10.6,    // 3.93 ×(10000/690)
  'minimax-m2.5': 2.8,    // 1.037 ×(10000/690)
  'minimax-m3': 6.2,    // 2.30 ×(10000/690)
  'qwen3.5-397b-a17b': 9.33,    // 3.46 ×(10000/690)
};

// 模型供应商映射
const MODEL_PROVIDER: Record<string, string> = {
  'deepseek-v4-pro':      'DeepSeek',
  'deepseek-v4-flash':    'DeepSeek',
  'claude-opus-4-8':      'Anthropic',
  'claude-sonnet-4-6':    'Anthropic',
  'claude-haiku-4-5':     'Anthropic',
  'claude-fable-5':       'Anthropic',
  'gpt-5.5':              'OpenAI',
  'gpt-5.5-pro':          'OpenAI',
  'gpt-5.3-codex':        'OpenAI',
  'gemini-3.5-flash':     'Google',
  'gemini-3.1-pro':       'Google',
  'step-3.7-flash':       'StepFun',
  'qwen3.7-max':          'Qwen',
  'glm-5.1':              'Zhipu',
  'kimi-k2.6':            'Moonshot',
  'minimax-m2.5':         'MiniMax',
  'minimax-m3':           'MiniMax',
  'qwen3.5-397b-a17b':    'Qwen',
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

// 确保 key 以 sk- 开头（兼容 new-api 有时存 sk- 有时不存的情况）
function ensureSkPrefix(key: string): string {
  const raw = String(key || '');
  return 'sk-' + (raw.startsWith('sk-') ? raw.slice(3) : raw);
}

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
// ponytail: cache profile per page load to avoid 429 on /token/:id/key
let _profileCache: any = null;
async function buildProfile() {
  return _profileCache ?? (_profileCache = _doBuildProfile());
}
async function _doBuildProfile() {
  const self = await request('/user/self');
  // 取一把可用 key 作为"主 key"显示(优先名为 legacy 的;否则第一把)
  let apiKey = '';
  try {
    const toks = await request('/token/?p=1&size=50');
    const items = (toks && toks.items) ? toks.items : (Array.isArray(toks) ? toks : []);
    let active = items.filter((t: any) => t.status === 1);
    const primary = active.find((t: any) => t.name === 'legacy') || active[0];
    if (primary) {
      const r = await request(`/token/${primary.id}/key`, { method: 'POST' });
      apiKey = ensureSkPrefix(r.key || r.data?.key || '');
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
    // data 可能是 token 字符串或 user 对象，取 id 兜底
    setToken(String(data.id ?? data));
    const uid = String(data.id ?? data);
    return { access_token: uid, token_type: 'session', user: data };
  },
  me: async () => buildProfile(),

  // ── 学生档案 ──
  getStudentProfile: async () => buildProfile(),
  updateProfile: (data: any) => request('/user/self', { method: 'PUT', body: JSON.stringify(data) }),

  // ── 可用模型(旧前端期望 [{model_name, provider, output_price, max_tokens, display_name}]) ──
  getStudentModels: async () => {
    const list: string[] = await request('/user/models');
    return (list || []).map((name) => ({
      model_name: name, display_name: '', provider: MODEL_PROVIDER[name] || '',
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
      used_quota: quotaToTli(t.used_quota || 0),
      accessed_time: t.accessed_time ? t.accessed_time * 1000 : null,
    }));
  },
  // 取某把 key 的明文(供"复制"按钮调用)
  getKeyPlain: async (id: number) => {
    const r = await request(`/token/${id}/key`, { method: 'POST' });
    return ensureSkPrefix(r.key || r.data?.key || '');
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
    return { id, name, key: ensureSkPrefix(r.key || r.data?.key || '') };
  },
  toggleKey: async (id: number) => {
    // new-api 没有 toggle;读当前状态后 PUT 反转
    const d = await request(`/token/${id}`);
    const cur = d.status === 1 ? 1 : 2;
    return request('/token/', { method: 'PUT', body: JSON.stringify({ id, status: cur === 1 ? 2 : 1 }) });
  },
  deleteKey: (id: number) => request(`/token/${id}`, { method: 'DELETE' }),

  // 读取站点配置（淘券入口链接等）
  getSiteConfig: (key: string) => request(`/alipay/site-config?key=${key}`),

  // ── 已砍掉的定制功能:留空实现,避免组件报错(任务/站内信,决策2) ──
  getTasks: async () => ({ items: [], tasks: [] }),
  sendMessage: async (_content: string) => ({ success: false, message: '该功能已下线' }),
  verifyEmail: (email: string) => request('/user/register', { method: 'POST', body: JSON.stringify({ email, verification_only: true }) }),
  getMyMessages: async () => ({ items: [] }),

  // ── 代理订阅 ──
  getProxyStatus: async () => request('/proxy/status'),
  subscribeProxy: async (planId: number, days: number) =>
    request('/proxy/subscribe', { method: 'POST', body: JSON.stringify({ plan_id: planId, days }) }),
  cancelProxy: async () => request('/proxy/cancel', { method: 'POST' }),
  getReferral: async () => request('/proxy/referral'),

  // ── 课程订阅 ──
  purchaseCourse: async () => request('/proxy/course', { method: 'POST', body: '{}' }),
  getCourseCodes: async () => request("/proxy/course-codes"),

  // ── 代理订阅（管理端）──
  adminListProxySubs: async () => request('/proxy/admin/subscriptions'),
  adminCancelProxySub: async (id: number) =>
    request(`/proxy/admin/subscriptions/${id}/cancel`, { method: 'POST' }),
  adminListProxyPlans: async () => request('/proxy/admin/plans'),
  adminCreateProxyPlan: async (data: {name: string; days: number; price: number}) =>
    request('/proxy/admin/plans', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateProxyPlan: async (id: number, data: {name: string; days: number; price: number; is_active: boolean}) =>
    request(`/proxy/admin/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── T粒兑换码管理 ──
  listCodes: async (batchId?: string) => request(`/proxy/admin/redeem/list${batchId ? '?batch_id=' + batchId : ''}`),
  codeStats: async () => request('/proxy/admin/redeem/stats'),
  listBatches: async () => request('/proxy/admin/redeem/batches'),
  generateCodes: async (data: {amount: number; count: number; remark?: string}) =>
    request('/proxy/admin/redeem/generate', { method: 'POST', body: JSON.stringify(data) }),

  // ── 课程邀请码管理 ──
  listCourseCodes: async (batchId?: string) => request(`/proxy/admin/course-codes/list${batchId ? '?batch_id=' + batchId : ''}`),
  courseCodeStats: async () => request('/proxy/admin/course-codes/stats'),
  listCourseBatches: async () => request('/proxy/admin/course-codes/batches'),
  generateCourseCodes: async (data: {amount: number; count: number}) =>
    request('/proxy/admin/course-codes/generate', { method: 'POST', body: JSON.stringify(data) }),

  // ── Alipay T粒充值 ──
  getTliPackages: async () => request('/alipay/packages'),
  createAlipayOrder: async (packageId: number) =>
    request('/alipay/create-order', { method: 'POST', body: JSON.stringify({ package_id: packageId }) }),
  getAlipayOrders: async (page: number = 1, pageSize: number = 20) =>
    request(`/alipay/orders?page=${page}&page_size=${pageSize}`),
  getAlipayOrderStatus: async (outTradeNo: string) =>
    request(`/alipay/order-status/${outTradeNo}`),

  // ── WeChat Pay T粒充值 ──
  createWechatOrder: async (packageId: number) =>
    request('/wechat/create-order', { method: 'POST', body: JSON.stringify({ package_id: packageId }) }),
  getWechatOrderStatus: async (outTradeNo: string) =>
    request(`/wechat/order-status/${outTradeNo}`),
  getWechatOrders: async (page: number = 1, pageSize: number = 20) =>
    request(`/wechat/orders?page=${page}&page_size=${pageSize}`),
};
