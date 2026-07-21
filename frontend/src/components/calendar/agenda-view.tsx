import React, { useMemo } from 'react';
import { CalendarEvent } from '@services/calendar-api';
import { DAYS_OF_WEEK, EVENT_TYPE_CONFIG, ENTITY_LABELS, sameDay, formatTime } from './constants';
import { cn } from '@utils/cn';
import { CalendarDays, Link2, Users, Clock, MapPin } from 'lucide-react';

interface IAgendaViewProps {
  events: CalendarEvent[];
  onSelectEvent: (e: CalendarEvent) => void;
  today: Date;
}

export const AgendaView: React.FC<IAgendaViewProps> = ({
  events,
  onSelectEvent,
  today,
}) => {
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
