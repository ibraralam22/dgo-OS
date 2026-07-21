import { EventType } from '@services/calendar-api';

export const EVENT_TYPE_CONFIG: Record<
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

export const ENTITY_LABELS: Record<string, string> = {
  lead: 'Lead', account: 'Account', opportunity: 'Deal', project: 'Project', task: 'Task',
};

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function getMonthWindow(year: number, month: number) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function buildCalendarGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
