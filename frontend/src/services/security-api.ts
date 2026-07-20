import { apiClient } from './api-client';

export interface AuditLogUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuditLog {
  id: string;
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  resourceName: string;
  resourceId?: string | null;
  payloadBefore?: Record<string, any> | null;
  payloadAfter?: Record<string, any> | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: AuditLogUser | null;
}

export interface UserSession {
  id: string;
  userId: string;
  tokenFamilyId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: string;
  isRevoked: boolean;
  createdAt: string;
  user: AuditLogUser;
}

export interface AuditLogQueryResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const securityApi = {
  getAuditLogs: async (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    resourceName?: string;
    search?: string;
  }): Promise<AuditLogQueryResponse> => {
    const res = await apiClient.get<AuditLogQueryResponse>('/security/audit-logs', { params });
    return res.data;
  },

  getSessions: async (): Promise<UserSession[]> => {
    const res = await apiClient.get<UserSession[]>('/security/sessions');
    return res.data;
  },

  revokeSession: async (id: string): Promise<{ success: boolean }> => {
    const res = await apiClient.post<{ success: boolean }>(`/security/sessions/${id}/revoke`);
    return res.data;
  },
};
