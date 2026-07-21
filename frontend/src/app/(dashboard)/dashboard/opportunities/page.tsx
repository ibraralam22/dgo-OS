'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { opportunitiesApi, OpportunityListItem, OpportunityStage } from '@services/opportunities-api';
import { clientsApi } from '@services/clients-api';
import { useAuthStore } from '@store/auth-store';
import { useDebounce } from '@hooks/use-debounce';
import { toast } from '@utils/toast';
import {
  TrendingUp,
  Plus,
  Search,
  Loader2,
  Coins,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { cn } from '@utils/cn';
import OpportunityModal from '@components/opportunities/opportunity-modal';
import { STAGES } from '@components/opportunities/constants';
import { OpportunityKanban } from '@components/opportunities/opportunity-kanban';
import { OpportunityTable } from '@components/opportunities/opportunity-table';

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

      {/* Main pipeline views */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Retrieving organization opportunities...</span>
        </div>
      ) : viewMode === 'kanban' ? (
        <OpportunityKanban
          opportunitiesByStage={opportunitiesByStage}
          hasWriteAccess={hasWriteAccess}
          onEdit={handleEditClick}
          onDelete={setConfirmDeleteId}
        />
      ) : (
        <OpportunityTable
          opportunities={opportunities}
          hasWriteAccess={hasWriteAccess}
          onEdit={handleEditClick}
          onDelete={setConfirmDeleteId}
        />
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
