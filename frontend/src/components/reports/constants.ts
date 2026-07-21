import { ReportCategory } from '@services/reports-api';

export const CATEGORY_CONFIG: Record<
  ReportCategory,
  { label: string; bg: string; text: string }
> = {
  SALES:     { label: 'Sales Pipeline', bg: 'bg-primary/10', text: 'text-primary' },
  FINANCIAL: { label: 'Financial Performance', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  SUPPORT:   { label: 'Service Desk Support', bg: 'bg-sky-500/10', text: 'text-sky-400' },
};

export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
};
