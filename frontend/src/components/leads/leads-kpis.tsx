import React from 'react';
import { TrendingUp, Coins, Ticket, CheckCircle } from 'lucide-react';

interface ILeadsKpisProps {
  totalCount: number;
  budgetSum: string;
  activeCount: number;
  convertedCount: number;
}

export const LeadsKpis: React.FC<ILeadsKpisProps> = ({
  totalCount,
  budgetSum,
  activeCount,
  convertedCount,
}) => {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total leads count */}
      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary shadow-inner">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Pipeline Leads</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">{totalCount}</span>
        </div>
      </div>

      {/* Total budget value */}
      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
          <Coins className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Est. Budget</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">{budgetSum}</span>
        </div>
      </div>

      {/* Active qualified leads */}
      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
          <Ticket className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active Deals</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">{activeCount}</span>
        </div>
      </div>

      {/* Conversions count */}
      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
          <CheckCircle className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Converts Won</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">{convertedCount}</span>
        </div>
      </div>
    </div>
  );
};
