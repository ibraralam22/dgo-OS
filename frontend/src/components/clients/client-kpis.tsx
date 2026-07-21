import React from 'react';
import { Building2, CheckCircle, Briefcase, Users } from 'lucide-react';

interface IClientKpisProps {
  totalCount: number;
  activeCount: number;
  onboardingCount: number;
  contactsCount: number;
}

export const ClientKpis: React.FC<IClientKpisProps> = ({
  totalCount,
  activeCount,
  onboardingCount,
  contactsCount,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Client Accounts</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">{totalCount}</span>
        </div>
      </div>

      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
          <CheckCircle className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active Deals</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">{activeCount}</span>
        </div>
      </div>

      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
          <Briefcase className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Onboarding</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">{onboardingCount}</span>
        </div>
      </div>

      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
          <Users className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Stakeholders</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">{contactsCount}</span>
        </div>
      </div>
    </div>
  );
};
