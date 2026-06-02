const BASE = '/api';

let token: string | null = localStorage.getItem('token');

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}

export function getToken() { return token; }

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401) { setToken(null); window.location.href = '/login'; throw new Error('登录已过期，请重新登录'); }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || '请求失败');
  }
  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/auth/me'),

  getStats: () => request('/admin/stats'),

  getChannels: () => request('/admin/channels'),
  createChannel: (data: any) => request('/admin/channels', { method: 'POST', body: JSON.stringify(data) }),
  updateChannel: (id: number, data: any) => request(`/admin/channels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChannel: (id: number) => request(`/admin/channels/${id}`, { method: 'DELETE' }),

  getModels: () => request('/admin/models'),
  createModel: (data: any) => request('/admin/models', { method: 'POST', body: JSON.stringify(data) }),
  updateModel: (id: number, data: any) => request(`/admin/models/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteModel: (id: number) => request(`/admin/models/${id}`, { method: 'DELETE' }),

  getUsers: () => request('/admin/users'),
  createUser: (data: any) => request('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  toggleUser: (id: number) => request(`/admin/users/${id}/toggle`, { method: 'PUT' }),
  resetKey: (id: number) => request(`/admin/users/${id}/reset-key`, { method: 'POST' }),

  getTopups: () => request('/admin/topups'),
  createTopup: (data: any) => request('/admin/topups', { method: 'POST', body: JSON.stringify(data) }),

  // Student endpoints
  getStudentModels: () => request('/student/models'),
  updateProfile: (data: any) => request('/student/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  getStudentProfile: () => request('/student/profile'),
  getStudentLogs: (page = 1, pageSize = 20) => request(`/student/logs?page=${page}&page_size=${pageSize}`),
  getStudentTopups: (page = 1, pageSize = 20) => request(`/student/topups?page=${page}&page_size=${pageSize}`),

  getLogs: (page = 1, pageSize = 50) => request(`/admin/logs?page=${page}&page_size=${pageSize}`),
  // Public
  register: (data: any) => request('/public/register', { method: 'POST', body: JSON.stringify(data) }),

  // Redeem
  useRedeemCode: (code: string) => request('/redeem/use', { method: 'POST', body: JSON.stringify({ code }) }),
  generateCodes: (data: any) => request('/redeem/admin/generate', { method: 'POST', body: JSON.stringify(data) }),
  listCodes: (batchId = '') => request(`/redeem/admin/list?batch_id=${batchId}`),
  codeStats: () => request('/redeem/admin/stats'),
  getReferrals: () => request('/admin/referrals'),
  getGuideSections: () => request('/admin/guide/sections'),
  saveGuideSections: (data: any) => request('/admin/guide/sections', { method: 'POST', body: JSON.stringify(data) }),
  getReferralStats: () => request('/admin/referrals/stats'),
  listBatches: () => request('/redeem/admin/batches'),

  // AutoGen
  getAutoGenConfigs: () => request('/admin/autogen/configs'),
  saveAutoGenConfig: (data: any) => request('/admin/autogen/configs', { method: 'POST', body: JSON.stringify(data) }),
  deleteAutoGenConfig: (id: number) => request(`/admin/autogen/configs/${id}`, { method: 'DELETE' }),
  getAutoGenLogs: () => request('/admin/autogen/logs'),

  sendMessage: (content: string) => request('/student/messages', { method: 'POST', body: JSON.stringify({ content }) }),
  getTasks: () => request('/student/tasks'),
  verifyEmail: (email: string) => request('/student/tasks/verify-email', { method: 'POST', body: JSON.stringify({ email }) }),
  getMyMessages: () => request('/student/messages'),
  getMessages: () => request('/admin/messages'),
  replyMessage: (id: number, reply: string) => request(`/admin/messages/${id}/reply`, { method: 'POST', body: JSON.stringify({ reply }) }),
  getUnreadCount: () => request('/admin/messages/unread-count'),

  listMyKeys: () => request('/keys/my'),
  createKey: (name: string) => request('/keys/create', { method: 'POST', body: JSON.stringify({ name }) }),
  toggleKey: (id: number) => request(`/keys/${id}/toggle`, { method: 'POST', body: JSON.stringify({}) }),
  deleteKey: (id: number) => request(`/keys/${id}`, { method: 'DELETE' }),

};
