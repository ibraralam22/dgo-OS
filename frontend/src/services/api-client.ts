import axios from 'axios';
import { useAuthStore } from '../store/auth-store';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Inject Bearer tokens and Tenant Context dynamically
apiClient.interceptors.request.use(
  (config) => {
    // Read the active client store details directly from Zustand
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
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor: Capture session expirations and handle 401 logouts
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const logout = useAuthStore.getState().logout;
      logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
