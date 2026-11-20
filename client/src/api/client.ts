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

export type ErrorContext = 'chat' | 'upload' | 'auth' | 'admin' | 'general';

export interface ParsedErrorDetails {
  title: string;
  message: string;
  category: 'network' | 'rate_limit' | 'context_length' | 'auth' | 'permission' | 'document' | 'llm' | 'server' | 'validation' | 'unknown';
  actionLabel?: string;
  actionType?: 'retry' | 'new_chat' | 'login' | 'reupload';
  retryable: boolean;
}

/* ── Context-Aware & Situation-Based Error Classifier ── */
export function classifyApiError(
  raw: unknown,
  context: ErrorContext = 'general',
  filename?: string
): ParsedErrorDetails {
  if (!raw) {
    return {
      title: 'Unexpected Error',
      message: 'An unexpected issue occurred. Please try again.',
      category: 'unknown',
      actionLabel: 'Retry',
      actionType: 'retry',
      retryable: true,
    };
  }

  let msg = raw instanceof ApiError ? raw.detail : String(raw instanceof Error ? raw.message : raw);
  if (!msg || typeof msg !== 'string') {
    return {
      title: 'Unexpected Error',
      message: 'An unexpected issue occurred. Please try again.',
      category: 'unknown',
      actionLabel: 'Retry',
      actionType: 'retry',
      retryable: true,
    };
  }

  // If the error message is a raw JSON string, unwrap detail / message
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

  // ── 1. Network & Connection Interruption ──
  const isNetwork =
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('fetch failed') ||
    lower.includes('err_connection') ||
    lower.includes('connection refused') ||
    lower.includes('err_network') ||
    lower.includes('err_internet_disconnected') ||
    lower.includes('prematurely closed') ||
    lower.includes('connection was interrupted') ||
    lower.includes('stream closed') ||
    lower.includes('load failed');

  if (isNetwork) {
    if (context === 'chat') {
      return {
        title: 'Connection Interrupted',
        message: 'The connection to the AI generation stream was interrupted. Please check your network and try sending your query again.',
        category: 'network',
        actionLabel: 'Retry Query',
        actionType: 'retry',
        retryable: true,
      };
    }
    if (context === 'upload') {
      return {
        title: 'Upload Interrupted',
        message: 'The file upload stream was interrupted. Please verify your connection and re-upload the document.',
        category: 'network',
        actionLabel: 'Retry Upload',
        actionType: 'reupload',
        retryable: true,
      };
    }
    if (context === 'auth') {
      return {
        title: 'Network Error',
        message: 'Unable to reach the authentication service. Please check your internet connection.',
        category: 'network',
        actionLabel: 'Try Again',
        actionType: 'retry',
        retryable: true,
      };
    }
    if (context === 'admin') {
      return {
        title: 'Connection Error',
        message: 'Unable to contact the server to complete this administrative request. Please check your network connection.',
        category: 'network',
        actionLabel: 'Retry',
        actionType: 'retry',
        retryable: true,
      };
    }
    return {
      title: 'Connection Lost',
      message: 'Network connection was interrupted. Please verify your connection and try again.',
      category: 'network',
      actionLabel: 'Retry',
      actionType: 'retry',
      retryable: true,
    };
  }

  // ── 2. AI Model Rate Limiting & High Traffic ──
  if (
    lower.includes('rate limit') ||
    lower.includes('ratelimit') ||
    lower.includes('429') ||
    lower.includes('too many requests') ||
    lower.includes('quota exceeded') ||
    lower.includes('resource_exhausted')
  ) {
    return {
      title: 'Model Capacity Reached',
      message: 'The AI service is experiencing high query volume or rate limits. Please pause a moment before retrying.',
      category: 'rate_limit',
      actionLabel: 'Try Again',
      actionType: 'retry',
      retryable: true,
    };
  }

  // ── 3. Token Context Length / Prompt Too Large ──
  if (
    lower.includes('context_length_exceeded') ||
    lower.includes('maximum context length') ||
    lower.includes('too many tokens') ||
    lower.includes('prompt is too long') ||
    lower.includes('prompt too long')
  ) {
    return {
      title: 'Context Length Exceeded',
      message: 'This query or conversation history exceeds the model capacity. Try shortening your question or starting a fresh chat session.',
      category: 'context_length',
      actionLabel: 'New Chat',
      actionType: 'new_chat',
      retryable: false,
    };
  }

  // ── 4. AI Engine / Model Provider Failover ──
  if (
    lower.includes('model_not_found') ||
    lower.includes('models failed') ||
    lower.includes('allam') ||
    lower.includes('groq') ||
    lower.includes('llama') ||
    lower.includes('qwen') ||
    lower.includes('llm generation failed')
  ) {
    return {
      title: 'AI Generation Error',
      message: 'The AI model is temporarily unavailable. The system will attempt failover — please resubmit your query.',
      category: 'llm',
      actionLabel: 'Retry Query',
      actionType: 'retry',
      retryable: true,
    };
  }

  // ── 5. Authentication & Session Expiry ──
  if (
    lower.includes('401') ||
    lower.includes('unauthorized') ||
    lower.includes('session expired') ||
    lower.includes('jwt expired') ||
    lower.includes('token invalid') ||
    lower.includes('token expired')
  ) {
    return {
      title: 'Session Expired',
      message: 'Your active session has expired for security. Please sign in again to continue.',
      category: 'auth',
      actionLabel: 'Sign In',
      actionType: 'login',
      retryable: false,
    };
  }

  // ── 6. Permissions & Governance (RBAC) ──
  if (
    lower.includes('403') ||
    lower.includes('forbidden') ||
    lower.includes('permission denied') ||
    lower.includes('not allowed') ||
    lower.includes('admin only') ||
    lower.includes('global upload permission is disabled')
  ) {
    return {
      title: 'Access Restricted',
      message: lower.includes('global upload permission')
        ? 'Global upload is disabled for your account. You can still upload files to your private 1-hour session sandbox, or contact your administrator.'
        : 'You do not have permission to perform this action. Contact your organisation administrator.',
      category: 'permission',
      retryable: false,
    };
  }

  if (lower.includes('unique_admin_per_org') || lower.includes('admin role is already allocated')) {
    return {
      title: 'Admin Role Conflict',
      message: 'This organisation already has an allocated Admin. Only one Admin is permitted per organisation.',
      category: 'permission',
      retryable: false,
    };
  }
  if (lower.includes('unique_super_admin_global') || lower.includes('super admin is already allocated')) {
    return {
      title: 'Super Admin Conflict',
      message: 'A Super Admin already exists globally — this role cannot be assigned again.',
      category: 'permission',
      retryable: false,
    };
  }
  if (lower.includes('account suspended') || lower.includes('organization inactive')) {
    return {
      title: 'Account Inactive',
      message: 'This organisation or account is currently inactive. Please contact support.',
      category: 'auth',
      retryable: false,
    };
  }
  if (lower.includes('email already registered')) {
    return {
      title: 'Email Already Registered',
      message: 'An account with this email already exists. Try signing in instead.',
      category: 'auth',
      actionLabel: 'Sign In',
      actionType: 'login',
      retryable: false,
    };
  }
  if (lower.includes('invalid credentials') || lower.includes('incorrect password')) {
    return {
      title: 'Invalid Credentials',
      message: 'Incorrect email or password. Please verify and try again.',
      category: 'auth',
      retryable: true,
    };
  }
  if (lower.includes('incorrect otp')) {
    return {
      title: 'Invalid Verification Code',
      message: 'The 6-digit code is incorrect. Please check your email and try again.',
      category: 'auth',
      retryable: true,
    };
  }
  if (lower.includes('otp expired') || lower.includes('invalid or expired otp')) {
    return {
      title: 'Code Expired',
      message: 'The verification code has expired. Please request a new code.',
      category: 'auth',
      retryable: true,
    };
  }

  // ── 7. Document Extraction & Formats (Strictly for 'upload' context) ──
  if (context === 'upload') {
    const ext = filename ? filename.split('.').pop()?.toLowerCase() : '';

    // PPTX / Presentations (Check FIRST to prevent "or upload as PDF" in PPTX error from triggering PDF parser)
    if (ext === 'pptx' || (!ext && (lower.includes('pptx') || lower.includes('presentation') || lower.includes('slide')))) {
      return {
        title: 'Presentation Parsing Error',
        message: 'Unable to extract text from presentation slides (.pptx). Please ensure slides contain extractable text content or try uploading as PDF.',
        category: 'document',
        actionLabel: 'Choose Another File',
        actionType: 'reupload',
        retryable: true,
      };
    }

    // XLSX / Spreadsheets
    if (ext === 'xlsx' || ext === 'csv' || (!ext && (lower.includes('xlsx') || lower.includes('spreadsheet') || lower.includes('sheet') || (lower.includes('excel') && !lower.includes('exception'))))) {
      return {
        title: 'Spreadsheet Parsing Error',
        message: 'Unable to parse spreadsheet. Please ensure it is a valid, uncorrupted Excel (.xlsx) or CSV file with legible rows.',
        category: 'document',
        actionLabel: 'Choose Another File',
        actionType: 'reupload',
        retryable: true,
      };
    }

    // DOCX / Word
    if (ext === 'docx' || (!ext && (lower.includes('docx') || lower.includes('word document')))) {
      return {
        title: 'Word Document Error',
        message: 'Unable to extract readable text from this Word document (.docx). The file may contain unsupported formatting, custom macros, or password protection.',
        category: 'document',
        actionLabel: 'Choose Another File',
        actionType: 'reupload',
        retryable: true,
      };
    }

    // PDF (Only check after PPTX, XLSX, DOCX have been evaluated)
    if (ext === 'pdf' || (!ext && (lower.includes('pdf') || lower.includes('scanned') || lower.includes('ocr')))) {
      return {
        title: 'PDF Parsing Error',
        message: 'Unable to extract readable text from this PDF. It may contain non-searchable image scans or password protection.',
        category: 'document',
        actionLabel: 'Choose Another File',
        actionType: 'reupload',
        retryable: true,
      };
    }

    // HTML / Web
    if (ext === 'html' || ext === 'htm' || lower.includes('html')) {
      return {
        title: 'HTML Parsing Error',
        message: 'Unable to extract readable content from this HTML file. Please verify file encoding.',
        category: 'document',
        actionLabel: 'Choose Another File',
        actionType: 'reupload',
        retryable: true,
      };
    }

    if (lower.includes('max_files') || lower.includes('too many files')) {
      return {
        title: 'Batch Limit Exceeded',
        message: 'You can upload a maximum of 5 files per batch.',
        category: 'validation',
        retryable: false,
      };
    }
    if (lower.includes('duplicate') || lower.includes('alias')) {
      return {
        title: 'Document Already Indexed',
        message: 'A document with identical content is already indexed and up to date.',
        category: 'document',
        retryable: false,
      };
    }
  }

  // ── 8. Backend Internal Stack Trace & Database Leak Prevention ──
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
    if (context === 'chat') {
      return {
        title: 'Generation Error',
        message: 'An internal server issue occurred while processing your response. The error has been logged. Please try submitting again.',
        category: 'server',
        actionLabel: 'Retry Query',
        actionType: 'retry',
        retryable: true,
      };
    }
    if (context === 'upload') {
      return {
        title: 'Indexing Error',
        message: 'An internal error occurred while indexing this document. Please verify the file integrity or try another document.',
        category: 'server',
        actionLabel: 'Retry Upload',
        actionType: 'reupload',
        retryable: true,
      };
    }
    if (context === 'admin') {
      return {
        title: 'Operation Failed',
        message: 'An internal error occurred while executing this administrative command. The incident has been recorded.',
        category: 'server',
        actionLabel: 'Retry',
        actionType: 'retry',
        retryable: true,
      };
    }
    return {
      title: 'Server Error',
      message: 'An internal processing error occurred while handling this request. Please try again in a moment.',
      category: 'server',
      actionLabel: 'Retry',
      actionType: 'retry',
      retryable: true,
    };
  }

  // ── 9. Overly long server error dumps ──
  if (msg.length > 220) {
    return {
      title: 'Processing Error',
      message: context === 'chat'
        ? 'The assistant encountered an unexpected error while answering. Please try submitting again.'
        : 'The server encountered an unexpected error while processing your request. Please try again.',
      category: 'unknown',
      actionLabel: 'Retry',
      actionType: 'retry',
      retryable: true,
    };
  }

  // ── 10. Clean user-facing fallback ──
  return {
    title: 'Notice',
    message: msg,
    category: 'unknown',
    actionLabel: 'Retry',
    actionType: 'retry',
    retryable: true,
  };
}

/* ── Friendly & Secure error mapper (Backward compatible) ── */
export function parseApiError(
  raw: unknown,
  context: ErrorContext = 'general',
  filename?: string
): string {
  return classifyApiError(raw, context, filename).message;
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
