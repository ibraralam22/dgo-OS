import React from 'react';
import { TrendingUp, Coins, Users } from 'lucide-react';

import { DashboardMetrics } from '@services/dashboard-api';

interface ISalesDashboardProps {
  metrics: DashboardMetrics;
}

export const SalesDashboard: React.FC<ISalesDashboardProps> = ({ metrics }) => {
  return (
    <>
      {/* Leads */}
      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300 col-span-1 sm:col-span-2 lg:col-span-1">
        <div className="h-10 w-10 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Assigned Leads</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">
            {metrics.leads?.total ?? 0}
          </span>
          <span className="text-[10px] text-emerald-400 font-semibold mt-0.5">
            {metrics.leads?.conversionRate} Conversion Rate
          </span>
        </div>
      </div>

      {/* Pipeline Value */}
      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
          <Coins className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Opportunities Value</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">
            {metrics.pipeline?.value}
          </span>
        </div>
      </div>

      {/* Pipeline Deals count */}
      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active Deals</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">
            {metrics.pipeline?.deals} Deals
          </span>
        </div>
      </div>
    </>
  );
};
