import { InvoiceStatus } from '@services/invoices-api';
import { PaymentStatus, PaymentMethod } from '@services/payments-api';

export const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; color: string; border: string; bg: string; dot: string }
> = {
  DRAFT:          { label: 'Draft',          color: 'text-slate-400',   bg: 'bg-slate-500/5',   border: 'border-slate-500/20',   dot: 'bg-slate-400'   },
  SENT:           { label: 'Sent',           color: 'text-blue-400',    bg: 'bg-blue-500/5',    border: 'border-blue-500/20',    dot: 'bg-blue-400'    },
  PAID:           { label: 'Paid',           color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  PARTIALLY_PAID: { label: 'Partially Paid', color: 'text-amber-400',   bg: 'bg-amber-500/5',   border: 'border-amber-500/20',   dot: 'bg-amber-400'   },
  OVERDUE:        { label: 'Overdue',        color: 'text-rose-400',    bg: 'bg-rose-500/5',    border: 'border-rose-500/20',    dot: 'bg-rose-400'    },
  VOID:           { label: 'Void',           color: 'text-zinc-500',    bg: 'bg-zinc-500/5',    border: 'border-zinc-500/10',    dot: 'bg-zinc-600'    },
};

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; color: string; border: string; bg: string }
> = {
  SUCCESS:  { label: 'Success',  color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
  FAILED:   { label: 'Failed',   color: 'text-rose-400',    border: 'border-rose-500/20',    bg: 'bg-rose-500/5'    },
  VOID:     { label: 'Voided',   color: 'text-slate-400',   border: 'border-slate-500/20',   bg: 'bg-slate-500/5'   },
  REFUNDED: { label: 'Refunded', color: 'text-blue-400',    border: 'border-blue-500/20',    bg: 'bg-blue-500/5'    },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: 'Bank Wire Transfer',
  CREDIT_CARD:   'Credit Card',
  CHECK:         'Check Payment',
  CASH:          'Cash',
  STRIPE:        'Stripe Checkout',
  OTHER:         'Other Method',
};
