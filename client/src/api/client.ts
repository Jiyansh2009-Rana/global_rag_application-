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

/* ── Friendly & Secure error mapper ── */
export function parseApiError(raw: unknown): string {
  if (!raw) return 'An unexpected error occurred. Please try again.';

  let msg = raw instanceof ApiError ? raw.detail : String(raw instanceof Error ? raw.message : raw);
  if (!msg || typeof msg !== 'string') return 'An unexpected error occurred.';

  // If the error message is raw JSON string, unwrap detail / message
  if (msg.trim().startsWith('{') && msg.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(msg.trim());
      if (typeof parsed.detail === 'string') msg = parsed.detail;
      else if (typeof parsed.message === 'string') msg = parsed.message;
      else if (typeof parsed.error?.message === 'string') msg = parsed.error.message;
    } catch {
      // not valid JSON, proceed with raw string
    }
  }

  const lower = msg.toLowerCase();

  // 1. Auth & Organization Governance
  if (lower.includes('unique_admin_per_org') || lower.includes('admin role is already allocated'))
    return 'This organisation already has an Admin — contact your admin or choose a different role.';
  if (lower.includes('unique_super_admin_global') || lower.includes('super admin is already allocated'))
    return 'A Super Admin already exists globally — this role cannot be assigned again.';
  if (lower.includes('email already registered'))
    return 'This email is already registered. Try signing in instead.';
  if (lower.includes('invalid credentials') || lower.includes('incorrect password'))
    return 'Invalid email or password. Please try again.';
  if (lower.includes('incorrect otp'))
    return 'Incorrect 6-digit code. Please check your email and try again.';
  if (lower.includes('otp expired') || lower.includes('invalid or expired otp'))
    return 'The verification code has expired. Please request a new one.';
  if (lower.includes('no organisation assigned'))
    return 'Your account has no organisation assigned. Contact your Super Admin.';
  if (lower.includes('consent required') || lower.includes('not confirmed'))
    return 'You must confirm the upload consent before proceeding.';
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('session expired') || lower.includes('jwt expired'))
    return 'Your session has expired. Please sign in again.';
  if (lower.includes('403') || lower.includes('forbidden') || lower.includes('permission denied') || lower.includes('not allowed'))
    return 'You do not have permission to perform this action.';
  if (lower.includes('account suspended') || lower.includes('organization inactive'))
    return 'This organisation or account is currently inactive. Contact your administrator.';

  // 2. Document Extraction & File Processing (Protects internal Python libraries & parser traces)
  if (lower.includes('docx') || lower.includes('word document'))
    return 'Document parsing error: Unable to extract content from this DOCX file. The file may contain unsupported formatting, custom macros, or corruption. Please re-save as standard DOCX or PDF and try again.';
  if (lower.includes('pdf') || lower.includes('scanned') || lower.includes('ocr'))
    return 'Document parsing error: Unable to extract readable text from this PDF. It may be password-protected, encrypted, or contain unreadable scans.';
  if (lower.includes('xlsx') || lower.includes('spreadsheet') || lower.includes('excel') || lower.includes('sheet'))
    return 'Spreadsheet parsing error: Unable to process this spreadsheet. Please ensure it is a valid, uncorrupted Excel (.xlsx) or CSV file.';
  if (lower.includes('pptx') || lower.includes('presentation') || lower.includes('slide'))
    return 'Presentation parsing error: Unable to read slides. Please verify that the presentation contains readable text.';
  if (lower.includes('html'))
    return 'HTML parsing error: Unable to extract content. Please ensure the file contains valid HTML markup.';
  if (lower.includes('extraction failed') || lower.includes('extract_text'))
    return 'Unable to extract text from this document. Please check the file for corruption or password-protection and try again.';
  if (lower.includes('embedding failed') || lower.includes('jina') || lower.includes('dimension'))
    return 'Document indexing error: The system was unable to generate vector embeddings for this file. Please verify file content and try again.';
  if (lower.includes('duplicate') || lower.includes('alias'))
    return 'Duplicate detected: A document with identical content is already indexed.';
  if (lower.includes('max_files') || lower.includes('too many files'))
    return 'Batch limit exceeded: You can upload a maximum of 5 files per batch.';

  // 3. AI / LLM Model Generation (Hides internal LLM model IDs, Groq token limits, and HTTP 502 details)
  if (
    lower.includes('token limit') ||
    lower.includes('rate limit') ||
    lower.includes('ratelimit') ||
    lower.includes('llm') ||
    lower.includes('model_not_found') ||
    lower.includes('models failed') ||
    lower.includes('allam') ||
    lower.includes('groq') ||
    lower.includes('llama') ||
    lower.includes('qwen')
  ) {
    return 'The AI assistant is temporarily unavailable or experiencing high demand. Please try asking your question again in a moment.';
  }

  // 4. Network & Connectivity
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('fetch failed') ||
    lower.includes('err_connection') ||
    lower.includes('connection refused') ||
    lower.includes('err_network') ||
    lower.includes('err_internet_disconnected')
  ) {
    return 'The connection was interrupted. This can happen with large or complex files — please check your connection and try again.';
  }

  // 5. Backend Internal Leak Prevention: Intercept raw exceptions, stack traces, and database terms
  const isBackendInternalLeak =
    lower.includes('traceback') ||
    lower.includes('nonetype') ||
    lower.includes('attributeerror') ||
    lower.includes('typeerror') ||
    lower.includes('valueerror') ||
    lower.includes('keyerror') ||
    lower.includes('indexerror') ||
    lower.includes('object has no attribute') ||
    lower.includes('has no attribute') ||
    lower.includes('syntax error') ||
    lower.includes('psycopg2') ||
    lower.includes('pgvector') ||
    lower.includes('neon') ||
    lower.includes('postgres') ||
    lower.includes('redis') ||
    lower.includes('supabase') ||
    lower.includes('pgrst') ||
    lower.includes('http 50') ||
    lower.includes('500 internal server error') ||
    lower.includes('502 bad gateway') ||
    lower.includes('503 service unavailable') ||
    lower.includes('file "/') ||
    lower.includes('line ') ||
    /0x[0-9a-fA-F]{4,}/.test(msg);

  if (isBackendInternalLeak) {
    return 'An internal processing error occurred while handling this request. The system administrator has been logged. Please try again or use a supported file format.';
  }

  // 6. Safeguard against excessively long raw server dumps
  if (msg.length > 220) {
    return 'The server encountered an unexpected error while processing your request. Please try again.';
  }

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

