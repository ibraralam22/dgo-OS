'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi, AccountListItem } from '@services/clients-api';
import { toast } from '@utils/toast';
import { 
  Plus, 
  Search, 
  Loader2,
} from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import ClientModal from '@components/clients/client-modal';
import ContactModal from '@components/clients/contact-modal';
import { ClientKpis } from '@components/clients/client-kpis';
import { ClientTable } from '@components/clients/client-table';

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal control states
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<AccountListItem | undefined>(undefined);

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
  const totalCount = totalAccounts;
  const activeCount = accountsList.filter((a) => a.status === 'ACTIVE').length;
  const onboardingCount = accountsList.filter((a) => a.status === 'ONBOARDING').length;
  const contactsCount = contactsResponse?.total ?? 0;

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
      <ClientKpis
        totalCount={totalCount}
        activeCount={activeCount}
        onboardingCount={onboardingCount}
        contactsCount={contactsCount}
      />

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
        <ClientTable
          accountsList={accountsList}
          isLoading={isLoading}
          isError={isError}
          onEdit={(account) => {
            setSelectedClient(account);
            setIsClientModalOpen(true);
          }}
          onDelete={setConfirmDeleteId}
        />

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
