import { apiClient } from './api-client';

export interface SystemStatusResponse {
  tenantStatus: string;
  stripeWebhooks: string;
  databaseMode: string;
  authMethod: string;
  securityLevel: string;
}

export const systemApi = {
  async getStatus(): Promise<SystemStatusResponse> {
    const { data } = await apiClient.get<SystemStatusResponse>('/system/status');
    return data;
  },
};
