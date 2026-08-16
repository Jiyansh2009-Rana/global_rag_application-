/* ─────────────────────────────────────────────────────────────────────────────
   API Client — persisted Bearer token
   Token is stored in localStorage so it survives page refresh.
   A 401 interceptor notifies subscribers so AuthProvider can react.
─────────────────────────────────────────────────────────────────────────────── */

let rawBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
if (!rawBase.endsWith('/api/v1')) {
  rawBase = rawBase.replace(/\/+$/, '') + '/api/v1';
}
export const BASE_URL = rawBase;
const TOKEN_KEY = 'rag_access_token';

/* ── Persisted token store ── */
// Seed from localStorage on module init — survives page refresh
let _token: string | null = (() => {
  try { return localStorage.getItem(TOKEN_KEY); }
  catch { return null; }          // private/incognito may throw
})();

export const tokenStore = {
  get: () => _token,
  set: (t: string | null) => {
    _token = t;
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else   localStorage.removeItem(TOKEN_KEY);
    } catch { /* storage may be blocked */ }
  },
  clear: () => {
    _token = null;
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

/* ── 401 subscribers ── */
type UnauthorizedCallback = () => void;
const _unauthorizedCallbacks: Set<UnauthorizedCallback> = new Set();

export const onUnauthorized = {
  subscribe: (cb: UnauthorizedCallback) => {
    _unauthorizedCallbacks.add(cb);
    return () => _unauthorizedCallbacks.delete(cb);
  },
  notify: () => _unauthorizedCallbacks.forEach((cb) => cb()),
};

/* ── Error parser ── */
export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

function extractDetail(data: unknown): string {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d['detail'] === 'string') return d['detail'];
    if (Array.isArray(d['detail'])) {
      return d['detail']
        .map((e: unknown) => {
          if (e && typeof e === 'object') {
            const err = e as Record<string, unknown>;
            return `${String(err['loc'] ?? '')} ${String(err['msg'] ?? '')}`.trim();
          }
          return String(e);
        })
        .join('; ');
    }
  }
  return 'An unexpected error occurred.';
}

/* ── Friendly error mapper ── */
export function parseApiError(raw: unknown): string {
  const msg = raw instanceof ApiError ? raw.detail : String(raw instanceof Error ? raw.message : raw);

  if (msg.includes('unique_admin_per_org') || msg.toLowerCase().includes('admin role is already allocated'))
    return 'This organisation already has an Admin — contact your admin or choose a different role.';
  if (msg.includes('unique_super_admin_global') || msg.toLowerCase().includes('super admin is already allocated'))
    return 'A Super Admin already exists globally — this role cannot be assigned again.';
  if (msg.toLowerCase().includes('email already registered'))
    return 'This email is already registered. Try signing in instead.';
  if (msg.toLowerCase().includes('invalid credentials'))
    return 'Invalid email or password. Please try again.';
  if (msg.toLowerCase().includes('no organisation assigned'))
    return 'Your account has no organisation assigned. Contact your Super Admin.';
  if (msg.toLowerCase().includes('consent required') || msg.toLowerCase().includes('not confirmed'))
    return 'You must confirm the upload consent before proceeding.';
  if (msg.toLowerCase().includes('embedding failed'))
    return 'Document embedding failed — the file may be corrupted or unsupported.';
  if (msg.toLowerCase().includes('403') || msg.toLowerCase().includes('forbidden'))
    return 'You do not have permission to perform this action.';

  return msg;
}

/* ── Is role-conflict error (for inline display on role field) ── */
export function isRoleConflictError(msg: string): boolean {
  return (
    msg.includes('unique_admin_per_org') ||
    msg.toLowerCase().includes('admin role is already allocated') ||
    msg.includes('unique_super_admin_global') ||
    msg.toLowerCase().includes('super admin is already allocated')
  );
}

/* ── Core fetch wrapper ── */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  parseJson = true,
): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const token = tokenStore.get();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    tokenStore.clear();
    onUnauthorized.notify();
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  if (!parseJson) return undefined as T;

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
    return undefined as T;
  }

  if (!res.ok) {
    throw new ApiError(res.status, extractDetail(data));
  }

  return data as T;
}

/* ── Convenience helpers ── */
export const apiGet = <T>(path: string, params?: Record<string, string | number>) => {
  const url = params
    ? `${path}?${new URLSearchParams(
        Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      ).toString()}`
    : path;
  return apiFetch<T>(url, { method: 'GET' });
};

export const apiPost = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const apiPostForm = <T>(path: string, formData: FormData) =>
  apiFetch<T>(path, { method: 'POST', body: formData });
