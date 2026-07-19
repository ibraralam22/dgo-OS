'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  calendarApi,
  CalendarEvent,
  EventType,
  RecurrenceFrequency,
  CreateEventInput,
  UpdateEventInput,
} from '@services/calendar-api';
import { usersApi } from '@services/users-api';
import { useAuthStore } from '@store/auth-store';
import { toast } from '@utils/toast';
import { cn } from '@utils/cn';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Trash2,
  Loader2,
  Clock,
  MapPin,
  Link2,
  Users,
  List,
  LayoutGrid,
  RefreshCw,
  UserCheck,
  UserX,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const EVENT_TYPE_CONFIG: Record<
  EventType,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  MEETING:   { label: 'Meeting',   color: 'text-indigo-300', bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', dot: 'bg-indigo-400' },
  CALL:      { label: 'Call',      color: 'text-sky-300',    bg: 'bg-sky-500/15',    border: 'border-sky-500/30',    dot: 'bg-sky-400'    },
  DEMO:      { label: 'Demo',      color: 'text-violet-300', bg: 'bg-violet-500/15', border: 'border-violet-500/30', dot: 'bg-violet-400' },
  FOLLOW_UP: { label: 'Follow-up', color: 'text-amber-300',  bg: 'bg-amber-500/15',  border: 'border-amber-500/30',  dot: 'bg-amber-400'  },
  DEADLINE:  { label: 'Deadline',  color: 'text-rose-300',   bg: 'bg-rose-500/15',   border: 'border-rose-500/30',   dot: 'bg-rose-400'   },
  REMINDER:  { label: 'Reminder',  color: 'text-slate-300',  bg: 'bg-slate-500/15',  border: 'border-slate-500/30',  dot: 'bg-slate-400'  },
  OTHER:     { label: 'Other',     color: 'text-teal-300',   bg: 'bg-teal-500/15',   border: 'border-teal-500/30',   dot: 'bg-teal-400'   },
};

