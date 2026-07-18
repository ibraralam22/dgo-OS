import { apiClient } from './api-client';

export interface RoleListItem {
  id: string;
  name: string;
  description: string | null;
  organizationId: string | null;
  isSystem: boolean;
  permissionCount: number;
  userCount: number;
}

export interface PermissionItem {
  id: string;
  code: string;
  description: string | null;
}

export interface RoleDetail {
  id: string;
  name: string;
  description: string | null;
  organizationId: string | null;
  isSystem: boolean;
  permissions: string[];
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  permissionCodes: string[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  permissionCodes?: string[];
}

export const rolesApi = {
  /**
   * List all roles visible to the active organization.
   */
  async list(): Promise<{ success: boolean; data: RoleListItem[] }> {
    const { data } = await apiClient.get('/roles');
    return data;
  },

  /**
   * Fetch all system permissions available for custom roles.
   */
  async getPermissions(): Promise<{ success: boolean; data: PermissionItem[] }> {
    const { data } = await apiClient.get('/roles/permissions');
    return data;
  },

  /**
   * Get a single role's detail by ID.
   */
  async get(id: string): Promise<{ success: boolean; data: RoleDetail }> {
    const { data } = await apiClient.get(`/roles/${id}`);
    return data;
  },

  /**
   * Create a new custom role for the organization.
   */
  async create(payload: CreateRolePayload): Promise<{ success: boolean; message: string; data: Partial<RoleListItem> }> {
    const { data } = await apiClient.post('/roles', payload);
    return data;
  },

  /**
   * Update a custom role inside the organization.
   */
  async update(id: string, payload: UpdateRolePayload): Promise<{ success: boolean; message: string; data: Partial<RoleListItem> }> {
    const { data } = await apiClient.put(`/roles/${id}`, payload);
    return data;
  },

  /**
   * Delete a custom role from the organization.
   */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.delete(`/roles/${id}`);
    return data;
  },
};
