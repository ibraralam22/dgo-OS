import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/auth-store';
import { toast } from '../utils/toast';

/**
 * Base URL points at the Next.js rewrite proxy (/api/proxy/*).
 * Requests never leave the browser to hit the backend directly —
 * Next.js forwards them server-side.
 *
 * Falls back to the old NEXT_PUBLIC_API_URL for backward compatibility
 * during any transition period.
 */
const baseURL =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  '/api/proxy';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15_000, // 15 s — fail fast, don't hang the UI
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor ──────────────────────────────────────────────────────
// Inject Bearer token + tenant context on every outbound request.
apiClient.interceptors.request.use(
  (config) => {
    const state = useAuthStore.getState();
    const token = state.accessToken;
    const tenantId = state.activeOrganizationId;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (tenantId) {
      config.headers['x-tenant-id'] = tenantId;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor ─────────────────────────────────────────────────────
// Centralised error handling — every HTTP error passes through here first.
// Individual mutation onError handlers can still override/add behaviour,
// but they no longer need to call toast.error() themselves.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string | string[]; error?: string }>) => {
    const status = error.response?.status;

    // ── No response at all (network down, timeout, CORS) ─────────────────────
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        toast.error('Request timed out. Please try again.');
      } else {
        toast.error('Cannot reach server. Check your connection.');
      }
      return Promise.reject(error);
    }

    // ── 400 Bad Request / 422 Unprocessable Entity ────────────────────────────
    // NestJS validation errors — show the first meaningful message.
    if (status === 400 || status === 422) {
      const raw = error.response.data?.message;
      const msg = Array.isArray(raw)
        ? raw[0]
        : raw ?? 'Invalid request. Please check your input.';
      toast.error(msg);
      return Promise.reject(error);
    }

    // ── 401 Unauthorized ──────────────────────────────────────────────────────
    // Session expired or invalid token — clear state and redirect.
    if (status === 401) {
      const logout = useAuthStore.getState().logout;
      logout();
      toast.error('Your session has expired. Please sign in again.');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // ── 403 Forbidden ─────────────────────────────────────────────────────────
    if (status === 403) {
      toast.error('You do not have permission to perform this action.');
      return Promise.reject(error);
    }

    // ── 404 Not Found ─────────────────────────────────────────────────────────
    if (status === 404) {
      toast.error('The requested resource was not found.');
      return Promise.reject(error);
    }

    // ── 409 Conflict (e.g. duplicate email) ───────────────────────────────────
    if (status === 409) {
      const raw = error.response.data?.message;
      const msg = typeof raw === 'string' ? raw : 'A conflict occurred. The resource may already exist.';
      toast.error(msg);
      return Promise.reject(error);
    }

    // ── 429 Too Many Requests ─────────────────────────────────────────────────
    if (status === 429) {
      toast.error('Too many requests. Please wait a moment and try again.');
      return Promise.reject(error);
    }

    // ── 5xx Server Errors ─────────────────────────────────────────────────────
    if (status && status >= 500) {
      toast.error('A server error occurred. Please try again shortly.');
      return Promise.reject(error);
    }

    // ── Catch-all for any other status ────────────────────────────────────────
    toast.error('An unexpected error occurred.');
    return Promise.reject(error);
  },
);
