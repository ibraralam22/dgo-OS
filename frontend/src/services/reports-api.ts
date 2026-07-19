import { apiClient } from './api-client';

export type ReportCategory = 'SALES' | 'FINANCIAL' | 'SUPPORT';

export interface SavedReport {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  category: ReportCategory;
  config: Record<string, any>;
  createdAt: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface SalesAnalytics {
  totalDeals: number;
  pipelineValue: number;
  averageDealSize: number;
  winRate: number;
  stages: {
    stage: string;
    count: number;
    value: number;
  }[];
}

export interface FinancialAnalytics {
  invoicesCount: number;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  statuses: {
    status: string;
    count: number;
  }[];
  paymentMethods: {
    method: string;
    count: number;
    value: number;
  }[];
}

export interface SupportAnalytics {
  statuses: {
    status: string;
    count: number;
  }[];
  priorities: {
    priority: string;
    count: number;
  }[];
  categories: {
    category: string;
    count: number;
  }[];
}

export interface CreateSavedReportInput {
  name: string;
  description?: string;
  category: ReportCategory;
  config: Record<string, any>;
}

export const reportsApi = {
  getSales: async (params?: { fromDate?: string; toDate?: string }): Promise<SalesAnalytics> => {
    const res = await apiClient.get<SalesAnalytics>('/reports/sales', { params });
    return res.data;
  },

  getFinancial: async (params?: { fromDate?: string; toDate?: string }): Promise<FinancialAnalytics> => {
    const res = await apiClient.get<FinancialAnalytics>('/reports/financial', { params });
    return res.data;
  },

  getSupport: async (params?: { fromDate?: string; toDate?: string }): Promise<SupportAnalytics> => {
    const res = await apiClient.get<SupportAnalytics>('/reports/support', { params });
    return res.data;
  },

  listSaved: async (): Promise<SavedReport[]> => {
    const res = await apiClient.get<SavedReport[]>('/reports');
    return res.data;
  },

  createSaved: async (data: CreateSavedReportInput): Promise<SavedReport> => {
    const res = await apiClient.post<SavedReport>('/reports', data);
    return res.data;
  },

  deleteSaved: async (id: string): Promise<{ success: boolean }> => {
    const res = await apiClient.delete<{ success: boolean }>(`/reports/${id}`);
    return res.data;
  },
};
