import { apiClient } from './api-client';

export type OpportunityStage = 'DISCOVERY' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';

export interface AccountMin {
  id: string;
  name: string;
  domain: string;
}

export interface UserMin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface OpportunityListItem {
  id: string;
  organizationId: string;
  accountId: string;
  ownerId?: string | null;
  name: string;
  stage: OpportunityStage;
  amount: string | number;
  probability: number;
  closeDate: string;
  description?: string | null;
  lossReason?: string | null;
  competitorLostTo?: string | null;
  contractUrl?: string | null;
  requiresApproval: boolean;
  approved: boolean;
  createdAt: string;
  account?: AccountMin;
  owner?: UserMin | null;
}

export interface ListOpportunitiesResponse {
  data: OpportunityListItem[];
  total: number;
}

export interface OpportunityInput {
  name: string;
  accountId: string;
  ownerId?: string;
  amount: number;
  closeDate: string;
  description?: string;
}

export interface TransitionStageInput {
  stage: OpportunityStage;
  contractUrl?: string;
  lossReason?: string;
  competitorLostTo?: string;
}

export interface TransitionStageResponse {
  success: boolean;
  opportunity: OpportunityListItem;
  triggeredOnboardingId?: string | null;
}

export const opportunitiesApi = {
  list: async (params: {
    page: number;
    limit: number;
    search?: string;
    stage?: string;
    accountId?: string;
  }): Promise<ListOpportunitiesResponse> => {
    const res = await apiClient.get<ListOpportunitiesResponse>('/opportunities', { params });
    return res.data;
  },

  get: async (id: string): Promise<OpportunityListItem> => {
    const res = await apiClient.get<OpportunityListItem>(`/opportunities/${id}`);
    return res.data;
  },

  create: async (data: OpportunityInput): Promise<OpportunityListItem> => {
    const res = await apiClient.post<OpportunityListItem>('/opportunities', data);
    return res.data;
  },

  update: async (id: string, data: Partial<OpportunityInput>): Promise<OpportunityListItem> => {
    const res = await apiClient.put<OpportunityListItem>(`/opportunities/${id}`, data);
    return res.data;
  },

  transitionStage: async (id: string, data: TransitionStageInput): Promise<TransitionStageResponse> => {
    const res = await apiClient.put<TransitionStageResponse>(`/opportunities/${id}/stage`, data);
    return res.data;
  },

  approve: async (id: string): Promise<OpportunityListItem> => {
    const res = await apiClient.post<OpportunityListItem>(`/opportunities/${id}/approve`);
    return res.data;
  },

  delete: async (id: string): Promise<OpportunityListItem> => {
    const res = await apiClient.delete<OpportunityListItem>(`/opportunities/${id}`);
    return res.data;
  },

  getLogs: async (id: string): Promise<any[]> => {
    const res = await apiClient.get<any[]>(`/opportunities/${id}/logs`);
    return res.data;
  },
};
