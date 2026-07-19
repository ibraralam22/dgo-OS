import { apiClient } from './api-client';

export interface UserProfileSettings {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  timezone: string;
  status: string;
}

export interface OrganizationSettings {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  phone?: string | null;
  address?: string | null;
  defaultCurrency: string;
  timezone: string;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  timezone?: string;
}

export interface ChangePasswordInput {
  currentPassword?: string;
  newPassword?: string;
}

export interface UpdateOrganizationInput {
  name: string;
  phone?: string;
  address?: string;
  defaultCurrency?: string;
  timezone?: string;
}

export const settingsApi = {
  getProfile: async (): Promise<UserProfileSettings> => {
    const res = await apiClient.get<UserProfileSettings>('/settings/profile');
    return res.data;
  },

  updateProfile: async (data: UpdateProfileInput): Promise<UserProfileSettings> => {
    const res = await apiClient.put<UserProfileSettings>('/settings/profile', data);
    return res.data;
  },

  changePassword: async (data: ChangePasswordInput): Promise<{ success: boolean }> => {
    const res = await apiClient.put<{ success: boolean }>('/settings/profile/password', data);
    return res.data;
  },

  getOrganization: async (): Promise<OrganizationSettings> => {
    const res = await apiClient.get<OrganizationSettings>('/settings/organization');
    return res.data;
  },

  updateOrganization: async (data: UpdateOrganizationInput): Promise<OrganizationSettings> => {
    const res = await apiClient.put<OrganizationSettings>('/settings/organization', data);
    return res.data;
  },
};
