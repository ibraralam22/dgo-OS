import { apiClient } from '@services/api-client';

export type NotificationStatus = 'all' | 'unread';
export type NotificationCategory = 'CRM_ACTIVITY' | 'TASK_REMINDER' | 'CALENDAR_REMINDER';

export interface Notification {
  id: string;
  organizationId: string;
  recipientId: string;
  actorId?: string | null;
  resourceType: string;
  resourceId?: string | null;
  category: NotificationCategory;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationsResponse { data: Notification[]; total: number; }

export const notificationsApi = {
  list: async (params: { status?: NotificationStatus; page?: number; limit?: number } = {}): Promise<NotificationsResponse> => (await apiClient.get<NotificationsResponse>('/notifications', { params })).data,
  unreadCount: async (): Promise<{ count: number }> => (await apiClient.get<{ count: number }>('/notifications/unread-count')).data,
  markRead: async (id: string): Promise<Notification> => (await apiClient.patch<Notification>(`/notifications/${id}/read`)).data,
  markAllRead: async (): Promise<{ updated: number }> => (await apiClient.post<{ updated: number }>('/notifications/mark-all-read')).data,
};
