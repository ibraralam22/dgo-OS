'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi, LeadListItem } from '@services/leads-api';
import { toast } from '@utils/toast';
import { useAuthStore } from '@store/auth-store';
import { useDebounce } from '@hooks/use-debounce';
import {
  TrendingUp,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  Coins,
  Ticket,
  User,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { cn } from '@utils/cn';
import LeadModal from '@components/leads/lead-modal';

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
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
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
    setActiveMenuId(null);
  };

  const handleCreateClick = () => {
    setSelectedLead(undefined);
    setIsModalOpen(true);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'contacted':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'qualified':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'nurturing':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'unqualified':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'converted':
        return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
      default:
        return 'bg-muted/10 text-muted-foreground border border-muted/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'New Opportunity';
      case 'contacted': return 'Contacted';
      case 'qualified': return 'Qualified';
      case 'nurturing': return 'Nurturing';
      case 'unqualified': return 'Unqualified';
      case 'converted': return 'Converted (Won)';
      default: return status;
    }
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total leads count */}
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
          <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary shadow-inner">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Pipeline Leads</span>
            <span className="text-2xl font-extrabold text-foreground mt-0.5">{kpis.totalCount}</span>
          </div>
        </div>

        {/* Total budget value */}
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
          <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
            <Coins className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Est. Budget</span>
            <span className="text-2xl font-extrabold text-foreground mt-0.5">{kpis.budgetSum}</span>
          </div>
        </div>

        {/* Active qualified leads */}
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
          <div className="h-10 w-10 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
            <Ticket className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active Deals</span>
            <span className="text-2xl font-extrabold text-foreground mt-0.5">{kpis.activeCount}</span>
          </div>
        </div>

        {/* Conversions count */}
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Converts Won</span>
            <span className="text-2xl font-extrabold text-foreground mt-0.5">{kpis.convertedCount}</span>
          </div>
        </div>
      </div>

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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]" aria-label="Leads list directory">
            <thead>
              <tr className="border-b border-border/10 bg-accent/10">
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Company</th>
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Source</th>
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Stage</th>
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Score</th>
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Budget</th>
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Owner</th>
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      Loading pipeline leads directory...
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto p-4 border border-dashed border-border rounded-xl">
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold text-foreground text-sm">No leads found</span>
                      <span className="text-xs text-muted-foreground leading-relaxed">
                        There are no lead records matching the selection. Create a new lead to populate this pipeline directory.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={cn(
                      "border-b border-border/10 hover:bg-accent/20 transition-all duration-150",
                      lead.status === 'converted' && 'opacity-70 bg-emerald-500/[0.02]'
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">
                          {lead.firstName} {lead.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">{lead.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">{lead.companyName}</span>
                        {lead.website && (
                          <span className="text-[10px] text-primary hover:underline truncate max-w-[150px]">
                            {lead.website}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-muted-foreground capitalize">
                      {lead.source.replace('_', ' ')}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", getStatusBadgeClass(lead.status))}>
                        {getStatusLabel(lead.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-border/40 h-2 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              lead.score >= 70 ? 'bg-emerald-500' : lead.score >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                            )}
                            style={{ width: `${lead.score}%` }} 
                          />
                        </div>
                        <span className="text-[11px] font-bold text-foreground">{lead.score}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-foreground">
                      {lead.budget 
                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(lead.budget)) 
                        : '--'}
                    </td>
                    <td className="px-5 py-3.5">
                      {lead.owner ? (
                        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{lead.owner.firstName} {lead.owner.lastName}</span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-muted-foreground/60">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right relative">
                      {hasWriteAccess && (
                        <div className="inline-block">
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === lead.id ? null : lead.id)}
                            aria-label="Toggle actions menu"
                            className="h-8 w-8 rounded-lg hover:bg-accent/40 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {activeMenuId === lead.id && (
                            <div className="absolute right-5 mt-1.5 w-36 bg-card border border-border rounded-lg shadow-xl py-1 z-10 animate-in fade-in slide-in-from-top-1 duration-150">
                              <button
                                onClick={() => handleEditClick(lead)}
                                className="w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-accent flex items-center gap-2 cursor-pointer focus:outline-none"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Edit Lead
                              </button>
                              
                              {lead.status !== 'converted' && (
                                <button
                                  onClick={() => {
                                    setConfirmConvertId(lead.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 cursor-pointer focus:outline-none border-t border-border/10"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Convert Lead
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setConfirmDeleteId(lead.id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs font-semibold text-red-400 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer focus:outline-none border-t border-border/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete Lead
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
                Convert Won
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
