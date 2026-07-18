import { apiClient } from './api-client';

export type ProjectStatus = 'IN_PROGRESS' | 'SUSPENDED' | 'COMPLETED';

export interface OnboardingMilestone {
  id: string;
  organizationId: string;
  projectOnboardingId: string;
  title: string;
  completed: boolean;
  completedAt?: string | null;
  dueDate?: string | null;
  createdAt: string;
}

export interface ProjectOnboarding {
  id: string;
  organizationId: string;
  opportunityId: string;
  assignedManagerId?: string | null;
  name: string;
  status: ProjectStatus;
  templateType: string;
  targetStartDate: string;
  completedAt?: string | null;
  createdAt: string;
  assignedManager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  opportunity: {
    id: string;
    name: string;
    amount: string | number;
    account: {
      id: string;
      name: string;
      domain: string;
    };
  };
  milestones: OnboardingMilestone[];
}

export interface ListProjectsResponse {
  data: ProjectOnboarding[];
  total: number;
}

export interface UpdateProjectInput {
  name?: string;
  status?: ProjectStatus;
  templateType?: string;
  targetStartDate?: string;
  assignedManagerId?: string | null;
}

export interface CreateMilestoneInput {
  title: string;
  dueDate?: string;
}

export interface UpdateMilestoneInput {
  title?: string;
  completed?: boolean;
  dueDate?: string | null;
}

export const projectsApi = {
  list: async (params: {
    page: number;
    limit: number;
    status?: string;
    managerId?: string;
    search?: string;
  }): Promise<ListProjectsResponse> => {
    const res = await apiClient.get<ListProjectsResponse>('/projects', { params });
    return res.data;
  },

  get: async (id: string): Promise<ProjectOnboarding> => {
    const res = await apiClient.get<ProjectOnboarding>(`/projects/${id}`);
    return res.data;
  },

  update: async (id: string, data: UpdateProjectInput): Promise<ProjectOnboarding> => {
    const res = await apiClient.put<ProjectOnboarding>(`/projects/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const res = await apiClient.delete<{ success: boolean }>(`/projects/${id}`);
    return res.data;
  },

  createMilestone: async (projectId: string, data: CreateMilestoneInput): Promise<OnboardingMilestone> => {
    const res = await apiClient.post<OnboardingMilestone>(`/projects/${projectId}/milestones`, data);
    return res.data;
  },

  updateMilestone: async (
    projectId: string,
    milestoneId: string,
    data: UpdateMilestoneInput,
  ): Promise<OnboardingMilestone> => {
    const res = await apiClient.put<OnboardingMilestone>(
      `/projects/${projectId}/milestones/${milestoneId}`,
      data,
    );
    return res.data;
  },

  deleteMilestone: async (projectId: string, milestoneId: string): Promise<{ success: boolean }> => {
    const res = await apiClient.delete<{ success: boolean }>(
      `/projects/${projectId}/milestones/${milestoneId}`,
    );
    return res.data;
  },
};
