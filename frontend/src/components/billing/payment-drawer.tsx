import React from 'react';
import { Payment } from '@services/payments-api';
import { PAYMENT_STATUS_CONFIG, PAYMENT_METHOD_LABELS } from './constants';
import { Button } from '@components/ui/button';
import { cn } from '@utils/cn';
import { X, User, Ban, ShieldAlert } from 'lucide-react';

interface IPaymentDrawerProps {
  payment: Payment;
  isAdmin: boolean;
  hasWrite: boolean;
  onClose: () => void;
  onVoid: (id: string) => void;
}

export const PaymentDrawer: React.FC<IPaymentDrawerProps> = ({
  payment,
  isAdmin,
  hasWrite,
  onClose,
  onVoid,
}) => {
  const statusCfg = PAYMENT_STATUS_CONFIG[payment.status];
  const methodLabel = PAYMENT_METHOD_LABELS[payment.paymentMethod];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-xs cursor-pointer" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background border-l border-border/25 shadow-2xl flex flex-col h-full z-10 glass-card animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/20 flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={cn('px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider', statusCfg.color, statusCfg.border, statusCfg.bg)}>
                {statusCfg.label}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">TxID: {payment.id}</span>
            </div>
            <h3 className="text-base font-black text-foreground mt-1">Payment Receipt</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 rounded-lg shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable details */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 text-xs text-foreground">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Client Name</span>
            <p className="font-extrabold text-sm text-foreground">{payment.invoice.account.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-b border-border/10 py-4">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Amount Paid</span>
              <p className="font-black text-emerald-400 text-base mt-0.5">${Number(payment.amount).toFixed(2)}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Payment Date</span>
              <p className="font-bold text-foreground mt-1">{new Date(payment.paymentDate).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Payment Method:</span>
              <span className="font-extrabold">{methodLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Reference #:</span>
              <span className="font-mono font-bold text-[10px]">{payment.referenceNumber || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Invoice reference:</span>
              <span className="font-bold">{payment.invoice.invoiceNumber}</span>
            </div>
          </div>

          {payment.notes && (
            <div className="p-3 bg-muted/10 border border-border/20 rounded-xl mt-2 flex flex-col gap-1">
              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Internal Transaction notes</span>
              <p className="text-[11px] leading-relaxed mt-0.5">{payment.notes}</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-auto border-t border-border/10 pt-4">
            <User className="h-3.5 w-3.5" />
            <span>Recorded by {payment.createdBy.firstName} {payment.createdBy.lastName} ({payment.createdBy.email})</span>
          </div>
        </div>

        {/* Void transaction block */}
        {hasWrite && payment.status === 'SUCCESS' && (
          <div className="px-6 py-4 border-t border-border/15">
            {!isAdmin ? (
              <p className="text-[9px] text-rose-400/80 font-bold flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" /> Administrator permissions are required to void payments.
              </p>
            ) : (
              <button
                onClick={() => {
                  if (confirm('Void this transaction? This reversing ledger action cannot be undone.')) {
                    onVoid(payment.id);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 text-[10px] font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 py-2 rounded-lg border border-rose-500/20 transition-colors cursor-pointer"
              >
                <Ban className="h-3.5 w-3.5" /> Void Payment Transaction
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
