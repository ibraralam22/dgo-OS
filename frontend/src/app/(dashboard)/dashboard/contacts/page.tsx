'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi, ContactListItem, ContactRole } from '@services/clients-api';
import { toast } from '@utils/toast';
import {
  Users,
  Building2,
  Crown,
  Search,
  MoreHorizontal,
  Edit2,
  Trash2,
  Loader2,
  Mail,
  Phone,
  Plus,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import ContactModal from '@components/clients/contact-modal';
import Link from 'next/link';

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modal control states
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactListItem | undefined>(undefined);

  // Row Action Dropdown state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

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
  const kpis = {
    totalCount: totalContacts,
    decisionMakers: contactsList.filter((c) => c.roleScope === 'DECISION_MAKER').length,
    billingPoints: contactsList.filter((c) => c.isPrimaryBilling).length,
  };

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
          <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Stakeholders</span>
            <span className="text-2xl font-extrabold text-foreground mt-0.5">{kpis.totalCount}</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Decision Makers</span>
            <span className="text-2xl font-extrabold text-foreground mt-0.5">{kpis.decisionMakers}</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300">
          <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
            <Crown className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Billing Contacts</span>
            <span className="text-2xl font-extrabold text-foreground mt-0.5">{kpis.billingPoints}</span>
          </div>
        </div>
      </div>

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
        <div className="overflow-x-auto min-h-[220px]">
          <table className="w-full text-left border-collapse min-w-[900px]" aria-label="Customer contacts directory table">
            <thead>
              <tr className="border-b border-border/10 bg-accent/10">
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Stakeholder Contact</th>
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Client Company</th>
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Title & Division</th>
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Influence Level</th>
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      Loading stakeholder directory...
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-red-400 font-semibold text-sm">
                    Failed to load contacts directory. Please reload or check connection.
                  </td>
                </tr>
              ) : displayedContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm font-medium">
                    No stakeholder contact records found.
                  </td>
                </tr>
              ) : (
                displayedContacts.map((contact) => (
                  <tr 
                    key={contact.id} 
                    className="border-b border-border/10 hover:bg-accent/5 transition-colors group"
                  >
                    {/* Contact Details */}
                    <td className="px-5 py-3.5 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {contact.firstName[0]}{contact.lastName[0]}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-foreground flex items-center gap-2">
                            {contact.firstName} {contact.lastName}
                            {contact.isPrimaryBilling && (
                              <span title="Primary Billing Contact">
                                <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-muted-foreground/60" />
                            {contact.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Company Redirection Link */}
                    <td className="px-5 py-3.5 text-xs font-bold">
                      {contact.account ? (
                        <Link 
                          href={`/dashboard/clients/${contact.account.id}`}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                          {contact.account.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground/40 font-normal">Independent</span>
                      )}
                    </td>

                    {/* Job Title / Division */}
                    <td className="px-5 py-3.5 text-xs font-semibold text-foreground/80">
                      <div className="flex flex-col">
                        <span>{contact.jobTitle || 'Stakeholder'}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">{contact.department || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Influence Badge */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider ${
                        contact.roleScope === 'DECISION_MAKER'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : contact.roleScope === 'INFLUENCER'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : contact.roleScope === 'GATEKEEPER'
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                          : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                      }`}>
                        {contact.roleScope.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        contact.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {contact.status}
                      </span>
                    </td>

                    {/* Row Actions */}
                    <td className="px-5 py-3.5 text-right relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === contact.id ? null : contact.id)}
                        className="h-8 w-8 inline-flex items-center justify-center hover:bg-accent/40 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {activeMenuId === contact.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveMenuId(null)}
                          />
                          <div className="absolute right-5 mt-1 w-40 bg-card border border-border rounded-lg shadow-xl py-1 z-20 animate-in fade-in slide-in-from-top-1 duration-150 text-left">
                            <button
                              onClick={() => {
                                setSelectedContact(contact);
                                setIsContactModalOpen(true);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-accent/40 flex items-center gap-2 cursor-pointer focus:outline-none"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              Modify Profile
                            </button>

                            {!contact.isPrimaryBilling && (
                              <button
                                onClick={() => {
                                  setPrimaryBillingMutation.mutate(contact.id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 flex items-center gap-2 cursor-pointer focus:outline-none border-t border-border/10"
                              >
                                <Crown className="h-3.5 w-3.5" />
                                Set Billing Point
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setConfirmDeleteId(contact.id);
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
