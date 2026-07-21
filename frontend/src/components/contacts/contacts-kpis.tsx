import React from 'react';
import { Users, ShieldCheck, Crown } from 'lucide-react';

interface IContactsKpisProps {
  totalCount: number;
  decisionMakers: number;
  billingPoints: number;
}

export const ContactsKpis: React.FC<IContactsKpisProps> = ({
  totalCount,
  decisionMakers,
  billingPoints,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Stakeholders</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">{totalCount}</span>
        </div>
      </div>

      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Decision Makers</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">{decisionMakers}</span>
        </div>
      </div>

      <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
        <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
          <Crown className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Billing Contacts</span>
          <span className="text-2xl font-extrabold text-foreground mt-0.5">{billingPoints}</span>
        </div>
      </div>
    </div>
  );
};
