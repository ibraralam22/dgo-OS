import { apiClient } from './api-client';

export interface LeadOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface LeadListItem {
  id: string;
  organizationId: string;
  ownerId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName: string;
  website?: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'nurturing' | 'unqualified' | 'converted';
  score: number;
  budget?: string | number;
  convertedAt?: string;
  createdAt: string;
  owner?: LeadOwner;
}

export interface ListLeadsResponse {
  data: LeadListItem[];
  total: number;
}

export interface LeadInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName: string;
  website?: string;
  source: string;
  status?: string;
  score?: number;
  budget?: number;
  ownerId?: string;
}

export const leadsApi = {
  list: async (params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }): Promise<ListLeadsResponse> => {
    const res = await apiClient.get<ListLeadsResponse>('/leads', { params });
    return res.data;
  },

  get: async (id: string): Promise<LeadListItem> => {
    const res = await apiClient.get<LeadListItem>(`/leads/${id}`);
    return res.data;
  },

  create: async (data: LeadInput): Promise<LeadListItem> => {
    const res = await apiClient.post<LeadListItem>('/leads', data);
    return res.data;
  },

  update: async (id: string, data: Partial<LeadInput>): Promise<LeadListItem> => {
    const res = await apiClient.put<LeadListItem>(`/leads/${id}`, data);
    return res.data;
  },

  convert: async (id: string): Promise<LeadListItem> => {
    const res = await apiClient.post<LeadListItem>(`/leads/${id}/convert`);
    return res.data;
  },

  delete: async (id: string): Promise<LeadListItem> => {
    const res = await apiClient.delete<LeadListItem>(`/leads/${id}`);
    return res.data;
  },
};
