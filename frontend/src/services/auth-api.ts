import { apiClient } from './api-client';
import { UserProfile, OrganizationInfo } from '../store/auth-store';

export interface AuthSessionResponse {
  accessToken: string;
  user: UserProfile;
  organizations: OrganizationInfo[];
}

export const authApi = {
  /**
   * Submit credentials for authentication and receive a session.
   */
  async login(credentials: Record<string, string>): Promise<AuthSessionResponse> {
    const { data } = await apiClient.post<AuthSessionResponse>('/auth/login', credentials);
    return data;
  },

  /**
   * Refresh session credentials, updating CSRF cookies and local storage state.
   */
  async refresh(): Promise<AuthSessionResponse> {
    const { data } = await apiClient.post<AuthSessionResponse>('/auth/refresh');
    return data;
  },

  /**
   * Revoke current active session refresh family and sign user out.
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
};
