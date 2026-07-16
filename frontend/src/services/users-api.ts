import { apiClient } from './api-client';

export interface UserRoleSummary {
  id: string;
  name: string;
  description: string | null;
}

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  timezone: string;
  createdAt: string;
  role: UserRoleSummary;
}

export interface PaginatedUsers {
  data: UserListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleName: string;
  password: string;
  status?: string;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: string;
}

export const usersApi = {
  /**
   * List users in the active organization with optional filters.
   */
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    role?: string;
  }): Promise<PaginatedUsers & { success: boolean }> {
    const { data } = await apiClient.get('/users', { params });
    return data;
  },

  /**
   * Get a single user profile by ID.
   */
  async get(id: string): Promise<{ success: boolean; data: UserListItem }> {
    const { data } = await apiClient.get(`/users/${id}`);
    return data;
  },

  /**
   * Create a new user and associate with the active organization.
   */
  async create(payload: CreateUserPayload): Promise<{ success: boolean; message: string; data: Partial<UserListItem> }> {
    const { data } = await apiClient.post('/users', payload);
    return data;
  },

  /**
   * Update user profile fields.
   */
  async update(id: string, payload: UpdateUserPayload): Promise<{ success: boolean; data: Partial<UserListItem> }> {
    const { data } = await apiClient.put(`/users/${id}`, payload);
    return data;
  },

  /**
   * Update a user's role within the active organization.
   */
  async updateRole(id: string, roleName: string): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.put(`/users/${id}/role`, { roleName });
    return data;
  },

  /**
   * Remove a user from the active organization.
   */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.delete(`/users/${id}`);
    return data;
  },
};
