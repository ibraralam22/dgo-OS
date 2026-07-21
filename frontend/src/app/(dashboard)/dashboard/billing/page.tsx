'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi, Invoice, InvoiceStatus, CreateInvoiceInput } from '@services/invoices-api';
import { paymentsApi, Payment, PaymentMethod, PaymentStatus, CreatePaymentInput } from '@services/payments-api';
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
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign,
  TrendingUp,
  Eye,
  User,
  ShieldAlert,
  Ban,
} from 'lucide-react';

import { STATUS_CONFIG, PAYMENT_STATUS_CONFIG, PAYMENT_METHOD_LABELS } from '@components/billing/constants';
import { CreateInvoiceModal } from '@components/billing/create-invoice-modal';
import { InvoiceDrawer } from '@components/billing/invoice-drawer';
import { PaymentDrawer } from '@components/billing/payment-drawer';

export default function BillingPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 300);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);

  // Record Payment fields
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const hasWrite = user?.permissions?.includes('billing:write') ?? false;
  const isAdmin = ['SuperAdmin', 'TenantAdmin'].includes(user?.role || '');

  // Queries
  const { data: kpis } = useQuery({
    queryKey: ['invoice-kpis'],
    queryFn: () => invoicesApi.kpis(),
    staleTime: 30_000,
  });

  const { data: invoicesResponse, isLoading: isInvoicesLoading } = useQuery({
    queryKey: ['invoices-list', page, debouncedSearch, filterStatus, filterAccount],
    queryFn: () =>
      invoicesApi.list({
        page,
        limit: 15,
        search: debouncedSearch || undefined,
        status: filterStatus || undefined,
        accountId: filterAccount || undefined,
      }),
    enabled: activeTab === 'invoices',
  });

  const { data: paymentsResponse, isLoading: isPaymentsLoading } = useQuery({
    queryKey: ['payments-list', page, debouncedSearch, filterStatus, filterMethod],
    queryFn: () =>
      paymentsApi.list({
        page,
        limit: 15,
        search: debouncedSearch || undefined,
        status: filterStatus || undefined,
        paymentMethod: filterMethod || undefined,
      }),
    enabled: activeTab === 'payments',
  });

  const { data: accountsResponse } = useQuery({
    queryKey: ['accounts-dropdown-list'],
    queryFn: () => clientsApi.listAccounts({ page: 1, limit: 100 }),
  });

  const invoices = invoicesResponse?.data || [];
  const payments = paymentsResponse?.data || [];
  const accounts = accountsResponse?.data || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['invoices-list'] });
    queryClient.invalidateQueries({ queryKey: ['payments-list'] });
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
    mutationFn: (data: CreatePaymentInput) => paymentsApi.create(data),
    onSuccess: (newPayment) => {
      invalidate();
      toast.success('Payment transaction recorded successfully');
      setPaymentInvoiceId(null);
      setPaymentAmount('');
      setPaymentRef('');
      setPaymentNotes('');
      if (selectedInvoice?.id === newPayment.invoiceId) {
        // Fetch updated invoice
        invoicesApi.get(newPayment.invoiceId).then(setSelectedInvoice);
      }
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to record payment'),
  });

  const voidPaymentMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.void(id),
    onSuccess: (updatedPayment) => {
      invalidate();
      toast.success('Payment transaction voided successfully');
      if (selectedPayment?.id === updatedPayment.id) {
        setSelectedPayment(updatedPayment);
      }
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to void payment'),
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
        {hasWrite && activeTab === 'invoices' && (
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

      {/* Tab Switcher */}
      <div className="flex border-b border-border/20">
        <button
          onClick={() => { setActiveTab('invoices'); setSearch(''); setFilterStatus(''); setPage(1); }}
          className={cn(
            'px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer',
            activeTab === 'invoices' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Invoices Registry
        </button>
        <button
          onClick={() => { setActiveTab('payments'); setSearch(''); setFilterStatus(''); setPage(1); }}
          className={cn(
            'px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer',
            activeTab === 'payments' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Payments Ledger
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="glass-card border border-border/25 rounded-2xl p-4 bg-card/30 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={activeTab === 'invoices' ? 'Search Invoice #...' : 'Search Reference #...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
          {activeTab === 'invoices' ? (
            <>
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
            </>
          ) : (
            <>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer text-muted-foreground w-40"
              >
                <option value="">All Statuses</option>
                {Object.keys(PAYMENT_STATUS_CONFIG).map((st) => (
                  <option key={st} value={st}>{PAYMENT_STATUS_CONFIG[st as PaymentStatus].label}</option>
                ))}
              </select>

              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="h-9 rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer text-muted-foreground w-48"
              >
                <option value="">All Methods</option>
                {Object.keys(PAYMENT_METHOD_LABELS).map((m) => (
                  <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m as PaymentMethod]}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Tables content */}
      {activeTab === 'invoices' ? (
        isInvoicesLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading invoices registry...</span>
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
        )
      ) : (
        isPaymentsLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading transaction ledger...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="h-48 border border-dashed border-border/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <DollarSign className="h-8 w-8 opacity-30 animate-pulse" />
            <span className="text-xs">No transactions recorded</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border/20 bg-card/20 shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/20 bg-muted/20 text-muted-foreground font-black uppercase tracking-wider select-none">
                  <th className="px-5 py-3">Transaction ID</th>
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10 font-medium">
                {payments.map((pm) => {
                  const methodCfg = PAYMENT_METHOD_LABELS[pm.paymentMethod];
                  const statusCfg = PAYMENT_STATUS_CONFIG[pm.status];

                  return (
                    <tr
                      key={pm.id}
                      onClick={() => setSelectedPayment(pm)}
                      className="hover:bg-accent/10 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 font-mono text-muted-foreground text-[10px]">
                        {pm.id.slice(0, 8)}...
                      </td>
                      <td className="px-5 py-3.5 font-bold text-foreground">
                        {pm.invoice.invoiceNumber}
                      </td>
                      <td className="px-5 py-3.5 font-extrabold text-foreground">
                        {pm.invoice.account.name}
                      </td>
                      <td className="px-5 py-3.5 font-black text-emerald-400">
                        ${Number(pm.amount).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {new Date(pm.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground font-semibold">
                        {methodCfg}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-foreground text-[10px]">
                        {pm.referenceNumber || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn('px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider', statusCfg.color, statusCfg.border, statusCfg.bg)}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedPayment(pm)}
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
        )
      )}

      {/* Invoice Detail Drawer */}
      {selectedInvoice && (
        <InvoiceDrawer
          invoice={selectedInvoice}
          hasWrite={hasWrite}
          onClose={() => setSelectedInvoice(null)}
          onDelete={(id: string) => deleteMutation.mutate(id)}
          onUpdateStatus={(id: string, status: 'SENT' | 'VOID' | 'OVERDUE') => patchStatusMutation.mutate({ id, status })}
          onOpenPayment={(id: string) => setPaymentInvoiceId(id)}
        />
      )}

      {/* Payment Detail Drawer */}
      {selectedPayment && (
        <PaymentDrawer
          payment={selectedPayment}
          isAdmin={isAdmin}
          hasWrite={hasWrite}
          onClose={() => setSelectedPayment(null)}
          onVoid={(id: string) => voidPaymentMutation.mutate(id)}
        />
      )}

      {/* Record Payment Dialog */}
      {paymentInvoiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setPaymentInvoiceId(null)} />
          <div className="relative w-full max-w-md glass-card bg-background border border-border/30 rounded-2xl shadow-2xl z-10 p-6 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-black text-foreground mb-4">Record Client Payment</h3>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Amount Paid ($) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Enter payment amount"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Payment Date *</label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="h-9 w-full rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer"
                  >
                    {Object.keys(PAYMENT_METHOD_LABELS).map((m) => (
                      <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m as PaymentMethod]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Reference / Transaction Number</label>
                <Input
                  placeholder="Check #, Wire TXID, Stripe ID"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Notes / Memo</label>
                <textarea
                  placeholder="Optional billing or transaction comments..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <Button
                  onClick={() => {
                    const amt = parseFloat(paymentAmount);
                    if (isNaN(amt) || amt <= 0) {
                      toast.error('Please enter a valid amount');
                      return;
                    }
                    recordPaymentMutation.mutate({
                      invoiceId: paymentInvoiceId,
                      amount: amt,
                      paymentDate: new Date(paymentDate).toISOString(),
                      paymentMethod,
                      referenceNumber: paymentRef.trim() || undefined,
                      notes: paymentNotes.trim() || undefined,
                    });
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
