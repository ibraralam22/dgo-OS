import React from 'react';
import { Loader2, AlertTriangle, Send, Check, Trash2 } from 'lucide-react';
import { Button } from '@components/ui/button';
import { cn } from '@utils/cn';

import { QuotationStatus } from '@services/quotations-api';

interface IQuotationsListProps {
  quotations: any[];
  loadingQuotes: boolean;
  hasQuoteWriteAccess: boolean;
  hasQuoteApproveAccess: boolean;
  onEdit: (quote: any) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  onTransitionStatus: (quoteId: string, status: QuotationStatus) => void;
  isTransitioning: boolean;
  onApprove: (id: string) => void;
  isApproving: boolean;
}

export const QuotationsList: React.FC<IQuotationsListProps> = ({
  quotations,
  loadingQuotes,
  hasQuoteWriteAccess,
  hasQuoteApproveAccess,
  onEdit,
  onDelete,
  isDeleting,
  onTransitionStatus,
  isTransitioning,
  onApprove,
  isApproving,
}) => {
  if (loadingQuotes) {
    return (
      <div className="flex items-center justify-center py-8 text-xs text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Loading quotation versions...
      </div>
    );
  }

  if (quotations.length === 0) {
    return (
      <div className="text-xs text-muted-foreground/60 py-6 text-center border border-dashed border-border/30 rounded-xl">
        No quotation versions generated for this deal yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {quotations.map((quote) => {
        const subTotalVal = Number(quote.subtotal);
        const totalVal = Number(quote.total);
        const discountVal = Number(quote.discountPercentage);
        const taxVal = Number(quote.taxPercentage);
        const expiresDate = new Date(quote.expiresAt).toLocaleDateString();

        return (
          <div
            key={quote.id}
            className={cn(
              'border rounded-xl p-4 flex flex-col gap-3 transition-colors bg-card/15',
              quote.status === 'APPROVED' ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-border/10'
            )}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                  v{quote.version}
                </span>
                <span className="text-xs font-bold text-foreground">
                  Grand Total:{' '}
                  <span className="text-primary font-black">
                    ${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-[10px] font-black uppercase px-2 py-0.5 rounded border',
                    quote.status === 'APPROVED' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    quote.status === 'DRAFT' && 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    quote.status === 'SENT' && 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                    quote.status === 'EXPIRED' && 'bg-muted/15 text-muted-foreground border-border/20'
                  )}
                >
                  {quote.status}
                </span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground flex flex-col gap-1 border-y border-border/5 py-2">
              <div className="font-semibold text-foreground mb-1">Snapshot Details:</div>
              {quote.lineItems.map((item: any) => (
                <div key={item.id} className="flex justify-between pl-2">
                  <span>
                    {item.itemName} (x{item.quantity})
                  </span>
                  <span className="font-semibold">${Number(item.subtotal).toLocaleString('en-US')}</span>
                </div>
              ))}
              <div className="flex justify-between pl-2 border-t border-border/5 pt-1 mt-1 text-[11px]">
                <span>Subtotal:</span>
                <span>${subTotalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              {discountVal > 0 && (
                <div className="flex justify-between pl-2 text-red-400 text-[11px]">
                  <span>Discount ({discountVal}%):</span>
                  <span>
                    -${((subTotalVal * discountVal) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {taxVal > 0 && (
                <div className="flex justify-between pl-2 text-[11px]">
                  <span>Tax ({taxVal}%):</span>
                  <span>
                    +${(((subTotalVal * (1 - discountVal / 100)) * taxVal) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground flex-wrap gap-2">
              <span>
                Expires At: <strong className="text-foreground">{expiresDate}</strong>
              </span>

              {quote.requiresApproval && !quote.approved && (
                <span className="text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Approval Pending
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border/5 pt-2 mt-1">
              {quote.status === 'DRAFT' && hasQuoteWriteAccess && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(quote)}
                    className="h-7 text-xs cursor-pointer text-foreground"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(quote.id)}
                    disabled={isDeleting}
                    className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                  >
                    {isDeleting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onTransitionStatus(quote.id, 'SENT')}
                    disabled={isTransitioning}
                    className="h-7 text-xs cursor-pointer gap-1 border-border/40 text-foreground"
                  >
                    {isTransitioning && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    <Send className="h-3 w-3" /> Send
                  </Button>
                </>
              )}

              {quote.requiresApproval && !quote.approved && hasQuoteApproveAccess && (
                <Button
                  onClick={() => onApprove(quote.id)}
                  disabled={isApproving}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-7 text-xs cursor-pointer"
                >
                  {isApproving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Clear Discount Approval
                </Button>
              )}

              {quote.status !== 'APPROVED' &&
                quote.status !== 'EXPIRED' &&
                (!quote.requiresApproval || quote.approved) &&
                hasQuoteWriteAccess && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onTransitionStatus(quote.id, 'APPROVED')}
                    disabled={isTransitioning}
                    className="h-7 text-xs font-bold cursor-pointer gap-1 bg-secondary text-secondary-foreground"
                  >
                    {isTransitioning && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    <Check className="h-3 w-3" /> Activate & Apply
                  </Button>
                )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
