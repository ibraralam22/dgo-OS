import { apiClient } from './api-client';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskEntityType = 'lead' | 'account' | 'opportunity' | 'project';

export interface Task {
  id: string;
  organizationId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  completedAt?: string | null;
  entityType?: TaskEntityType | null;
  entityId?: string | null;
  assignedToId?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; firstName: string; lastName: string; email: string } | null;
  createdBy: { id: string; firstName: string; lastName: string };
}

export interface TaskKpis {
  total: number;
  overdue: number;
  completedToday: number;
  urgentHigh: number;
  myOpen: number;
}

export interface ListTasksResponse {
  data: Task[];
  total: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
  entityType?: TaskEntityType;
  entityId?: string;
  assignedToId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
  entityType?: TaskEntityType;
  entityId?: string;
  assignedToId?: string | null;
}

export const tasksApi = {
  kpis: async (): Promise<TaskKpis> => {
    const res = await apiClient.get<TaskKpis>('/tasks/kpis');
    return res.data;
  },

  list: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    assignedToId?: string;
    entityType?: string;
    entityId?: string;
    overdue?: boolean;
    search?: string;
  }): Promise<ListTasksResponse> => {
    const res = await apiClient.get<ListTasksResponse>('/tasks', { params });
    return res.data;
  },

  myTasks: async (params?: { page?: number; limit?: number; status?: string }): Promise<ListTasksResponse> => {
    const res = await apiClient.get<ListTasksResponse>('/tasks/my', { params });
    return res.data;
  },

  get: async (id: string): Promise<Task> => {
    const res = await apiClient.get<Task>(`/tasks/${id}`);
    return res.data;
  },

  create: async (data: CreateTaskInput): Promise<Task> => {
    const res = await apiClient.post<Task>('/tasks', data);
    return res.data;
  },

  update: async (id: string, data: UpdateTaskInput): Promise<Task> => {
    const res = await apiClient.put<Task>(`/tasks/${id}`, data);
    return res.data;
  },

  patchStatus: async (id: string, status: TaskStatus): Promise<Task> => {
    const res = await apiClient.patch<Task>(`/tasks/${id}/status`, { status });
    return res.data;
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const res = await apiClient.delete<{ success: boolean }>(`/tasks/${id}`);
    return res.data;
  },
};
