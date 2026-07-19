'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi, SavedReport, ReportCategory } from '@services/reports-api';
import { useAuthStore } from '@store/auth-store';
import { toast } from '@utils/toast';
import { cn } from '@utils/cn';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  LifeBuoy,
  Calendar,
  Loader2,
  Trash2,
  Bookmark,
  ChevronRight,
  Filter,
  DollarSign,
  Briefcase,
  AlertTriangle,
  X,
  FileText,
} from 'lucide-react';

const CATEGORY_CONFIG: Record<
  ReportCategory,
  { label: string; bg: string; text: string }
> = {
  SALES:     { label: 'Sales Pipeline', bg: 'bg-primary/10', text: 'text-primary' },
  FINANCIAL: { label: 'Financial Performance', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  SUPPORT:   { label: 'Service Desk Support', bg: 'bg-sky-500/10', text: 'text-sky-400' },
};

export default function ReportsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'sales' | 'financial' | 'support' | 'saved'>('sales');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');

  const hasWrite = user?.permissions?.includes('reports:write') ?? false;

  // Formats USD currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Queries
  const { data: salesData, isLoading: isSalesLoading } = useQuery({
    queryKey: ['reports-sales', fromDate, toDate],
    queryFn: () => reportsApi.getSales({ fromDate: fromDate || undefined, toDate: toDate || undefined }),
    enabled: activeTab === 'sales',
  });

  const { data: financialData, isLoading: isFinancialLoading } = useQuery({
    queryKey: ['reports-financial', fromDate, toDate],
    queryFn: () => reportsApi.getFinancial({ fromDate: fromDate || undefined, toDate: toDate || undefined }),
    enabled: activeTab === 'financial',
  });

  const { data: supportData, isLoading: isSupportLoading } = useQuery({
    queryKey: ['reports-support', fromDate, toDate],
    queryFn: () => reportsApi.getSupport({ fromDate: fromDate || undefined, toDate: toDate || undefined }),
    enabled: activeTab === 'support',
  });

  const { data: savedReports, isLoading: isSavedLoading } = useQuery({
    queryKey: ['reports-saved'],
    queryFn: () => reportsApi.listSaved(),
    enabled: activeTab === 'saved',
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; category: ReportCategory; config: any }) =>
      reportsApi.createSaved(data),
    onSuccess: () => {
      toast.success('Report layout saved');
      setIsSavingConfig(false);
      setSaveName('');
      setSaveDesc('');
      queryClient.invalidateQueries({ queryKey: ['reports-saved'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save configuration'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportsApi.deleteSaved(id),
    onSuccess: () => {
      toast.success('Saved report deleted');
      queryClient.invalidateQueries({ queryKey: ['reports-saved'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Delete failed'),
  });

  const handleSaveActiveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) {
      toast.error('Please enter a name for the report configuration');
      return;
    }

    const categoryMap: Record<string, ReportCategory> = {
      sales: 'SALES',
      financial: 'FINANCIAL',
      support: 'SUPPORT',
    };

    saveMutation.mutate({
      name: saveName.trim(),
      description: saveDesc.trim() || undefined,
      category: categoryMap[activeTab] || 'SALES',
      config: {
        fromDate: fromDate || null,
        toDate: toDate || null,
      },
    });
  };

  const handleLoadSavedConfig = (report: SavedReport) => {
    setFromDate(report.config.fromDate || '');
    setToDate(report.config.toDate || '');
    const tabMap: Record<string, 'sales' | 'financial' | 'support'> = {
      SALES: 'sales',
      FINANCIAL: 'financial',
      SUPPORT: 'support',
    };
    setActiveTab(tabMap[report.category] || 'sales');
    toast.success(`Loaded saved configuration: ${report.name}`);
  };

  return (
    <div className="flex flex-col gap-6 pb-12 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black tracking-tight text-foreground">Reports & Analytics</h1>
          <p className="text-xs text-muted-foreground">Monitor organizational health using dynamic aggregations and performance analytics.</p>
        </div>

        {/* Date Filters (Hidden on Saved tab) */}
        {activeTab !== 'saved' && (
          <div className="glass-card border border-border/25 rounded-xl px-4 py-2 bg-card/30 flex items-center gap-3 w-full md:w-auto text-xs font-semibold shadow-xs">
            <span className="text-muted-foreground flex items-center gap-1.5 shrink-0"><Filter className="h-3.5 w-3.5" /> Filter Date:</span>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 py-0 px-2 max-w-[130px] font-bold text-foreground" />
            <span className="text-muted-foreground">to</span>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 py-0 px-2 max-w-[130px] font-bold text-foreground" />
            {(fromDate || toDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setFromDate(''); setToDate(''); }} className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            {hasWrite && (
              <Button onClick={() => setIsSavingConfig(true)} variant="outline" size="sm" className="h-8 px-2 flex items-center gap-1">
                <Bookmark className="h-3 w-3" /> Save Layout
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-border/20">
        {[
          { key: 'sales', label: 'Sales Pipeline', icon: <TrendingUp className="h-4 w-4" /> },
          { key: 'financial', label: 'Financial Performance', icon: <CreditCard className="h-4 w-4" /> },
          { key: 'support', label: 'Service Desk Support', icon: <LifeBuoy className="h-4 w-4" /> },
          { key: 'saved', label: 'Saved Layouts', icon: <Bookmark className="h-4 w-4" /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              'flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] cursor-pointer focus:outline-none',
              activeTab === tab.key
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── SALES PIPELINE TAB ────────────────────────────────────────────── */}
      {activeTab === 'sales' && (
        isSalesLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Aggregating opportunities data...</span>
          </div>
        ) : salesData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sales KPIs */}
            <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Deals', value: salesData.totalDeals, icon: <Briefcase className="h-6 w-6 text-primary/40" /> },
                { label: 'Win/Loss Rate', value: `${salesData.winRate}%`, icon: <TrendingUp className="h-6 w-6 text-emerald-500/40" /> },
                { label: 'Pipeline Value', value: formatCurrency(salesData.pipelineValue), icon: <DollarSign className="h-6 w-6 text-indigo-500/40" /> },
                { label: 'Average Deal Size', value: formatCurrency(salesData.averageDealSize), icon: <DollarSign className="h-6 w-6 text-indigo-500/40" /> },
              ].map((kpi) => (
                <div key={kpi.label} className="glass-card border border-border/25 rounded-2xl p-4 bg-card/30 flex items-center justify-between shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{kpi.label}</span>
                    <span className="text-lg font-black mt-1 text-foreground">{kpi.value}</span>
                  </div>
                  {kpi.icon}
                </div>
              ))}
            </div>

            {/* Stages breakdown */}
            <div className="lg:col-span-2 glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
              <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">Pipeline Distribution by Stage</h3>
              <div className="flex flex-col gap-4 mt-2">
                {salesData.stages.length === 0 ? (
                  <span className="text-xs text-muted-foreground py-4">No opportunities data in this range</span>
                ) : (
                  salesData.stages.map((st) => {
                    const pct = salesData.pipelineValue > 0 ? (st.value / salesData.pipelineValue) * 100 : 0;
                    return (
                      <div key={st.stage} className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-foreground">{st.stage} ({st.count} deals)</span>
                          <span className="text-muted-foreground">{formatCurrency(st.value)}</span>
                        </div>
                        <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* General Advice */}
            <div className="glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-3 shadow-sm justify-between">
              <div className="flex flex-col gap-2">
                <AlertTriangle className="h-6 w-6 text-amber-500 opacity-60" />
                <h4 className="text-xs font-bold text-foreground">SaaS Sales Analysis</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">Ensure active pipeline deals are updated with correct closing date targets. Heavy skewing in early discovery phases represents marketing pipeline velocity gaps.</p>
              </div>
            </div>

          </div>
        ) : null
      )}

      {/* ─── FINANCIAL PERFORMANCE TAB ───────────────────────────────────────── */}
      {activeTab === 'financial' && (
        isFinancialLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Aggregating revenue invoicing data...</span>
          </div>
        ) : financialData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Financial KPIs */}
            <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Invoices', value: financialData.invoicesCount, icon: <FileText className="h-6 w-6 text-primary/40" /> },
                { label: 'Revenue Billed', value: formatCurrency(financialData.totalBilled), icon: <DollarSign className="h-6 w-6 text-indigo-500/40" /> },
                { label: 'Collected Revenue', value: formatCurrency(financialData.totalPaid), icon: <DollarSign className="h-6 w-6 text-emerald-500/40" /> },
                { label: 'Outstanding Balance', value: formatCurrency(financialData.totalOutstanding), icon: <DollarSign className="h-6 w-6 text-rose-500/40" /> },
              ].map((kpi) => (
                <div key={kpi.label} className="glass-card border border-border/25 rounded-2xl p-4 bg-card/30 flex items-center justify-between shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{kpi.label}</span>
                    <span className="text-lg font-black mt-1 text-foreground">{kpi.value}</span>
                  </div>
                  {kpi.icon}
                </div>
              ))}
            </div>

            {/* Invoices Status breakdown */}
            <div className="glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
              <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none font-black">Invoices status metrics</h3>
              <div className="flex flex-col gap-3 mt-2">
                {financialData.statuses.map((st) => (
                  <div key={st.status} className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-muted-foreground">{st.status}</span>
                    <span className="bg-muted/30 border border-border/20 px-2.5 py-0.5 rounded-lg text-[10px] text-foreground font-black font-mono">{st.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment methods list */}
            <div className="lg:col-span-2 glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
              <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none font-black">Collected Payments by Method</h3>
              <div className="flex flex-col gap-4 mt-2">
                {financialData.paymentMethods.length === 0 ? (
                  <span className="text-xs text-muted-foreground py-4">No payments recorded in this range</span>
                ) : (
                  financialData.paymentMethods.map((pm) => {
                    const totalCollected = financialData.totalPaid || 1;
                    const pct = (pm.value / totalCollected) * 100;
                    return (
                      <div key={pm.method} className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-foreground">{pm.method} ({pm.count} logs)</span>
                          <span className="text-muted-foreground">{formatCurrency(pm.value)}</span>
                        </div>
                        <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        ) : null
      )}

      {/* ─── SUPPORT WORKLOAD TAB ──────────────────────────────────────────── */}
      {activeTab === 'support' && (
        isSupportLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Aggregating support desk tickets...</span>
          </div>
        ) : supportData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Status breakdown */}
            <div className="glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
              <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">Tickets by Status</h3>
              <div className="flex flex-col gap-3 mt-2">
                {supportData.statuses.map((st) => (
                  <div key={st.status} className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-muted-foreground">{st.status}</span>
                    <span className="bg-muted/30 border border-border/20 px-2.5 py-0.5 rounded-lg text-[10px] text-foreground font-black font-mono">{st.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Priorities count */}
            <div className="glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
              <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">Tickets by Priority</h3>
              <div className="flex flex-col gap-3 mt-2">
                {supportData.priorities.map((pr) => (
                  <div key={pr.priority} className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-muted-foreground">{pr.priority}</span>
                    <span className="bg-muted/30 border border-border/20 px-2.5 py-0.5 rounded-lg text-[10px] text-foreground font-black font-mono">{pr.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Categories count */}
            <div className="glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
              <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none font-black">Tickets by Category</h3>
              <div className="flex flex-col gap-3 mt-2">
                {supportData.categories.map((cat) => (
                  <div key={cat.category} className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-muted-foreground">{cat.category}</span>
                    <span className="bg-muted/30 border border-border/20 px-2.5 py-0.5 rounded-lg text-[10px] text-foreground font-black font-mono">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : null
      )}

      {/* ─── SAVED LAYOUTS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'saved' && (
        isSavedLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading saved reports...</span>
          </div>
        ) : savedReports?.length === 0 ? (
          <div className="h-48 border border-dashed border-border/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Bookmark className="h-8 w-8 opacity-30 animate-pulse" />
            <span className="text-xs">No saved report layouts registered</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border/20 bg-card/20 shadow-sm text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/20 bg-muted/20 text-muted-foreground font-black uppercase tracking-wider select-none">
                  <th className="px-5 py-3">Report Name</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Configuration Parameters</th>
                  <th className="px-5 py-3">Created By</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10 font-medium">
                {savedReports?.map((report) => {
                  const catCfg = CATEGORY_CONFIG[report.category];
                  const hasDateParams = report.config.fromDate || report.config.toDate;

                  return (
                    <tr key={report.id} className="hover:bg-accent/10 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-extrabold text-foreground">{report.name}</span>
                          <span className="text-[10px] text-muted-foreground">{report.description || 'No description'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider', catCfg.bg, catCfg.text)}>
                          {catCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground font-mono text-[10px]">
                        {hasDateParams
                          ? `Date range: ${report.config.fromDate || 'any'} to ${report.config.toDate || 'any'}`
                          : 'All-time cumulative'}
                      </td>
                      <td className="px-5 py-3.5 text-foreground font-bold">
                        {report.createdBy.firstName} {report.createdBy.lastName}
                      </td>
                      <td className="px-5 py-3.5 text-right flex justify-end gap-2">
                        <Button onClick={() => handleLoadSavedConfig(report)} variant="outline" size="sm" className="gap-1 px-2.5">
                          Load Layout <ChevronRight className="h-3 w-3" />
                        </Button>
                        {hasWrite && (
                          <Button
                            onClick={() => deleteMutation.mutate(report.id)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Save Config Modal */}
      {isSavingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setIsSavingConfig(false)} />
          <div className="relative w-full max-w-md glass-card bg-background border border-border/30 rounded-2xl shadow-2xl z-10 animate-in zoom-in-95 duration-150 p-6 flex flex-col">
            
            <div className="flex items-center justify-between border-b border-border/20 pb-4 mb-4 shrink-0">
              <h3 className="text-sm font-black text-foreground">Save Report Configuration</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsSavingConfig(false)} className="h-7 w-7 rounded-lg">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveActiveConfig} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Report Name *</label>
                <Input
                  required
                  placeholder="e.g. Sales Q2 Win Rates"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="Explain why this analytics report view layout is saved..."
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                />
              </div>

              <Button type="submit" disabled={saveMutation.isPending} className="w-full mt-2 gap-2" size="sm">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}
                Save Report Template
              </Button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
