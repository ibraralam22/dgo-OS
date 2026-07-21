import React from 'react';
import { Users, TrendingUp, Coins, Ticket } from 'lucide-react';

import { DashboardMetrics } from '@services/dashboard-api';

interface IAdminDashboardProps {
  metrics: DashboardMetrics;
}

export const AdminDashboard: React.FC<IAdminDashboardProps> = ({ metrics }) => {
  return (
    <>
      {/* User count */}
      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary shadow-inner">
          <Users className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active Users</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">
            {metrics.userCount ?? 0}
          </span>
        </div>
      </div>

      {/* Leads */}
      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Leads</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">
            {metrics.leads?.total ?? 0}
          </span>
                  <span className="text-[10px] text-emerald-400 font-semibold mt-0.5">
            {metrics.leads?.growth ?? '0%'} growth ({metrics.leads?.conversionRate} conv.)
          </span>
        </div>
      </div>

      {/* Pipeline deals value */}
      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
          <Coins className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Pipeline Value</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">
            {metrics.pipeline?.value}
          </span>
          <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">
            {metrics.pipeline?.deals} deals in progress
          </span>
        </div>
      </div>

      {/* Support Tickets */}
      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
          <Ticket className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Support Desk</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">
            {metrics.tickets?.open} Open
          </span>
          <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">
            {metrics.tickets?.resolved} resolved tickets
          </span>
        </div>
      </div>
    </>
  );
};