/* ── Deduplicated Access Token Refresh (15-min lifespan) ── */
let _refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (_refreshPromise) {
    return _refreshPromise;
  }

  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        tokenStore.clear();
        onUnauthorized.notify();
        return null;
      }

      const data = (await res.json()) as { access_token?: string };
      if (data && data.access_token) {
        tokenStore.set(data.access_token);
        return data.access_token;
      }

      tokenStore.clear();
      onUnauthorized.notify();
      return null;
    } catch {
      tokenStore.clear();
      onUnauthorized.notify();
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

/* ── Core fetch wrapper ── */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  parseJson = true,
): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const isAuthRoute =
    path.includes('/auth/login') ||
    path.includes('/auth/refresh') ||
    path.includes('/auth/signup') ||
    path.includes('/auth/verify-signup') ||
    path.includes('/auth/forgot-password') ||
    path.includes('/auth/reset-password');

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  const token = tokenStore.get();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  let res = await fetch(url, fetchOptions);

  // Handle 401: attempt automatic token refresh on non-auth routes
  if (res.status === 401 && !isAuthRoute) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      headers['Authorization'] = `Bearer ${refreshedToken}`;
      res = await fetch(url, { ...fetchOptions, headers });
    } else {
      tokenStore.clear();
      onUnauthorized.notify();
      throw new ApiError(401, 'Session expired. Please sign in again.');
    }
  }

  if (res.status === 401) {
    if (!isAuthRoute) {
      tokenStore.clear();
      onUnauthorized.notify();
    }
    let detail = 'Session expired. Please sign in again.';
    try {
      const errData = await res.json();
      detail = extractDetail(errData);
    } catch { /* ignore parse errors */ }
    throw new ApiError(401, detail);
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
