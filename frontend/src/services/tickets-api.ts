import { apiClient } from './api-client';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory = 'BILLING' | 'TECHNICAL' | 'GENERAL' | 'ACCOUNT';

export interface TicketComment {
  id: string;
  organizationId: string;
  ticketId: string;
  userId: string;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface Ticket {
  id: string;
  organizationId: string;
  accountId: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  createdById: string;
  assignedToId?: string | null;
  createdAt: string;
  updatedAt: string;
  account: { id: string; name: string; domain: string };
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  assignedTo?: { id: string; firstName: string; lastName: string; email: string } | null;
  comments: TicketComment[];
}

export interface TicketListItem {
  id: string;
  organizationId: string;
  accountId: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  createdAt: string;
  updatedAt: string;
  account: { id: string; name: string; domain: string };
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  assignedTo?: { id: string; firstName: string; lastName: string } | null;
  _count: { comments: number };
}

export interface TicketSummary {
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  highPriorityUnresolved: number;
}

export interface ListTicketsResponse {
  data: TicketListItem[];
  total: number;
}

export interface CreateTicketInput {
  accountId: string;
  subject: string;
  description: string;
  priority?: TicketPriority;
  category?: TicketCategory;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignedToId?: string | null;
}

export const ticketsApi = {
  summary: async (): Promise<TicketSummary> => {
    const res = await apiClient.get<TicketSummary>('/tickets/summary');
    return res.data;
  },

  list: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    category?: string;
    assignedToId?: string;
    search?: string;
  }): Promise<ListTicketsResponse> => {
    const res = await apiClient.get<ListTicketsResponse>('/tickets', { params });
    return res.data;
  },

  get: async (id: string): Promise<Ticket> => {
    const res = await apiClient.get<Ticket>(`/tickets/${id}`);
    return res.data;
  },

  create: async (data: CreateTicketInput): Promise<Ticket> => {
    const res = await apiClient.post<Ticket>('/tickets', data);
    return res.data;
  },

  update: async (id: string, data: UpdateTicketInput): Promise<Ticket> => {
    const res = await apiClient.put<Ticket>(`/tickets/${id}`, data);
    return res.data;
  },

  createComment: async (ticketId: string, comment: string): Promise<TicketComment> => {
    const res = await apiClient.post<TicketComment>(`/tickets/${ticketId}/comments`, { comment });
    return res.data;
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const res = await apiClient.delete<{ success: boolean }>(`/tickets/${id}`);
    return res.data;
  },
};
