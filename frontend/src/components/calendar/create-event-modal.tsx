import React, { useState } from 'react';
import { calendarApi, EventType, RecurrenceFrequency, CreateEventInput } from '@services/calendar-api';
import { toast } from '@utils/toast';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { EVENT_TYPE_CONFIG } from './constants';
import { X, Plus, Loader2 } from 'lucide-react';

interface ICreateEventModalProps {
  initialDate: Date;
  orgUsers: any[];
  onClose: () => void;
  onCreated: () => void;
}

export const CreateEventModal: React.FC<ICreateEventModalProps> = ({
  initialDate,
  orgUsers,
  onClose,
  onCreated,
}) => {
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
