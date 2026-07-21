import { TicketStatus, TicketPriority, TicketCategory } from '@services/tickets-api';

export const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; color: string; border: string; bg: string }
> = {
  OPEN:        { label: 'Open',        color: 'text-sky-400',    bg: 'bg-sky-500/5',    border: 'border-sky-500/20'    },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-400',  bg: 'bg-amber-500/5',  border: 'border-amber-500/20'  },
  RESOLVED:    { label: 'Resolved',    color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' },
  CLOSED:      { label: 'Closed',      color: 'text-slate-500',  bg: 'bg-slate-500/5',  border: 'border-slate-500/20'  },
};

export const PRIORITY_CONFIG: Record<
  TicketPriority,
  { label: string; color: string; border: string; bg: string }
> = {
  LOW:    { label: 'Low',    color: 'text-slate-400', border: 'border-slate-500/10', bg: 'bg-slate-500/5'   },
  MEDIUM: { label: 'Medium', color: 'text-blue-400',  border: 'border-blue-500/20',  bg: 'bg-blue-500/5'    },
  HIGH:   { label: 'High',   color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5'   },
  URGENT: { label: 'Urgent', color: 'text-rose-400',  border: 'border-rose-500/20',  bg: 'bg-rose-500/5'    },
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  GENERAL:   'General Request',
  TECHNICAL: 'Technical Issue',
  BILLING:   'Billing / Invoice Support',
  ACCOUNT:   'Account / Access Request',
};
