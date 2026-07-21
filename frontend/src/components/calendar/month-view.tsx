import React from 'react';
import { CalendarEvent } from '@services/calendar-api';
import { DAYS_OF_WEEK, EVENT_TYPE_CONFIG, sameDay, formatTime } from './constants';
import { cn } from '@utils/cn';

interface IMonthViewProps {
  grid: (Date | null)[];
  today: Date;
  getDayEvents: (d: Date) => CalendarEvent[];
  hasWrite: boolean;
  onSelectEvent: (e: CalendarEvent) => void;
  onClickDay: (d: Date) => void;
}

export const MonthView: React.FC<IMonthViewProps> = ({
  grid,
  today,
  getDayEvents,
  hasWrite,
  onSelectEvent,
  onClickDay,
}) => {
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
