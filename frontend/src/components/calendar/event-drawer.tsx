import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarApi, CalendarEvent, EventType, RecurrenceFrequency } from '@services/calendar-api';
import { toast } from '@utils/toast';
import { cn } from '@utils/cn';
import { EVENT_TYPE_CONFIG, ENTITY_LABELS, formatTime } from './constants';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { MapPin, Link2, Users, RefreshCw, UserCheck, UserX, X, Trash2, Loader2 } from 'lucide-react';

interface IEventDrawerProps {
  event: CalendarEvent;
  orgUsers: any[];
  currentUserId: string;
  hasWrite: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onRsvp: (id: string, status: 'ACCEPTED' | 'DECLINED') => void;
  onUpdated: () => void;
}

export const EventDrawer: React.FC<IEventDrawerProps> = ({
  event,
  orgUsers,
  currentUserId,
  hasWrite,
  onClose,
  onDelete,
  onRsvp,
  onUpdated,
}) => {
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
  const cfg = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG['OTHER'];

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

      <div className="relative w-full max-w-lg bg-background border-l border-border/25 shadow-2xl flex flex-col h-full z-10 glass-card animate-in slide-in-from-right duration-200">

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
