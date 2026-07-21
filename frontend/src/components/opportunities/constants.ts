import { OpportunityStage } from '@services/opportunities-api';

export const STAGES: { stage: OpportunityStage; label: string; prob: number; color: string; border: string; bg: string }[] = [
  {
    stage: 'DISCOVERY',
    label: 'Discovery',
    prob: 10,
    color: 'text-indigo-400',
    border: 'border-indigo-500/20',
    bg: 'bg-indigo-500/5',
  },
  {
    stage: 'PROPOSAL',
    label: 'Proposal',
    prob: 40,
    color: 'text-sky-400',
    border: 'border-sky-500/20',
    bg: 'bg-sky-500/5',
  },
  {
    stage: 'NEGOTIATION',
    label: 'Negotiation',
    prob: 70,
    color: 'text-amber-400',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/5',
  },
  {
    stage: 'CLOSED_WON',
    label: 'Closed Won',
    prob: 100,
    color: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
  },
  {
    stage: 'CLOSED_LOST',
    label: 'Closed Lost',
    prob: 0,
    color: 'text-rose-400',
    border: 'border-rose-500/20',
    bg: 'bg-rose-500/5',
  },
];

export const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(val));
