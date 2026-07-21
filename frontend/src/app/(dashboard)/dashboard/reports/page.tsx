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
  TrendingUp,
  CreditCard,
  LifeBuoy,
  Loader2,
  Bookmark,
  X,
} from 'lucide-react';
import { SalesReportView } from '@components/reports/sales-report-view';
import { FinancialReportView } from '@components/reports/financial-report-view';
import { SupportReportView } from '@components/reports/support-report-view';
import { SavedReportsView } from '@components/reports/saved-reports-view';

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
            <span className="text-muted-foreground flex items-center gap-1.5 shrink-0"><Bookmark className="h-3.5 w-3.5" /> Filter Date:</span>
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

      {/* SALES PIPELINE TAB */}
      {activeTab === 'sales' && (
        isSalesLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Aggregating opportunities data...</span>
          </div>
        ) : salesData ? (
          <SalesReportView salesData={salesData} />
        ) : null
      )}

      {/* FINANCIAL PERFORMANCE TAB */}
      {activeTab === 'financial' && (
        isFinancialLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Aggregating revenue invoicing data...</span>
          </div>
        ) : financialData ? (
          <FinancialReportView financialData={financialData} />
        ) : null
      )}

      {/* SUPPORT WORKLOAD TAB */}
      {activeTab === 'support' && (
        isSupportLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Aggregating support desk tickets...</span>
          </div>
        ) : supportData ? (
          <SupportReportView supportData={supportData} />
        ) : null
      )}

      {/* SAVED LAYOUTS TAB */}
      {activeTab === 'saved' && (
        <SavedReportsView
          savedReports={savedReports}
          isSavedLoading={isSavedLoading}
          hasWrite={hasWrite}
          onLoadConfig={handleLoadSavedConfig}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
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
