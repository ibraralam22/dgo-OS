'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi, ContactListItem } from '@services/clients-api';
import { toast } from '@utils/toast';
import {
  Search,
  Loader2,
  Plus,
} from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import ContactModal from '@components/clients/contact-modal';
import { ContactsKpis } from '@components/contacts/contacts-kpis';
import { ContactsTable } from '@components/contacts/contacts-table';

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modal control states
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactListItem | undefined>(undefined);

  // Confirmation modal state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // 1. Fetch paginated organization contacts
  const { data: contactsResponse, isLoading, isError } = useQuery({
    queryKey: ['contacts-directory-list', page, search, companyFilter],
    queryFn: () => clientsApi.listContacts({ 
      accountId: companyFilter || undefined,
      page, 
      limit: 10, 
      search 
    }),
  });

  // 2. Fetch all client accounts for company filtering dropdown
  const { data: accountsResponse } = useQuery({
    queryKey: ['accounts-selector-list'],
    queryFn: () => clientsApi.listAccounts({ page: 1, limit: 200 }),
  });

  const contactsList = contactsResponse?.data ?? [];
  const totalContacts = contactsResponse?.total ?? 0;
  const totalPages = Math.ceil(totalContacts / 10);
  const accountsList = accountsResponse?.data ?? [];

  // Filter list by role scope locally if role filter is active
  const displayedContacts = roleFilter 
    ? contactsList.filter(c => c.roleScope === roleFilter) 
    : contactsList;

  // Soft Delete Contact Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts-directory-list'] });
      queryClient.invalidateQueries({ queryKey: ['account-detail'] });
      toast.success('Contact profile soft-deleted');
      setConfirmDeleteId(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to delete contact';
      toast.error(msg);
      setConfirmDeleteId(null);
    },
  });

  // Set Primary Billing Mutation
  const setPrimaryBillingMutation = useMutation({
    mutationFn: (id: string) => clientsApi.setPrimaryContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts-directory-list'] });
      queryClient.invalidateQueries({ queryKey: ['account-detail'] });
      toast.success('Primary billing contact assigned');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to assign primary billing contact';
      toast.error(msg);
    },
  });

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleCompanyFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCompanyFilter(e.target.value);
    setPage(1);
  };

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
    setPage(1);
  };

  // Derive simple KPI metrics for cards
  const totalCount = totalContacts;
  const decisionMakers = contactsList.filter((c) => c.roleScope === 'DECISION_MAKER').length;
  const billingPoints = contactsList.filter((c) => c.isPrimaryBilling).length;

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Stakeholder Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete database of client decision makers, influencers, and billing points of contact.
          </p>
        </div>
        <Button 
          size="sm" 
          onClick={() => {
            setSelectedContact(undefined);
            setIsContactModalOpen(true);
          }}
          className="flex items-center gap-2 self-start"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* KPI Section */}
      <ContactsKpis
        totalCount={totalCount}
        decisionMakers={decisionMakers}
        billingPoints={billingPoints}
      />

      {/* Contacts Directory Panel */}
      <div className="glass-card rounded-2xl flex flex-col shadow-lg border border-border/30 overflow-hidden">
        {/* Search and Filters */}
        <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
            <Input
              id="contacts-search-input"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search stakeholders by name, email, title…"
              className="pl-9 h-9 text-sm"
              aria-label="Search contacts directory"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Filter by Client Company */}
            <select
              id="contacts-company-filter"
              value={companyFilter}
              onChange={handleCompanyFilterChange}
              className="h-9 rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer max-w-[200px]"
              aria-label="Filter by Client Company"
            >
              <option value="">All Companies</option>
              {accountsList.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>

            {/* Filter by Influence Level */}
            <select
              id="contacts-role-filter"
              value={roleFilter}
              onChange={handleRoleFilterChange}
              className="h-9 rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              aria-label="Filter by Influence Level"
            >
              <option value="">All Influence Levels</option>
              <option value="DECISION_MAKER">Decision Makers</option>
              <option value="INFLUENCER">Influencers</option>
              <option value="GATEKEEPER">Gatekeepers</option>
              <option value="USER">Standard Users</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <ContactsTable
          displayedContacts={displayedContacts}
          isLoading={isLoading}
          isError={isError}
          onEdit={(contact) => {
            setSelectedContact(contact);
            setIsContactModalOpen(true);
          }}
          onSetPrimaryBilling={(id) => setPrimaryBillingMutation.mutate(id)}
          onDelete={setConfirmDeleteId}
        />

        {/* Pagination controls */}
        {!isLoading && totalContacts > 10 && (
          <div className="p-4 border-t border-border/20 flex items-center justify-between bg-card/10">
            <span className="text-xs text-muted-foreground">
              Showing page {page} of {totalPages} ({totalContacts} total contacts)
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
            <h3 className="text-base font-bold text-foreground">Remove Stakeholder</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Are you sure you want to delete this contact profile? This is a soft-delete and will hide the contact from directory listings.
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
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Contact'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Form Drawer */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => {
          setIsContactModalOpen(false);
          setSelectedContact(undefined);
        }}
        contact={selectedContact}
      />
    </div>
  );
}
