import { apiClient } from './api-client';

export interface DashboardMetrics {
  role: string;
  userCount?: number;
  leads?: {
    total: number;
    conversionRate: string;
    growth?: string;
  };
  pipeline?: {
    value: string;
    deals: number;
  };
  billing?: {
    revenue: string;
    status: string;
  };
  tickets?: {
    open: number;
    resolved: number;
    slaStatus?: string;
  };
}

export interface AuditLogItem {
  id: string;
  action: string;
  resourceName: string;
  resourceId?: string;
  payloadBefore?: any;
  payloadAfter?: any;
  ipAddress?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export const dashboardApi = {
  getMetrics: async (): Promise<DashboardMetrics> => {
    const res = await apiClient.get<{ success: boolean; data: DashboardMetrics }>('/dashboard/metrics');
    return res.data.data;
  },
  getActivity: async (): Promise<AuditLogItem[]> => {
    const res = await apiClient.get<{ success: boolean; data: AuditLogItem[] }>('/dashboard/activity');
    return res.data.data;
  },
};