const ENTITY_LABELS: Record<string, string> = {
  lead: 'Lead', account: 'Account', opportunity: 'Deal', project: 'Project', task: 'Task',
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function getMonthWindow(year: number, month: number) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59);
  return { from: from.toISOString(), to: to.toISOString() };
}
function buildCalendarGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

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

      {/* Loading */}
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
        <EventFormModal
          initialDate={createDate || today}
          orgUsers={orgUsers}
          onClose={() => setIsCreating(false)}
          onCreated={() => { setIsCreating(false); invalidate(); toast.success('Event created'); }}
        />
      )}
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  grid,
  today,
  getDayEvents,
  hasWrite,
  onSelectEvent,
  onClickDay,
}: {
  grid: (Date | null)[];
  today: Date;
  getDayEvents: (d: Date) => CalendarEvent[];
  hasWrite: boolean;
  onSelectEvent: (e: CalendarEvent) => void;
  onClickDay: (d: Date) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card/20 overflow-hidden shadow-sm">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-border/15">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="py-2.5 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {d}
          </div>
        ))}
      </div>

      {/* Grid cells */}
      <div className="grid grid-cols-7">
        {grid.map((date, i) => {
          if (!date) {
            return <div key={`empty-${i}`} className="min-h-28 border-b border-r border-border/10 bg-muted/5" />;
          }
          const isToday = sameDay(date, today);
          const dayEvents = getDayEvents(date);
          const visible = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - 3;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <div
              key={date.toISOString()}
              onClick={() => onClickDay(date)}
              className={cn(
                'min-h-28 border-b border-r border-border/10 p-1.5 flex flex-col gap-1 group transition-colors',
                isWeekend ? 'bg-muted/5' : 'bg-transparent',
                hasWrite && 'cursor-pointer hover:bg-accent/5',
              )}
            >
              {/* Date number */}
              <div className={cn(
                'h-6 w-6 rounded-full flex items-center justify-center text-xs font-black self-start ml-0.5',
                isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground',
              )}>
                {date.getDate()}
              </div>

              {/* Event chips */}
              {visible.map((ev) => {
                const cfg = EVENT_TYPE_CONFIG[ev.type];
                return (
                  <button
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onSelectEvent(ev); }}
                    className={cn(
                      'w-full text-left rounded px-1.5 py-0.5 text-[10px] font-semibold truncate flex items-center gap-1 border transition-opacity hover:opacity-80 cursor-pointer',
                      cfg.color, cfg.bg, cfg.border,
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', cfg.dot)} />
                    {!ev.allDay && <span className="opacity-70">{formatTime(ev.startAt)}</span>}
                    <span className="truncate">{ev.title}</span>
                  </button>
                );
              })}

              {overflow > 0 && (
                <span className="text-[9px] text-muted-foreground font-semibold pl-1">+{overflow} more</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Agenda View ─────────────────────────────────────────────────────────────

function AgendaView({
  events,
  onSelectEvent,
  today,
}: {
  events: CalendarEvent[];
  onSelectEvent: (e: CalendarEvent) => void;
  today: Date;
}) {
  // Group by date string
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    [...events]
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .forEach((ev) => {
        const d = new Date(ev.startAt);
        const key = d.toDateString();
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
      });
    return map;
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="h-48 border border-dashed border-border/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <CalendarDays className="h-8 w-8 opacity-30 animate-pulse" />
        <span className="text-xs">No events this month</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {[...grouped.entries()].map(([dateStr, dayEvents]) => {
        const date = new Date(dateStr);
        const isToday = sameDay(date, today);
        return (
          <div key={dateStr} className="flex gap-4">
            {/* Date column */}
            <div className={cn(
              'w-16 shrink-0 flex flex-col items-center pt-3',
            )}>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {DAYS_OF_WEEK[date.getDay()]}
              </span>
              <span className={cn(
                'text-2xl font-black leading-none mt-0.5',
                isToday ? 'text-primary' : 'text-foreground',
              )}>
                {date.getDate()}
              </span>
            </div>

            {/* Events column */}
            <div className="flex-1 flex flex-col gap-2">
              {dayEvents.map((ev) => {
                const cfg = EVENT_TYPE_CONFIG[ev.type];
                return (
                  <button
                    key={ev.id}
                    onClick={() => onSelectEvent(ev)}
                    className={cn(
                      'w-full text-left rounded-xl border p-3 flex items-start gap-3 transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer',
                      cfg.bg, cfg.border,
                    )}
                  >
                    <span className={cn('h-2.5 w-2.5 rounded-full mt-1 shrink-0', cfg.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-[10px] font-black uppercase tracking-widest', cfg.color)}>
                          {cfg.label}
                        </span>
                        {ev.entityType && (
                          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 font-semibold">
                            <Link2 className="h-2.5 w-2.5" /> {ENTITY_LABELS[ev.entityType]}
                          </span>
                        )}
                        {ev.attendees.length > 0 && (
                          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 font-semibold">
                            <Users className="h-2.5 w-2.5" /> {ev.attendees.length}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-extrabold text-foreground mt-0.5">{ev.title}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {!ev.allDay && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(ev.startAt)} – {formatTime(ev.endAt)}
                          </span>
                        )}
                        {ev.location && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 truncate max-w-48">
                            <MapPin className="h-3 w-3 shrink-0" /> {ev.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Event Detail Drawer ──────────────────────────────────────────────────────

function EventDrawer({
  event,
  orgUsers,
  currentUserId,
  hasWrite,
  onClose,
  onDelete,
  onRsvp,
  onUpdated,
}: {
  event: CalendarEvent;
  orgUsers: any[];
  currentUserId: string;
  hasWrite: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onRsvp: (id: string, status: 'ACCEPTED' | 'DECLINED') => void;
  onUpdated: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState(event.title);
  const [type, setType] = useState<EventType>(event.type);
  const [startAt, setStartAt] = useState(event.startAt.slice(0, 16));
  const [endAt, setEndAt] = useState(event.endAt.slice(0, 16));
  const [allDay, setAllDay] = useState(event.allDay);
  const [description, setDescription] = useState(event.description || '');
  const [location, setLocation] = useState(event.location || '');
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>(event.recurrence);

  const queryClient = useQueryClient();
  const cfg = EVENT_TYPE_CONFIG[event.type];

  const myAttendance = event.attendees.find((a) => a.userId === currentUserId);
  const isOwner = event.createdById === currentUserId;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await calendarApi.update(event.id, {
        title, type, startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString(),
        allDay, description: description || undefined, location: location || undefined, recurrence,
      });
      toast.success('Event updated');
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      onUpdated();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-xs cursor-pointer" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-background border-l border-border/25 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">

        {/* Header */}
        <div className={cn('px-6 py-4 border-b border-border/20 flex items-start gap-4', cfg.bg)}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn('text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border', cfg.color, cfg.border)}>
                {cfg.label}
              </span>
              {event.entityType && (
                <span className="text-[9px] text-muted-foreground font-semibold flex items-center gap-0.5">
                  <Link2 className="h-2.5 w-2.5" /> {ENTITY_LABELS[event.entityType]}
                </span>
              )}
              {event.recurrence !== 'NONE' && (
                <span className="text-[9px] text-muted-foreground font-semibold flex items-center gap-0.5">
                  <RefreshCw className="h-2.5 w-2.5" /> {event.recurrence}
                </span>
              )}
            </div>
            <h3 className="text-sm font-black text-foreground">{event.title}</h3>
            <p className="text-[10px] text-muted-foreground mt-1">
              {event.allDay
                ? `All Day · ${new Date(event.startAt).toLocaleDateString()}`
                : `${formatTime(event.startAt)} – ${formatTime(event.endAt)} · ${new Date(event.startAt).toLocaleDateString()}`}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 rounded-lg shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* RSVP strip (if attendee) */}
        {myAttendance && (
          <div className="px-6 py-3 border-b border-border/10 flex items-center gap-3">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Your RSVP:</span>
            <span className={cn(
              'text-[10px] font-black uppercase px-2 py-0.5 rounded',
              myAttendance.status === 'ACCEPTED' ? 'bg-emerald-500/15 text-emerald-400' :
              myAttendance.status === 'DECLINED' ? 'bg-rose-500/15 text-rose-400' : 'bg-slate-500/10 text-slate-400',
            )}>{myAttendance.status}</span>
            {myAttendance.status !== 'ACCEPTED' && (
              <button onClick={() => onRsvp(event.id, 'ACCEPTED')} className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer border border-emerald-500/20 px-2 py-1 rounded-lg hover:bg-emerald-500/10 transition-colors">
                <UserCheck className="h-3 w-3" /> Accept
              </button>
            )}
            {myAttendance.status !== 'DECLINED' && (
              <button onClick={() => onRsvp(event.id, 'DECLINED')} className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer border border-rose-500/20 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors">
                <UserX className="h-3 w-3" /> Decline
              </button>
            )}
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

          {!isEditing ? (
            /* ── View Mode ── */
            <div className="flex flex-col gap-4 text-sm">
              {event.location && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="text-xs">{event.location}</span>
                </div>
              )}
              {event.description && (
                <div className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
                  {event.description}
                </div>
              )}

              {/* Attendees */}
              {event.attendees.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Attendees ({event.attendees.length})</h4>
                  <div className="flex flex-col gap-1.5">
                    {event.attendees.map((a) => (
                      <div key={a.userId} className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black flex items-center justify-center shrink-0">
                          {a.user.firstName[0]}{a.user.lastName[0]}
                        </div>
                        <span className="text-xs font-semibold text-foreground">{a.user.firstName} {a.user.lastName}</span>
                        <span className={cn(
                          'ml-auto text-[9px] font-black uppercase px-1.5 py-0.5 rounded',
                          a.status === 'ACCEPTED' ? 'bg-emerald-500/15 text-emerald-400' :
                          a.status === 'DECLINED' ? 'bg-rose-500/15 text-rose-400' : 'bg-slate-500/10 text-slate-400',
                        )}>{a.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Creator */}
              <p className="text-[10px] text-muted-foreground">
                Created by <span className="font-semibold text-foreground">{event.createdBy.firstName} {event.createdBy.lastName}</span>
              </p>

              {/* Edit button */}
              {(hasWrite && isOwner) && (
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="w-full mt-2">
                  Edit Event
                </Button>
              )}
            </div>
          ) : (
            /* ── Edit Mode ── */
            <div className="flex flex-col gap-4">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Edit Event</h4>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Title *</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value as EventType)} className="h-9 rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer">
                    {Object.keys(EVENT_TYPE_CONFIG).map((t) => <option key={t} value={t}>{EVENT_TYPE_CONFIG[t as EventType].label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Recurrence</label>
                  <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as RecurrenceFrequency)} className="h-9 rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer">
                    <option value="NONE">No repeat</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Start</label>
                  <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">End</label>
                  <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="allday-edit" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-3.5 w-3.5 accent-primary cursor-pointer" />
                <label htmlFor="allday-edit" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer">All Day</label>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Location</label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room, Zoom link, etc." />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isSaving} className="flex-1 gap-2" size="sm">
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />} Save Changes
                </Button>
                <Button onClick={() => setIsEditing(false)} variant="outline" size="sm" className="flex-1">Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer — Delete */}
        {hasWrite && isOwner && (
          <div className="px-6 py-4 border-t border-border/15">
            <button
              onClick={() => { if (confirm('Delete this event?')) onDelete(event.id); }}
              className="w-full flex items-center justify-center gap-2 text-[10px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2 rounded-lg border border-red-500/20 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Event
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Event Form Modal (Create) ────────────────────────────────────────────────

function EventFormModal({
  initialDate,
  orgUsers,
  onClose,
  onCreated,
}: {
  initialDate: Date;
  orgUsers: any[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const startDefault = new Date(initialDate);
  startDefault.setHours(10, 0, 0, 0);
  const endDefault = new Date(startDefault);
  endDefault.setHours(11, 0, 0, 0);

  const pad = (n: number) => String(n).padStart(2, '0');
  const toLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>('MEETING');
  const [startAt, setStartAt] = useState(toLocal(startDefault));
  const [endAt, setEndAt] = useState(toLocal(endDefault));
  const [allDay, setAllDay] = useState(false);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>('NONE');
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      const payload: CreateEventInput = {
        title,
        type,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        allDay,
        description: description || undefined,
        location: location || undefined,
        recurrence,
        entityType: entityType ? (entityType as any) : undefined,
        entityId: (entityType && entityId) ? entityId : undefined,
        attendeeIds: attendeeIds.length > 0 ? attendeeIds : undefined,
      };
      await calendarApi.create(payload);
      onCreated();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create event';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg glass-card bg-background border border-border/30 rounded-2xl shadow-2xl z-10 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/20 shrink-0">
          <h3 className="text-sm font-black text-foreground">New Calendar Event</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 rounded-lg">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Title *</label>
            <Input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Demo with Acme Corp" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Type *</label>
              <select value={type} onChange={(e) => setType(e.target.value as EventType)} className="h-9 w-full rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer">
                {Object.keys(EVENT_TYPE_CONFIG).map((t) => <option key={t} value={t}>{EVENT_TYPE_CONFIG[t as EventType].label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Repeat</label>
              <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as RecurrenceFrequency)} className="h-9 w-full rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer">
                <option value="NONE">No repeat</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Start *</label>
              <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">End *</label>
              <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="allday" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-3.5 w-3.5 accent-primary cursor-pointer" />
            <label htmlFor="allday" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer">All-day event</label>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Location / Meeting Link</label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room 3A or https://meet.google.com/..." />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description / Agenda</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Optional agenda or notes..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Link to</label>
              <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer">
                <option value="">None</option>
                <option value="lead">Lead</option>
                <option value="account">Account</option>
                <option value="opportunity">Deal</option>
                <option value="project">Project</option>
                <option value="task">Task</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Attendees</label>
              <select
                multiple
                value={attendeeIds}
                onChange={(e) => setAttendeeIds(Array.from(e.target.selectedOptions, (o) => o.value))}
                className="rounded-lg border border-border bg-card text-xs font-semibold px-3 py-1.5 focus:outline-none cursor-pointer max-h-20"
              >
                {orgUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>
          </div>

          {entityType && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Entity UUID</label>
              <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="Paste entity UUID here" />
            </div>
          )}

          <Button type="submit" disabled={isSubmitting || !title.trim()} className="w-full mt-2 gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Event
          </Button>
        </form>
      </div>
    </div>
  );
}
