'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi, Invoice, InvoiceStatus, CreateInvoiceInput, UpdateInvoiceInput, InvoiceLineItemInput } from '@services/invoices-api';
import { clientsApi } from '@services/clients-api';
import { useAuthStore } from '@store/auth-store';
import { useDebounce } from '@hooks/use-debounce';
import { toast } from '@utils/toast';
import { cn } from '@utils/cn';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import {
  CreditCard,
  Plus,
  Search,
  Loader2,
  X,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Ban,
  Calendar,
  FileText,
  DollarSign,
  TrendingUp,
  Percent,
  PlusCircle,
  MinusCircle,
  Eye,
} from 'lucide-react';

const STATUS_CONFIG: Record<
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

export default function BillingPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 300);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const hasWrite = user?.permissions?.includes('billing:write') ?? false;

  // Queries
  const { data: kpis } = useQuery({
    queryKey: ['invoice-kpis'],
    queryFn: () => invoicesApi.kpis(),
    staleTime: 30_000,
  });

  const { data: invoicesResponse, isLoading } = useQuery({
    queryKey: ['invoices-list', page, debouncedSearch, filterStatus, filterAccount],
    queryFn: () =>
      invoicesApi.list({
        page,
        limit: 15,
        search: debouncedSearch || undefined,
        status: filterStatus || undefined,
        accountId: filterAccount || undefined,
      }),
  });

  const { data: accountsResponse } = useQuery({
    queryKey: ['accounts-dropdown-list'],
    queryFn: () => clientsApi.listAccounts({ page: 1, limit: 100 }),
  });

  const invoices = invoicesResponse?.data || [];
  const accounts = accountsResponse?.data || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['invoices-list'] });
    queryClient.invalidateQueries({ queryKey: ['invoice-kpis'] });
  };

  // Mutations
  const patchStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'SENT' | 'VOID' | 'OVERDUE' }) =>
      invoicesApi.patchStatus(id, status),
    onSuccess: (updated) => {
      invalidate();
      toast.success(`Invoice status updated to ${updated.status}`);
      if (selectedInvoice?.id === updated.id) {
        setSelectedInvoice(updated);
      }
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update status'),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      invoicesApi.recordPayment(id, amount),
    onSuccess: (updated) => {
      invalidate();
      toast.success('Payment recorded successfully');
      setPaymentInvoiceId(null);
      setPaymentAmount('');
      if (selectedInvoice?.id === updated.id) {
        setSelectedInvoice(updated);
      }
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to record payment'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => {
      invalidate();
      toast.success('Invoice archived');
      setSelectedInvoice(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Delete failed'),
  });

  return (
    <div className="flex flex-col gap-6 pb-12 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black tracking-tight text-foreground">Financials & Invoices</h1>
          <p className="text-xs text-muted-foreground">Manage client billing, create invoices, track outstanding balances, and log payments.</p>
        </div>
        {hasWrite && (
          <Button onClick={() => setIsCreating(true)} className="gap-2 shrink-0" size="sm">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        )}
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Billed', value: kpis?.totalBilled ? `$${Number(kpis.totalBilled).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00', icon: <TrendingUp className="h-6 w-6 text-primary/40" />, color: 'text-foreground' },
          { label: 'Total Received', value: kpis?.totalPaid ? `$${Number(kpis.totalPaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00', icon: <CheckCircle2 className="h-6 w-6 text-emerald-500/40" />, color: 'text-emerald-400' },
          { label: 'Outstanding Balance', value: kpis?.totalOutstanding ? `$${Number(kpis.totalOutstanding).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00', icon: <DollarSign className="h-6 w-6 text-amber-500/40" />, color: 'text-amber-400' },
          { label: 'Overdue Invoices', value: kpis?.overdueCount ?? '0', icon: <AlertTriangle className="h-6 w-6 text-rose-500/40" />, color: 'text-rose-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card border border-border/25 rounded-2xl p-4 bg-card/30 flex items-center justify-between shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{kpi.label}</span>
              <span className={cn('text-xl font-black mt-1', kpi.color)}>{kpi.value}</span>
            </div>
            {kpi.icon}
          </div>
        ))}
      </div>

      {/* Filters Toolbar */}
      <div className="glass-card border border-border/25 rounded-2xl p-4 bg-card/30 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search Invoice #..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer text-muted-foreground w-40"
          >
            <option value="">All Statuses</option>
            {Object.keys(STATUS_CONFIG).map((st) => (
              <option key={st} value={st}>{STATUS_CONFIG[st as InvoiceStatus].label}</option>
            ))}
          </select>

          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer text-muted-foreground w-48"
          >
            <option value="">All Clients</option>
            {accounts.map((ac) => (
              <option key={ac.id} value={ac.id}>{ac.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoice Table Grid */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading billing registry...</span>
        </div>
      ) : invoices.length === 0 ? (
        <div className="h-48 border border-dashed border-border/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <CreditCard className="h-8 w-8 opacity-30 animate-pulse" />
          <span className="text-xs">No invoices found</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/20 bg-card/20 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/20 bg-muted/20 text-muted-foreground font-black uppercase tracking-wider select-none">
                <th className="px-5 py-3">Invoice #</th>
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Issue Date</th>
                <th className="px-5 py-3">Due Date</th>
                <th className="px-5 py-3">Total Amount</th>
                <th className="px-5 py-3">Balance Due</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10 font-medium">
              {invoices.map((inv) => {
                const statusCfg = STATUS_CONFIG[inv.status];
                const overdue = inv.status === 'OVERDUE' || (inv.status !== 'PAID' && inv.status !== 'VOID' && new Date(inv.dueDate) < new Date());

                return (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className="hover:bg-accent/10 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-bold text-foreground">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-foreground">{inv.account.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{inv.account.domain}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {new Date(inv.issueDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('flex items-center gap-1', overdue ? 'text-rose-400 font-bold' : 'text-muted-foreground')}>
                        {new Date(inv.dueDate).toLocaleDateString()}
                        {overdue && ' ⚠'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-extrabold text-foreground">
                      {inv.currency} {Number(inv.total).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('font-bold', Number(inv.balanceDue) > 0 ? 'text-amber-400' : 'text-emerald-400')}>
                        {inv.currency} {Number(inv.balanceDue).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider', statusCfg.color, statusCfg.border, statusCfg.bg)}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="text-muted-foreground hover:text-foreground hover:bg-accent p-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice Detail Drawer */}
      {selectedInvoice && (
        <InvoiceDrawer
          invoice={selectedInvoice}
          hasWrite={hasWrite}
          onClose={() => setSelectedInvoice(null)}
          onDelete={(id) => deleteMutation.mutate(id)}
          onUpdateStatus={(id, status) => patchStatusMutation.mutate({ id, status })}
          onOpenPayment={(id) => setPaymentInvoiceId(id)}
        />
      )}

      {/* Record Payment Dialog */}
      {paymentInvoiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setPaymentInvoiceId(null)} />
          <div className="relative w-full max-w-sm glass-card bg-background border border-border/30 rounded-2xl shadow-2xl z-10 p-6 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-black text-foreground mb-4">Record Client Payment</h3>
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Amount Paid ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Enter recorded payment amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                <Button
                  onClick={() => {
                    const amt = parseFloat(paymentAmount);
                    if (isNaN(amt) || amt <= 0) {
                      toast.error('Please enter a valid amount');
                      return;
                    }
                    recordPaymentMutation.mutate({ id: paymentInvoiceId, amount: amt });
                  }}
                  className="flex-1"
                  size="sm"
                  disabled={recordPaymentMutation.isPending}
                >
                  {recordPaymentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Submit Payment
                </Button>
                <Button variant="outline" onClick={() => setPaymentInvoiceId(null)} size="sm">Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreating && (
        <CreateInvoiceModal
          accounts={accounts}
          onClose={() => setIsCreating(false)}
          onCreated={() => {
            setIsCreating(false);
            invalidate();
            toast.success('Invoice draft created successfully');
          }}
        />
      )}
    </div>
  );
}

// ─── Invoice Detail Drawer ───────────────────────────────────────────────────

function InvoiceDrawer({
  invoice,
  hasWrite,
  onClose,
  onDelete,
  onUpdateStatus,
  onOpenPayment,
}: {
  invoice: Invoice;
  hasWrite: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: 'SENT' | 'VOID' | 'OVERDUE') => void;
  onOpenPayment: (id: string) => void;
}) {
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

// ─── Create Invoice Modal ────────────────────────────────────────────────────

function CreateInvoiceModal({
  accounts,
  onClose,
  onCreated,
}: {
  accounts: any[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [accountId, setAccountId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('0');
  const [taxPercentage, setTaxPercentage] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [memo, setMemo] = useState('');

  const [lineItems, setLineItems] = useState<InvoiceLineItemInput[]>([
    { itemName: '', description: '', quantity: 1, unitPrice: 0 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculations live
  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const disc = parseFloat(discountPercentage) || 0;
    const tax = parseFloat(taxPercentage) || 0;
    const discountAmount = subtotal * (disc / 100);
    const taxAmount = (subtotal - discountAmount) * (tax / 100);
    const total = subtotal - discountAmount + taxAmount;
    return { subtotal, total };
  }, [lineItems, discountPercentage, taxPercentage]);

  const addLine = () => {
    setLineItems([...lineItems, { itemName: '', description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeLine = (idx: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, key: keyof InvoiceLineItemInput, val: any) => {
    setLineItems(
      lineItems.map((item, i) => {
        if (i === idx) {
          return { ...item, [key]: val };
        }
        return item;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!accountId || !uuidRegex.test(accountId)) {
      toast.error('Please select a valid Client Account');
      return;
    }
    if (lineItems.some((item) => !item.itemName.trim() || item.quantity < 1 || item.unitPrice < 0)) {
      toast.error('Please verify line items are properly filled');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateInvoiceInput = {
        accountId,
        invoiceNumber: invoiceNumber.trim() || undefined,
        issueDate: new Date(issueDate).toISOString(),
        dueDate: new Date(dueDate || issueDate).toISOString(),
        currency,
        discountPercentage: parseFloat(discountPercentage) || 0,
        taxPercentage: parseFloat(taxPercentage) || 0,
        memo: memo.trim() || undefined,
        lineItems,
      };

      await invoicesApi.create(payload);
      onCreated();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Invoice creation failed';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl glass-card bg-background border border-border/30 rounded-2xl shadow-2xl z-10 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/20 shrink-0">
          <h3 className="text-sm font-black text-foreground">Create New Invoice Draft</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 rounded-lg">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Form body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Client Account *</label>
              <select
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer"
              >
                <option value="">— Select B2B Account —</option>
                {accounts.map((ac) => (
                  <option key={ac.id} value={ac.id}>{ac.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Invoice Number</label>
              <Input
                placeholder="INV-XXXX (Optional, auto-generated if blank)"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Issue Date *</label>
              <Input type="date" required value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Due Date *</label>
              <Input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Currency</label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Discount (%)</label>
              <Input type="number" min="0" max="100" step="0.1" value={discountPercentage} onChange={(e) => setDiscountPercentage(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tax (%)</label>
              <Input type="number" min="0" max="100" step="0.1" value={taxPercentage} onChange={(e) => setTaxPercentage(e.target.value)} />
            </div>
          </div>

          {/* Line items Section */}
          <div className="mt-2 border-t border-border/10 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Line Items</h4>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary-light cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5" /> Add Item
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {lineItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start border border-border/10 p-3 rounded-xl bg-card/5">
                  <div className="flex-1 flex flex-col gap-2">
                    <Input
                      placeholder="Item Name"
                      required
                      value={item.itemName}
                      onChange={(e) => updateLine(idx, 'itemName', e.target.value)}
                    />
                    <Input
                      placeholder="Description (Optional)"
                      value={item.description}
                      onChange={(e) => updateLine(idx, 'description', e.target.value)}
                    />
                  </div>
                  <div className="w-20 shrink-0">
                    <Input
                      type="number"
                      min="1"
                      required
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                  <div className="w-28 shrink-0">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="Price"
                      value={item.unitPrice || ''}
                      onChange={(e) => updateLine(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 shrink-0 cursor-pointer mt-1"
                    >
                      <MinusCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Memo / Notes</label>
            <textarea
              placeholder="Payment instructions, bank detail, or notes..."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Calculations Summary */}
          <div className="border-t border-border/15 pt-4 flex justify-end">
            <div className="w-64 flex flex-col gap-1.5 text-xs text-muted-foreground font-semibold">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="text-foreground">{currency} {totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t border-border/10 pt-1.5 text-foreground">
                <span>Estimated Total:</span>
                <span>{currency} {totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full mt-2 gap-2" size="sm">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save Draft Invoice
          </Button>
        </form>
      </div>
    </div>
  );
}
