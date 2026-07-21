'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  calendarApi,
  CalendarEvent,
  EventType,
} from '@services/calendar-api';
import { usersApi } from '@services/users-api';
import { useAuthStore } from '@store/auth-store';
import { toast } from '@utils/toast';
import { cn } from '@utils/cn';
import { Button } from '@components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  LayoutGrid,
  List,
} from 'lucide-react';

import {
  EVENT_TYPE_CONFIG,
  MONTHS,
  getMonthWindow,
  buildCalendarGrid,
} from '@components/calendar/constants';
import { MonthView } from '@components/calendar/month-view';
import { AgendaView } from '@components/calendar/agenda-view';
import { EventDrawer } from '@components/calendar/event-drawer';
import { CreateEventModal } from '@components/calendar/create-event-modal';

export default function CalendarPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const today = new Date();

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [myOnly, setMyOnly] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const hasWrite = user?.permissions?.includes('calendar:write') ?? false;

  const { from, to } = useMemo(() => getMonthWindow(viewYear, viewMonth), [viewYear, viewMonth]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar-events', from, to, myOnly],
    queryFn: () => calendarApi.list({ from, to, myOnly }),
    staleTime: 60_000,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-dropdown-list'],
    queryFn: () => usersApi.list({ page: 1, limit: 100 }),
  });
  const orgUsers = usersData?.data || [];

  const grid = useMemo(() => buildCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const eventsPerDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((ev) => {
      const d = new Date(ev.startAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    });
    return map;
  }, [events]);

  const getDayEvents = useCallback(
    (date: Date) => eventsPerDay.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`) || [],
    [eventsPerDay],
  );

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }
  function goToday() { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => calendarApi.delete(id),
    onSuccess: () => { invalidate(); toast.success('Event deleted'); setSelectedEvent(null); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACCEPTED' | 'DECLINED' }) => calendarApi.rsvp(id, status),
    onSuccess: () => { invalidate(); toast.success('RSVP updated'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'RSVP failed'),
  });

  return (
    <div className="flex flex-col gap-6 pb-12 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black tracking-tight text-foreground">Calendar</h1>
          <p className="text-xs text-muted-foreground">Schedule and track meetings, calls, demos, and deadlines across your team.</p>
        </div>
        {hasWrite && (
          <Button onClick={() => { setCreateDate(today); setIsCreating(true); }} className="gap-2 shrink-0" size="sm">
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="glass-card border border-border/25 rounded-2xl p-4 bg-card/30 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
        {/* Month Nav */}
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="h-8 w-8 rounded-lg border border-border/30 bg-card hover:bg-accent flex items-center justify-center cursor-pointer transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-base font-black text-foreground min-w-40 text-center">
            {MONTHS[viewMonth]} {viewYear}
          </h2>
          <button onClick={nextMonth} className="h-8 w-8 rounded-lg border border-border/30 bg-card hover:bg-accent flex items-center justify-center cursor-pointer transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={goToday} className="h-8 px-3 rounded-lg border border-border/30 bg-card hover:bg-accent text-xs font-bold text-muted-foreground cursor-pointer transition-colors">
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* My Only toggle */}
          <button
            onClick={() => setMyOnly(!myOnly)}
            className={cn(
              'h-8 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer',
              myOnly ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            My Events
          </button>

          {/* View toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('month')}
              className={cn('h-8 px-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5', viewMode === 'month' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent')}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Month
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={cn('h-8 px-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5', viewMode === 'agenda' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent')}
            >
              <List className="h-3.5 w-3.5" /> Agenda
            </button>
          </div>
        </div>
      </div>

      {/* Event Type Legend */}
      <div className="flex flex-wrap gap-3 px-1">
        {(Object.keys(EVENT_TYPE_CONFIG) as EventType[]).map((type) => {
          const cfg = EVENT_TYPE_CONFIG[type];
          return (
            <div key={type} className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
              <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
              {cfg.label}
            </div>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading calendar...</span>
        </div>
      ) : viewMode === 'month' ? (
        <MonthView
          grid={grid}
          today={today}
          getDayEvents={getDayEvents}
          hasWrite={hasWrite}
          onSelectEvent={setSelectedEvent}
          onClickDay={(date) => { if (hasWrite) { setCreateDate(date); setIsCreating(true); } }}
        />
      ) : (
        <AgendaView
          events={events}
          onSelectEvent={setSelectedEvent}
          today={today}
        />
      )}

      {/* Event Detail Drawer */}
      {selectedEvent && (
        <EventDrawer
          event={selectedEvent}
          orgUsers={orgUsers}
          currentUserId={user?.id || ''}
          hasWrite={hasWrite}
          onClose={() => { setSelectedEvent(null); invalidate(); }}
          onDelete={(id) => deleteMutation.mutate(id)}
          onRsvp={(id, status) => rsvpMutation.mutate({ id, status })}
          onUpdated={() => { invalidate(); setSelectedEvent(null); }}
        />
      )}

      {/* Create Event Modal */}
      {isCreating && (
        <CreateEventModal
          initialDate={createDate || today}
          orgUsers={orgUsers}
          onClose={() => setIsCreating(false)}
          onCreated={() => { setIsCreating(false); invalidate(); toast.success('Event created'); }}
        />
      )}
    </div>
  );
}
