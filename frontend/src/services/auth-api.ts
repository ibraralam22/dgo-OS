import { apiClient } from './api-client';
import { UserProfile, OrganizationInfo } from '../store/auth-store';

export interface AuthSessionResponse {
  mfaRequired: false;
  accessToken: string;
  user: UserProfile;
  organizations: OrganizationInfo[];
}

export interface MfaTicketResponse {
  mfaRequired: true;
  mfaTicket: string;
}

export type LoginResponse = AuthSessionResponse | MfaTicketResponse;

export const authApi = {
  /**
   * Submit credentials for authentication. Can return either user session details
   * or a short-lived ticket to request subsequent MFA validation.
   */
  async login(credentials: Record<string, string>): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return data;
  },

  /**
   * Submit secondary factor TOTP token alongside authentication ticket.
   */
  async verifyMfa(mfaTicket: string, totpCode: string): Promise<AuthSessionResponse> {
    const { data } = await apiClient.post<AuthSessionResponse>('/auth/login/mfa', {
      mfaTicket,
      totpCode,
    });
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
