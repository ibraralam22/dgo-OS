import { apiClient } from './api-client';

export type EventType = 'MEETING' | 'CALL' | 'DEMO' | 'FOLLOW_UP' | 'DEADLINE' | 'REMINDER' | 'OTHER';
export type RecurrenceFrequency = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type RsvpStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED';
export type EventEntityType = 'lead' | 'account' | 'opportunity' | 'project' | 'task';

export interface EventAttendee {
  eventId: string;
  userId: string;
  status: RsvpStatus;
  user: { id: string; firstName: string; lastName: string; email: string };
}

export interface CalendarEvent {
  id: string;
  organizationId: string;
  title: string;
  description?: string | null;
  type: EventType;
  startAt: string;
  endAt: string;
  allDay: boolean;
  location?: string | null;
  recurrence: RecurrenceFrequency;
  entityType?: EventEntityType | null;
  entityId?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  attendees: EventAttendee[];
}

export interface CreateEventInput {
  title: string;
  type: EventType;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  description?: string;
  location?: string;
  recurrence?: RecurrenceFrequency;
  entityType?: EventEntityType;
  entityId?: string;
  attendeeIds?: string[];
}

export interface UpdateEventInput {
  title?: string;
  type?: EventType;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  description?: string;
  location?: string;
  recurrence?: RecurrenceFrequency;
  entityType?: EventEntityType;
  entityId?: string;
}

export const calendarApi = {
  upcoming: async (limit = 5): Promise<CalendarEvent[]> => {
    const res = await apiClient.get<CalendarEvent[]>('/calendar/upcoming', { params: { limit } });
    return res.data;
  },

  list: async (params: {
    from: string;
    to: string;
    type?: string;
    entityType?: string;
    entityId?: string;
    myOnly?: boolean;
  }): Promise<CalendarEvent[]> => {
    const res = await apiClient.get<CalendarEvent[]>('/calendar/events', { params });
    return res.data;
  },

  get: async (id: string): Promise<CalendarEvent> => {
    const res = await apiClient.get<CalendarEvent>(`/calendar/events/${id}`);
    return res.data;
  },

  create: async (data: CreateEventInput): Promise<CalendarEvent> => {
    const res = await apiClient.post<CalendarEvent>('/calendar/events', data);
    return res.data;
  },

  update: async (id: string, data: UpdateEventInput): Promise<CalendarEvent> => {
    const res = await apiClient.put<CalendarEvent>(`/calendar/events/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const res = await apiClient.delete<{ success: boolean }>(`/calendar/events/${id}`);
    return res.data;
  },

  addAttendees: async (id: string, userIds: string[]): Promise<CalendarEvent> => {
    const res = await apiClient.post<CalendarEvent>(`/calendar/events/${id}/attendees`, { userIds });
    return res.data;
  },

  removeAttendee: async (id: string, userId: string): Promise<{ success: boolean }> => {
    const res = await apiClient.delete<{ success: boolean }>(`/calendar/events/${id}/attendees/${userId}`);
    return res.data;
  },

  rsvp: async (id: string, status: 'ACCEPTED' | 'DECLINED'): Promise<EventAttendee> => {
    const res = await apiClient.patch<EventAttendee>(`/calendar/events/${id}/attendees/me/rsvp`, { status });
    return res.data;
  },
};
