'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi, AccountListItem } from '@services/clients-api';
import { toast } from '@utils/toast';
import { 
  Building2, 
  Users, 
  CheckCircle, 
  Briefcase, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  ExternalLink,
  Loader2,
  Globe
} from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import ClientModal from '@components/clients/client-modal';
import ContactModal from '@components/clients/contact-modal';
import Link from 'next/link';

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal control states
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<AccountListItem | undefined>(undefined);

  // Row Action Dropdown state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Confirmation modal states
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // 1. Fetch B2B Accounts list
  const { data: accountsResponse, isLoading, isError } = useQuery({
    queryKey: ['accounts-list', page, search, statusFilter],
    queryFn: () => clientsApi.listAccounts({ page, limit: 10, search, status: statusFilter }),
  });

  // 2. Fetch all contacts for counting or general overview
  const { data: contactsResponse } = useQuery({
    queryKey: ['contacts-kpi-list'],
    queryFn: () => clientsApi.listContacts({ page: 1, limit: 1 }),
  });

  const accountsList = accountsResponse?.data ?? [];
  const totalAccounts = accountsResponse?.total ?? 0;
  const totalPages = Math.ceil(totalAccounts / 10);

  // Soft Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast.success('Client account soft-deleted');
      setConfirmDeleteId(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to delete client';
      toast.error(msg);
      setConfirmDeleteId(null);
    },
  });

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  // Derive simple KPI metrics for cards
  const kpis = {
    totalCount: totalAccounts,
    activeCount: accountsList.filter((a) => a.status === 'ACTIVE').length,
    onboardingCount: accountsList.filter((a) => a.status === 'ONBOARDING').length,
    contactsCount: contactsResponse?.total ?? 0,
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Clients & Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your B2B corporate client profiles, subsidiaries, and stakeholder contact matrices.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setIsContactModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
          <Button 
            size="sm" 
            onClick={() => {
              setSelectedClient(undefined);
              setIsClientModalOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Client
          </Button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
          <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Client Accounts</span>
            <span className="text-2xl font-extrabold text-foreground mt-0.5">{kpis.totalCount}</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active Deals</span>
            <span className="text-2xl font-extrabold text-foreground mt-0.5">{kpis.activeCount}</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
          <div className="h-10 w-10 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Onboarding</span>
            <span className="text-2xl font-extrabold text-foreground mt-0.5">{kpis.onboardingCount}</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
          <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
            <Users className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Stakeholders</span>
            <span className="text-2xl font-extrabold text-foreground mt-0.5">{kpis.contactsCount}</span>
          </div>
        </div>
      </div>

      {/* Accounts Directory Panel */}
      <div className="glass-card rounded-2xl flex flex-col shadow-lg border border-border/30 overflow-hidden">
        {/* Search and Filters */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
            <Input
              id="clients-search-input"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search clients by name, domain, industry…"
              className="pl-9 h-9 text-sm"
              aria-label="Search accounts directory"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              id="clients-status-filter"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="h-9 rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              aria-label="Filter by operational status"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active Engagement</option>
              <option value="ONBOARDING">Initial Onboarding</option>
              <option value="INACTIVE">Inactive / Suspended</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto min-h-[220px]">
          <table className="w-full text-left border-collapse min-w-[900px]" aria-label="Clients directory table">
            <thead>
              <tr className="border-b border-border/10 bg-accent/10">
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Client Company</th>
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Industry</th>
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Size</th>
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Parent Account</th>
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Contacts</th>
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      Loading clients directory...
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-red-400 font-semibold text-sm">
                    Failed to load B2B accounts. Please reload or check connection.
                  </td>
                </tr>
              ) : accountsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground text-sm font-medium">
                    No client profiles found matching search criteria.
                  </td>
                </tr>
              ) : (
                accountsList.map((account) => (
                  <tr 
                    key={account.id} 
                    className="border-b border-border/10 hover:bg-accent/5 transition-colors group"
                  >
                    {/* Client Name & Domain */}
                    <td className="px-5 py-3.5 text-sm">
                      <div className="flex flex-col gap-0.5">
                        <Link 
                          href={`/dashboard/clients/${account.id}`}
                          className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                        >
                          {account.name}
                        </Link>
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Globe className="h-3 w-3 text-muted-foreground/60" />
                          {account.domain}
                        </span>
                      </div>
                    </td>

                    {/* Industry */}
                    <td className="px-5 py-3.5 text-xs font-semibold text-muted-foreground">
                      {account.industry || 'General Outsourcing'}
                    </td>

                    {/* Size */}
                    <td className="px-5 py-3.5 text-xs font-semibold text-foreground/80">
                      {account.employeeCount ? `${account.employeeCount} Employees` : 'N/A'}
                    </td>

                    {/* Parent Account */}
                    <td className="px-5 py-3.5 text-xs font-semibold text-muted-foreground">
                      {account.parentAccount ? (
                        <Link 
                          href={`/dashboard/clients/${account.parentAccount.id}`}
                          className="text-primary hover:underline"
                        >
                          {account.parentAccount.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground/40 font-normal">Independent</span>
                      )}
                    </td>

                    {/* Contacts Count */}
                    <td className="px-5 py-3.5 text-xs font-semibold text-foreground/80">
                      {account._count?.contacts ?? 0} Stakeholders
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-1.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                        account.status === 'ACTIVE' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : account.status === 'ONBOARDING'
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {account.status}
                      </span>
                    </td>

                    {/* Actions Dropdown */}
                    <td className="px-5 py-3.5 text-right relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === account.id ? null : account.id)}
                        className="h-8 w-8 inline-flex items-center justify-center hover:bg-accent/40 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {activeMenuId === account.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveMenuId(null)}
                          />
                          <div className="absolute right-5 mt-1 w-36 bg-card border border-border rounded-lg shadow-xl py-1 z-20 animate-in fade-in slide-in-from-top-1 duration-150 text-left">
                            <Link
                              href={`/dashboard/clients/${account.id}`}
                              className="w-full px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-accent/40 flex items-center gap-2 cursor-pointer focus:outline-none"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              View Hub
                            </Link>

                            <button
                              onClick={() => {
                                setSelectedClient(account);
                                setIsClientModalOpen(true);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-accent/40 flex items-center gap-2 cursor-pointer focus:outline-none border-t border-border/10"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              Edit Profile
                            </button>

                            <button
                              onClick={() => {
                                setConfirmDeleteId(account.id);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer focus:outline-none border-t border-border/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete Profile
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {!isLoading && totalAccounts > 10 && (
          <div className="p-4 border-t border-border/20 flex items-center justify-between bg-card/10">
            <span className="text-xs text-muted-foreground">
              Showing page {page} of {totalPages} ({totalAccounts} total client profiles)
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
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl border border-border/40 p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-base font-bold text-foreground">Confirm Deletion</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Are you sure you want to delete this client profile? This performs a soft-delete and automatically hides all nested stakeholder contacts.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(confirmDeleteId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Client'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => {
          setIsClientModalOpen(false);
          setSelectedClient(undefined);
        }}
        client={selectedClient}
      />

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  );
}
