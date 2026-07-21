import React from 'react';
import { cn } from '@utils/cn';

interface IStatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<IStatusBadgeProps> = ({ status }) => {
  const map: Record<string, string> = {
    active: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
    pending: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
    suspended: 'bg-red-500/15 text-red-400 border border-red-500/25',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', map[status] ?? 'bg-muted text-muted-foreground')}>
      {status}
    </span>
  );
};

interface IRoleBadgeProps {
  role: string;
}

export const RoleBadge: React.FC<IRoleBadgeProps> = ({ role }) => {
  const map: Record<string, string> = {
    SuperAdmin: 'bg-violet-500/15 text-violet-400 border border-violet-500/25',
    TenantAdmin: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
    SalesRepresentative: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25',
    ClientContact: 'bg-slate-500/15 text-slate-400 border border-slate-500/25',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide', map[role] ?? 'bg-muted text-muted-foreground')}>
      {role}
    </span>
  );
};

interface IAvatarProps {
  firstName: string;
  lastName: string;
}

export const Avatar: React.FC<IAvatarProps> = ({ firstName, lastName }) => {
  return (
    <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-primary text-xs font-bold select-none">
      {firstName[0]}{lastName[0]}
    </div>
  );
};
