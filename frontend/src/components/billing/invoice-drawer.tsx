import React from 'react';
import { Invoice } from '@services/invoices-api';
import { STATUS_CONFIG } from './constants';
import { Button } from '@components/ui/button';
import { cn } from '@utils/cn';
import { X, FileText, Trash2 } from 'lucide-react';

interface IInvoiceDrawerProps {
  invoice: Invoice;
  hasWrite: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: 'SENT' | 'VOID' | 'OVERDUE') => void;
  onOpenPayment: (id: string) => void;
}

export const InvoiceDrawer: React.FC<IInvoiceDrawerProps> = ({
  invoice,
  hasWrite,
  onClose,
  onDelete,
  onUpdateStatus,
  onOpenPayment,
}) => {
  const statusCfg = STATUS_CONFIG[invoice.status];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-xs cursor-pointer" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-background border-l border-border/25 shadow-2xl flex flex-col h-full z-10 glass-card animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/20 flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={cn('px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider', statusCfg.color, statusCfg.border, statusCfg.bg)}>
                {statusCfg.label}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">{invoice.id}</span>
            </div>
            <h3 className="text-base font-black text-foreground mt-1">Invoice {invoice.invoiceNumber}</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 rounded-lg shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Top Info section */}
          <div className="grid grid-cols-2 gap-4 border-b border-border/10 pb-4">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Billed To</span>
              <p className="font-extrabold text-sm text-foreground mt-1">{invoice.account.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{invoice.account.domain}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Invoicing details</span>
              <p className="text-xs text-foreground mt-1"><strong>Issue Date:</strong> {new Date(invoice.issueDate).toLocaleDateString()}</p>
              <p className="text-xs text-foreground"><strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()}</p>
              <p className="text-xs text-foreground"><strong>Currency:</strong> {invoice.currency}</p>
            </div>
          </div>

          {/* Line items table */}
          <div>
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Billing Breakdown</h4>
            <div className="border border-border/20 rounded-xl overflow-hidden bg-card/10">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/15 border-b border-border/10 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-2">Item Name</th>
                    <th className="px-4 py-2 text-right">Quantity</th>
                    <th className="px-4 py-2 text-right">Unit Price</th>
                    <th className="px-4 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10 font-medium text-foreground">
                  {invoice.lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-foreground">{item.itemName}</p>
                          {item.description && <p className="text-[10px] text-muted-foreground">{item.description}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">{invoice.currency} {Number(item.unitPrice).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold">{invoice.currency} {Number(item.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calculations Block */}
          <div className="flex justify-end border-t border-border/10 pt-4">
            <div className="w-64 flex flex-col gap-2 text-xs font-semibold text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="text-foreground">{invoice.currency} {Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              {Number(invoice.discountPercentage) > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Discount ({Number(invoice.discountPercentage)}%):</span>
                  <span>-{invoice.currency} {(Number(invoice.subtotal) * Number(invoice.discountPercentage) / 100).toFixed(2)}</span>
                </div>
              )}
              {Number(invoice.taxPercentage) > 0 && (
                <div className="flex justify-between">
                  <span>Tax ({Number(invoice.taxPercentage)}%):</span>
                  <span className="text-foreground">+{invoice.currency} {((Number(invoice.subtotal) - (Number(invoice.subtotal) * Number(invoice.discountPercentage) / 100)) * Number(invoice.taxPercentage) / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black border-t border-border/15 pt-2 text-foreground">
                <span>Total Amount:</span>
                <span>{invoice.currency} {Number(invoice.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-emerald-400">
                <span>Amount Paid:</span>
                <span>{invoice.currency} {Number(invoice.amountPaid).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t border-border/15 pt-2 text-amber-400">
                <span>Balance Due:</span>
                <span>{invoice.currency} {Number(invoice.balanceDue).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Optional link references */}
          {(invoice.opportunityId || invoice.quotationId) && (
            <div className="p-3 bg-muted/10 border border-border/20 rounded-xl flex flex-col gap-1">
              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Source Document Links</span>
              <div className="flex gap-4 mt-1 text-xs">
                {invoice.opportunity && (
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <FileText className="h-3.5 w-3.5 text-primary" /> Deal: {invoice.opportunity.name}
                  </span>
                )}
                {invoice.quotation && (
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <FileText className="h-3.5 w-3.5 text-primary" /> Quote Version: {invoice.quotation.version}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        {hasWrite && (
          <div className="px-6 py-4 border-t border-border/15 flex gap-2">
            {invoice.status === 'DRAFT' && (
              <>
                <Button onClick={() => onUpdateStatus(invoice.id, 'SENT')} className="flex-1" size="sm">
                  Issue Invoice (Mark Sent)
                </Button>
                <Button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this invoice draft?')) {
                      onDelete(invoice.id);
                    }
                  }}
                  variant="outline"
                  className="text-red-400 hover:text-red-300 border-red-500/20 hover:bg-red-500/10"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}

            {['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && (
              <>
                <Button onClick={() => onOpenPayment(invoice.id)} className="flex-1" size="sm">
                  Record Payment
                </Button>
                <Button onClick={() => onUpdateStatus(invoice.id, 'VOID')} variant="outline" className="flex-1" size="sm">
                  Void Invoice
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
