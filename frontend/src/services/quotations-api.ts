import { apiClient } from './api-client';

export type QuotationStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'EXPIRED';

export interface QuoteLineItem {
  id: string;
  quotationId: string;
  itemName: string;
  description?: string | null;
  quantity: number;
  unitPrice: string | number;
  subtotal: string | number;
}

export interface Quotation {
  id: string;
  organizationId: string;
  opportunityId: string;
  version: number;
  discountPercentage: string | number;
  taxPercentage: string | number;
  subtotal: string | number;
  total: string | number;
  status: QuotationStatus;
  expiresAt: string;
  requiresApproval: boolean;
  approved: boolean;
  approvedById?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  lineItems: QuoteLineItem[];
}

export interface QuoteLineItemInput {
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
}

export interface QuotationInput {
  opportunityId: string;
  expiresAt: string;
  discountPercentage?: number;
  taxPercentage?: number;
  lineItems: QuoteLineItemInput[];
}

export interface ListQuotationsResponse {
  data: Quotation[];
  total: number;
}

export const quotationsApi = {
  list: async (params: {
    opportunityId?: string;
    page?: number;
    limit?: number;
  }): Promise<ListQuotationsResponse> => {
    const res = await apiClient.get<ListQuotationsResponse>('/quotations', { params });
    return res.data;
  },

  get: async (id: string): Promise<Quotation> => {
    const res = await apiClient.get<Quotation>(`/quotations/${id}`);
    return res.data;
  },

  create: async (data: QuotationInput): Promise<Quotation> => {
    const res = await apiClient.post<Quotation>('/quotations', data);
    return res.data;
  },

  update: async (id: string, data: Partial<QuotationInput>): Promise<Quotation> => {
    const res = await apiClient.put<Quotation>(`/quotations/${id}`, data);
    return res.data;
  },

  approve: async (id: string): Promise<Quotation> => {
    const res = await apiClient.post<Quotation>(`/quotations/${id}/approve`);
    return res.data;
  },

  transitionStatus: async (id: string, status: QuotationStatus): Promise<Quotation> => {
    const res = await apiClient.put<Quotation>(`/quotations/${id}/status`, { status });
    return res.data;
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const res = await apiClient.delete<{ success: boolean }>(`/quotations/${id}`);
    return res.data;
  },
};
