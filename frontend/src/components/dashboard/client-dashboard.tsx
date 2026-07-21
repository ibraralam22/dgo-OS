import React from 'react';
import { Ticket, Clock, ShieldCheck } from 'lucide-react';

import { DashboardMetrics } from '@services/dashboard-api';

interface IClientDashboardProps {
  metrics: DashboardMetrics;
}

export const ClientDashboard: React.FC<IClientDashboardProps> = ({ metrics }) => {
  return (
    <>
      {/* Open Tickets */}
      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300 col-span-1 sm:col-span-2 lg:col-span-1">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
          <Ticket className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">My Open Tickets</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">
            {metrics.tickets?.open} Tickets
          </span>
        </div>
      </div>

      {/* Resolved Tickets */}
      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
          <Clock className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Resolved Tickets</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">
            {metrics.tickets?.resolved} Tickets
          </span>
        </div>
      </div>

      {/* SLA compliance */}
      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">SLA Met Rate</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">
            {metrics.tickets?.slaStatus ?? '100%'}
          </span>
        </div>
      </div>
    </>
  );
};
