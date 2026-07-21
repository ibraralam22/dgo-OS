'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi, LeadListItem } from '@services/leads-api';
import { toast } from '@utils/toast';
import { useAuthStore } from '@store/auth-store';
import { useDebounce } from '@hooks/use-debounce';
import {
  Plus,
  Search,
  Loader2,
} from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import LeadModal from '@components/leads/lead-modal';
import { LeadsKpis } from '@components/leads/leads-kpis';
import { LeadsTable } from '@components/leads/leads-table';

export default function LeadsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Search, pagination & filtering
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['leads-list', page, debouncedSearch, statusFilter],
    queryFn: () => leadsApi.list({
      page,
      limit: 10,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
    }),
  });

  // Modal and dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadListItem | undefined>(undefined);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmConvertId, setConfirmConvertId] = useState<string | null>(null);

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast.success('Lead soft deleted successfully');
      setConfirmDeleteId(null);
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => leadsApi.convert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast.success('Lead converted successfully');
      setConfirmConvertId(null);
    },
  });

  // Access rights check
  const hasWriteAccess = user?.permissions.includes('leads:write') ?? false;

  const leads = data?.data ?? [];
  const totalLeads = data?.total ?? 0;
  const totalPages = Math.ceil(totalLeads / 10);

  // KPI aggregates computed locally
  const kpis = useMemo(() => {
    const totalCount = totalLeads;
    const convertedCount = leads.filter((l) => l.status === 'converted').length;
    const activeCount = leads.filter((l) => l.status === 'qualified' || l.status === 'nurturing').length;
    
    // Sum budgets (converting decimals if string)
    const budgetSum = leads.reduce((sum, l) => sum + (l.budget ? Number(l.budget) : 0), 0);

    return {
      totalCount,
      convertedCount,
      activeCount,
      budgetSum: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(budgetSum),
    };
  }, [leads, totalLeads]);

  const handleEditClick = (lead: LeadListItem) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const handleCreateClick = () => {
    setSelectedLead(undefined);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">CRM Leads Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Capture, nurture, qualify, and convert organization client opportunities.
          </p>
        </div>
        {hasWriteAccess && (
          <Button onClick={handleCreateClick} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Lead
          </Button>
        )}
      </div>

      {/* KPI Stats summary */}
      <LeadsKpis
        totalCount={kpis.totalCount}
        budgetSum={kpis.budgetSum}
        activeCount={kpis.activeCount}
        convertedCount={kpis.convertedCount}
      />

      {/* Leads Directory Panel */}
      <div className="glass-card rounded-2xl flex flex-col shadow-lg border border-border/30 overflow-hidden">
        
        {/* Filter bar */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/20">
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
            <Input
              id="leads-search-input"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search leads by name, email, company…"
              className="pl-9 h-9 text-sm"
              aria-label="Search leads directory"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              id="leads-status-filter"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="h-9 rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              aria-label="Filter by Lead Stage"
            >
              <option value="">All Pipeline Stages</option>
              <option value="new">New Opportunity</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="nurturing">Nurturing</option>
              <option value="unqualified">Unqualified</option>
              <option value="converted">Converted (Won)</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <LeadsTable
          leads={leads}
          isLoading={isLoading}
          hasWriteAccess={hasWriteAccess}
          onEdit={handleEditClick}
          onConvert={setConfirmConvertId}
          onDelete={setConfirmDeleteId}
        />

        {/* Pagination controls */}
        {!isLoading && totalLeads > 10 && (
          <div className="p-4 border-t border-border/20 flex items-center justify-between bg-card/10">
            <span className="text-xs text-muted-foreground">
              Showing page {page} of {totalPages} ({totalLeads} total leads)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modals */}
      {/* 1. Convert Confirmation */}
      {confirmConvertId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl border border-border/40 p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-base font-bold text-foreground">Confirm Conversion</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2.5">
              Are you sure you want to mark this lead as qualified/converted? This records the conversion timestamp and locks status changes.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="outline" size="sm" onClick={() => setConfirmConvertId(null)}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => convertMutation.mutate(confirmConvertId)}
                disabled={convertMutation.isPending}
              >
                {convertMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Confirm Convert
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Soft Delete Confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl border border-border/40 p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-base font-bold text-red-400">Confirm Deletion</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2.5">
              Are you sure you want to delete this lead record? This performs a soft-delete and hides it from the pipeline directory.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => deleteMutation.mutate(confirmDeleteId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Delete Record
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sliding Form Modal */}
      <LeadModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedLead(undefined);
        }}
        lead={selectedLead}
      />
    </div>
  );
}
