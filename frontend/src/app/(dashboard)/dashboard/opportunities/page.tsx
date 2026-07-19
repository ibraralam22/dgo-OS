'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { opportunitiesApi, OpportunityListItem, OpportunityStage } from '@services/opportunities-api';
import { clientsApi } from '@services/clients-api';
import { useAuthStore } from '@store/auth-store';
import { useDebounce } from '@hooks/use-debounce';
import { toast } from '@utils/toast';
import Link from 'next/link';
import {
  TrendingUp,
  Plus,
  Search,
  Loader2,
  Trash2,
  Edit,
  ArrowRight,
  Coins,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { cn } from '@utils/cn';
import OpportunityModal from '@components/opportunities/opportunity-modal';

const STAGES: { stage: OpportunityStage; label: string; prob: number; color: string; border: string; bg: string }[] = [
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

export default function OpportunitiesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Search & Filtering States
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  const debouncedSearch = useDebounce(search, 300);

  // Modal and Confirmation States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityListItem | undefined>(undefined);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Queries
  const { data: opportunitiesResponse, isLoading } = useQuery({
    queryKey: ['opportunities-list', page, debouncedSearch, selectedAccount, selectedStage],
    queryFn: () =>
      opportunitiesApi.list({
        page,
        limit: 100, // Fetch all for kanban layout
        search: debouncedSearch || undefined,
        accountId: selectedAccount || undefined,
        stage: selectedStage || undefined,
      }),
  });

  const { data: accountsResponse } = useQuery({
    queryKey: ['accounts-filter-list'],
    queryFn: () => clientsApi.listAccounts({ page: 1, limit: 100 }),
  });

  const opportunities = opportunitiesResponse?.data ?? [];
  const accounts = accountsResponse?.data ?? [];

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => opportunitiesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast.success('Deal soft deleted successfully');
      setConfirmDeleteId(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to delete deal';
      toast.error(msg);
    },
  });

  // Access rights check
  const hasWriteAccess = user?.permissions.includes('opportunities:write') ?? false;

  // KPI Calculations
  const kpis = useMemo(() => {
    let pipelineSum = 0; // sum of DISCOVERY, PROPOSAL, NEGOTIATION
    let weightedForecast = 0; // sum of (amount * probability / 100)
    let activeDealsCount = 0;
    let wonCount = 0;
    let lostCount = 0;

    opportunities.forEach((opp) => {
      const amount = Number(opp.amount) || 0;
      const prob = Number(opp.probability) || 0;

      weightedForecast += amount * (prob / 100);

      if (opp.stage === 'CLOSED_WON') {
        wonCount++;
      } else if (opp.stage === 'CLOSED_LOST') {
        lostCount++;
      } else {
        activeDealsCount++;
        pipelineSum += amount;
      }
    });

    const winRateVal = wonCount + lostCount > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;
    const format = (val: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    return {
      pipelineSum: format(pipelineSum),
      weightedForecast: format(weightedForecast),
      activeDealsCount,
      winRate: `${winRateVal.toFixed(1)}%`,
    };
  }, [opportunities]);

  const handleEditClick = (opp: OpportunityListItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedOpportunity(opp);
    setIsModalOpen(true);
  };

  const handleCreateClick = () => {
    setSelectedOpportunity(undefined);
    setIsModalOpen(true);
  };

  const formatCurrency = (val: number | string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(val));

  // Partition opportunities by stage for Kanban
  const opportunitiesByStage = useMemo(() => {
    const partitioned: Record<OpportunityStage, OpportunityListItem[]> = {
      DISCOVERY: [],
      PROPOSAL: [],
      NEGOTIATION: [],
      CLOSED_WON: [],
      CLOSED_LOST: [],
    };
    opportunities.forEach((opp) => {
      if (partitioned[opp.stage]) {
        partitioned[opp.stage].push(opp);
      }
    });
    return partitioned;
  }, [opportunities]);

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Deals & Opportunities Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage outsourcing squads, value projections, and stage progression.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-muted/20 border border-border/40 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'p-1.5 rounded-md text-muted-foreground hover:text-foreground focus:outline-none transition-all cursor-pointer',
                viewMode === 'kanban' && 'bg-primary/15 text-primary border border-primary/20'
              )}
              title="Kanban Board View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-md text-muted-foreground hover:text-foreground focus:outline-none transition-all cursor-pointer',
                viewMode === 'table' && 'bg-primary/15 text-primary border border-primary/20'
              )}
              title="Data Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {hasWriteAccess && (
            <Button onClick={handleCreateClick} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Initiate Deal
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Aggregates */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total active pipeline */}
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
          <div className="h-10 w-10 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
            <Coins className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active Pipeline</span>
            <span className="text-2xl font-extrabold text-foreground mt-0.5">{kpis.pipelineSum}</span>
          </div>
        </div>

        {/* Weighted forecast */}
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
          <div className="h-10 w-10 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Weighted Forecast</span>
            <span className="text-2xl font-extrabold text-foreground mt-0.5">{kpis.weightedForecast}</span>
          </div>
        </div>

        {/* Active Deals count */}
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
          <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active Deals</span>
            <span className="text-2xl font-extrabold text-foreground mt-0.5">{kpis.activeDealsCount}</span>
          </div>
        </div>

        {/* Closed Won Win Rate */}
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Closed Win Rate</span>
            <span className="text-2xl font-extrabold text-foreground mt-0.5">{kpis.winRate}</span>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card/45 border border-border/20 rounded-xl p-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deals, descriptions or accounts..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Account Filter */}
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            <option value="">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>

          {/* Stage Filter (Data table mode only) */}
          {viewMode === 'table' && (
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="h-9 rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="">All Stages</option>
              {STAGES.map((s) => (
                <option key={s.stage} value={s.stage}>
                  {s.label} ({s.prob}%)
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Retrieving organization opportunities...</span>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 overflow-x-auto pb-4">
          {STAGES.map(({ stage, label, prob, color, border, bg }) => {
            const list = opportunitiesByStage[stage] ?? [];
            const colTotal = list.reduce((sum, o) => sum + Number(o.amount), 0);

            return (
              <div key={stage} className="flex flex-col gap-4 min-w-[240px] bg-card/25 rounded-xl border border-border/20 p-4 h-[600px]">
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-border/10 pb-2">
                  <div className="flex flex-col">
                    <span className={cn('text-sm font-bold tracking-tight', color)}>{label}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">{prob}% Probability</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs bg-muted/30 px-2 py-0.5 rounded-full text-foreground font-semibold">
                      {list.length}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold mt-0.5">{formatCurrency(colTotal)}</span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
                  {list.length === 0 ? (
                    <div className="h-full border border-dashed border-border/10 rounded-lg flex items-center justify-center p-4">
                      <span className="text-[11px] text-muted-foreground text-center">No deals in this stage</span>
                    </div>
                  ) : (
                    list.map((opp) => (
                      <Link
                        key={opp.id}
                        href={`/dashboard/opportunities/${opp.id}`}
                        className="group flex flex-col bg-card/85 border border-border/30 hover:border-primary/45 rounded-lg p-3 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 relative overflow-hidden"
                      >
                        {/* Status glow indicators */}
                        {opp.stage === 'CLOSED_WON' && <div className="absolute top-0 right-0 w-12 h-1 bg-emerald-500" />}
                        {opp.stage === 'CLOSED_LOST' && <div className="absolute top-0 right-0 w-12 h-1 bg-rose-500" />}

                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {opp.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                          Account: <span className="text-foreground font-medium">{opp.account?.name}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          Value: <span className="text-foreground font-extrabold">{formatCurrency(opp.amount)}</span>
                        </span>

                        {opp.requiresApproval && (
                          <div className={cn(
                            "flex items-center gap-1 mt-2 px-1.5 py-0.5 rounded text-[9px] font-bold w-fit",
                            opp.approved ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          )}>
                            {opp.approved ? <ShieldCheck className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                            {opp.approved ? 'Approved' : 'Needs Approval'}
                          </div>
                        )}

                        <div className="flex items-center justify-between border-t border-border/10 mt-3 pt-2 text-[9px] text-muted-foreground">
                          <span>Est. Close: {opp.closeDate ? opp.closeDate.split('T')[0] : 'N/A'}</span>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {hasWriteAccess && (
                              <button
                                onClick={(e) => handleEditClick(opp, e)}
                                className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                              >
                                <Edit className="h-2.5 w-2.5" />
                              </button>
                            )}
                            {hasWriteAccess && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setConfirmDeleteId(opp.id);
                                }}
                                className="p-0.5 rounded hover:bg-accent text-rose-400 hover:text-rose-300 cursor-pointer focus:outline-none"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            )}
                            <ArrowRight className="h-3 w-3 text-primary" />
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Data Table View */
        <div className="glass-card rounded-xl overflow-hidden border border-border/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/30 bg-muted/10 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="px-6 py-4">Deal Title</th>
                  <th className="px-6 py-4">B2B Account</th>
                  <th className="px-6 py-4">Assigned Owner</th>
                  <th className="px-6 py-4">Est. Close Date</th>
                  <th className="px-6 py-4">Stage</th>
                  <th className="px-6 py-4">Budget Value</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10 text-sm text-foreground">
                {opportunities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      No deals found matching filter queries.
                    </td>
                  </tr>
                ) : (
                  opportunities.map((opp) => (
                    <tr key={opp.id} className="hover:bg-muted/5 transition-colors group">
                      <td className="px-6 py-4 font-bold text-foreground hover:text-primary transition-colors">
                        <Link href={`/dashboard/opportunities/${opp.id}`}>
                          {opp.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{opp.account?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {opp.owner ? `${opp.owner.firstName} ${opp.owner.lastName}` : <span className="italic">Unassigned</span>}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{opp.closeDate ? opp.closeDate.split('T')[0] : 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[11px] font-bold border',
                            opp.stage === 'DISCOVERY' && 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                            opp.stage === 'PROPOSAL' && 'bg-sky-500/10 text-sky-400 border-sky-500/20',
                            opp.stage === 'NEGOTIATION' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                            opp.stage === 'CLOSED_WON' && 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                            opp.stage === 'CLOSED_LOST' && 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          )}
                        >
                          {opp.stage.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">{formatCurrency(opp.amount)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/dashboard/opportunities/${opp.id}`} className="p-1 rounded hover:bg-accent/40 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none">
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                          {hasWriteAccess && (
                            <button
                              onClick={(e) => handleEditClick(opp, e)}
                              className="p-1 rounded hover:bg-accent/40 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {hasWriteAccess && (
                            <button
                              onClick={() => setConfirmDeleteId(opp.id)}
                              className="p-1 rounded hover:bg-accent/40 text-rose-400 hover:text-rose-300 cursor-pointer focus:outline-none"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <OpportunityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        opportunity={selectedOpportunity}
      />

      {/* Delete Confirmation Alert Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog">
          <div className="w-full max-w-sm glass-card border border-border/40 p-6 rounded-2xl bg-card flex flex-col gap-4 text-foreground shadow-xl">
            <h3 className="text-md font-bold tracking-tight">Confirm Deletion</h3>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to soft delete this opportunity? Historical metrics and logs will be preserved but the deal card will be hidden.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={() => deleteMutation.mutate(confirmDeleteId)}
              >
                {deleteMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
