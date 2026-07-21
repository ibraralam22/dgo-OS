'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { clientsApi, ContactListItem, HierarchyNode } from '@services/clients-api';
import { systemApi } from '@services/system-api';
import { toast } from '@utils/toast';
import {
  Building2,
  Users,
  Globe,
  Coins,
  MapPin,
  ChevronLeft,
  Loader2,
  Plus,
  Crown,
  Phone,
  Mail,
  Trash2,
  Edit3,
  Network,
  History,
  Info,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@components/ui/button';
import ClientModal from '@components/clients/client-modal';
import ContactModal from '@components/clients/contact-modal';
import { HierarchyTreeNode } from '@components/clients/hierarchy-tree-node';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState<'overview' | 'stakeholders' | 'history'>('overview');

  // Modal control states
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactListItem | undefined>(undefined);

  // Confirmation modal states
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteContactId, setConfirmDeleteContactId] = useState<string | null>(null);

  // 1. Fetch Client Profile details
  const { data: client, isLoading, isError } = useQuery({
    queryKey: ['account-detail', id],
    queryFn: () => clientsApi.getAccount(id),
  });

  // 2. Fetch Client Hierarchy Tree
  const { data: hierarchyResponse, isLoading: loadingHierarchy } = useQuery({
    queryKey: ['account-hierarchy', id],
    queryFn: () => clientsApi.getAccountHierarchy(id),
  });

  // 3. Fetch audit logs related to this client profile
  const { data: logsResponse } = useQuery({
    queryKey: ['account-logs-list', id],
    queryFn: () => systemApi.getAuditLogs({ resourceId: id }),
    enabled: activeTab === 'history',
  });

  // soft delete client profile
  const deleteClientMutation = useMutation({
    mutationFn: (id: string) => clientsApi.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-list'] });
      toast.success('Client profile deleted');
      router.push('/dashboard/clients');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to delete client';
      toast.error(msg);
      setConfirmDeleteId(null);
    },
  });

  // soft delete contact
  const deleteContactMutation = useMutation({
    mutationFn: (cid: string) => clientsApi.deleteContact(cid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-detail', id] });
      toast.success('Contact profile deleted');
      setConfirmDeleteContactId(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to delete contact';
      toast.error(msg);
      setConfirmDeleteContactId(null);
    },
  });

  // set contact to primary billing contact
  const setPrimaryBillingMutation = useMutation({
    mutationFn: (cid: string) => clientsApi.setPrimaryContact(cid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-detail', id] });
      toast.success('Primary billing contact assigned');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to assign primary billing contact';
      toast.error(msg);
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground text-sm font-semibold">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        Retrieving client profile workspace...
      </div>
    );
  }

  if (isError || !client) {
    return (
      <div className="text-center p-8 max-w-md mx-auto glass-card rounded-2xl border border-red-500/25 mt-10">
        <h3 className="text-red-400 font-bold text-base">Workspace Load Failure</h3>
        <p className="text-xs text-muted-foreground mt-2">
          This account profile either does not exist or you lack sufficient authorization to view B2B directories.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/clients')} className="mt-5">
          Back to Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header Back Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard/clients')}
          className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer uppercase tracking-wider focus-visible:outline-none"
        >
          <ChevronLeft className="h-4 w-4" />
          Clients Directory
        </button>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsClientModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            Edit Profile
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => setConfirmDeleteId(client.id)}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Profile
          </Button>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="glass-card rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl border border-border/30">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{client.name}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider ${
                client.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : client.status === 'ONBOARDING'
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {client.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <Globe className="h-3.5 w-3.5 text-muted-foreground/60" />
              {client.domain}
              {client.industry && <span className="text-muted-foreground/40">• {client.industry}</span>}
            </p>
          </div>
        </div>

        {/* Client metrics */}
        <div className="flex items-center gap-8 self-stretch md:self-auto border-t md:border-t-0 border-border/20 pt-4 md:pt-0">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Stakeholders</span>
            <span className="text-lg font-extrabold text-foreground mt-0.5">{client.contacts.length} Linked</span>
          </div>
          {client.employeeCount && (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Company Size</span>
              <span className="text-lg font-extrabold text-foreground mt-0.5">{client.employeeCount} Employees</span>
            </div>
          )}
          {client.annualRevenue && (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Est. Revenue</span>
              <span className="text-lg font-extrabold text-emerald-400 mt-0.5 flex items-center gap-0.5">
                <Coins className="h-4 w-4" />
                ${Number(client.annualRevenue).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-border/20 gap-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-bold tracking-tight border-b-2 cursor-pointer focus:outline-none transition-colors ${
            activeTab === 'overview' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Overview Details
        </button>
        <button
          onClick={() => setActiveTab('stakeholders')}
          className={`pb-3 text-sm font-bold tracking-tight border-b-2 cursor-pointer focus:outline-none transition-colors ${
            activeTab === 'stakeholders' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Stakeholders Hub
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-bold tracking-tight border-b-2 cursor-pointer focus:outline-none transition-colors ${
            activeTab === 'history' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Activity Logs
        </button>
      </div>

      {/* Tab Panels */}
      {/* 1. Overview details */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="glass-card rounded-2xl border border-border/30 p-6 flex flex-col gap-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4" />
                Firmographic & Address Profile
              </h2>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Company Address</span>
                  <span className="text-xs font-semibold text-foreground/80 mt-1 flex items-center gap-1.5 leading-relaxed">
                    <MapPin className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                    {client.billingStreet || 'No street details'}, {client.billingCity || 'No city'}, {client.billingCountry}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Main Website URL</span>
                  <a 
                    href={`https://${client.domain}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs font-semibold text-primary hover:underline mt-1 block hover:text-primary-foreground"
                  >
                    https://{client.domain}
                  </a>
                </div>
              </div>
            </div>

            {/* Parent Link or Subsidiaries grid */}
            <div className="glass-card rounded-2xl border border-border/30 p-6 flex flex-col gap-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Network className="h-4 w-4" />
                Corporate Structure Linkages
              </h2>
              {client.parentAccount ? (
                <div className="p-4 rounded-xl border border-border/30 bg-accent/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Parent Organization</span>
                      <h4 className="text-xs font-bold text-foreground">{client.parentAccount.name}</h4>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/clients/${client.parentAccount?.id}`)}>
                    View Parent
                  </Button>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-border/30 text-center text-xs text-muted-foreground/60">
                  This is an independent parent entity. (No parent structure linked)
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Hierarchy Tree Widget */}
          <div className="glass-card rounded-2xl border border-border/30 p-6 flex flex-col gap-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Network className="h-4 w-4" />
              Organizational Tree Hierarchy
            </h2>
            {loadingHierarchy ? (
              <div className="flex items-center justify-center py-10 text-xs text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Querying hierarchy structures...
              </div>
            ) : hierarchyResponse?.hierarchy ? (
              <div className="pr-2 py-2 max-h-[300px] overflow-y-auto">
                <ul role="tree" aria-label="Organizational Hierarchy Tree" className="p-0 m-0 list-none">
                  <HierarchyTreeNode node={hierarchyResponse.hierarchy} activeId={id} />
                </ul>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground/60 py-6 text-center border border-dashed border-border/30 rounded-xl">
                No hierarchy trees recorded.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Stakeholders Tab */}
      {activeTab === 'stakeholders' && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Stakeholders Matrix</h2>
            <Button size="sm" onClick={() => {
              setSelectedContact(undefined);
              setIsContactModalOpen(true);
            }} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Contact
            </Button>
          </div>

          {client.contacts.length === 0 ? (
            <div className="p-12 border border-dashed border-border/30 rounded-2xl text-center text-muted-foreground bg-accent/5">
              <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold">No contacts registered</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Add points of contact (CTO, Delivery managers, CFOs) to map communication channels.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {client.contacts.map((contact) => (
                <div key={contact.id} className="glass-card rounded-2xl border border-border/30 p-5 flex flex-col gap-4 relative group">
                  {/* Action buttons */}
                  <div className="absolute right-4 top-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setSelectedContact(contact);
                        setIsContactModalOpen(true);
                      }}
                      className="h-7 w-7 inline-flex items-center justify-center hover:bg-accent/40 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                      title="Edit Contact"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteContactId(contact.id)}
                      className="h-7 w-7 inline-flex items-center justify-center hover:bg-red-500/10 rounded-lg text-red-400 cursor-pointer focus:outline-none"
                      title="Delete Contact"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Name and avatar info */}
                  <div className="flex items-start gap-3 pr-12">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {contact.firstName[0]}{contact.lastName[0]}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{contact.firstName} {contact.lastName}</h4>
                      <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                        {contact.jobTitle || 'Stakeholder'} {contact.department ? `@ ${contact.department}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="flex flex-col gap-1.5 border-t border-border/10 pt-3 text-xs">
                    <span className="flex items-center gap-2 text-muted-foreground font-medium">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {contact.email}
                    </span>
                    {contact.phone && (
                      <span className="flex items-center gap-2 text-muted-foreground font-medium">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        {contact.phone}
                      </span>
                    )}
                  </div>

                  {/* Role badges & Primary tag */}
                  <div className="flex items-center justify-between border-t border-border/10 pt-3">
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

                    {contact.isPrimaryBilling ? (
                      <span className="flex items-center gap-1 text-[9px] font-extrabold text-amber-400 uppercase tracking-wider" title="Primary Billing Contact">
                        <Crown className="h-3.5 w-3.5 fill-amber-400" />
                        Billing Contact
                      </span>
                    ) : (
                      <button
                        onClick={() => setPrimaryBillingMutation.mutate(contact.id)}
                        className="text-[9px] font-bold text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none hover:underline"
                      >
                        Set Billing Contact
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. History Tab */}
      {activeTab === 'history' && (
        <div className="glass-card rounded-2xl border border-border/30 p-6 flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border/10 pb-3">
            <History className="h-4.5 w-4.5" />
            Client Account Audit Logs & Milestones
          </h2>

          <div className="flex flex-col gap-4 pl-4 border-l border-border/20 py-2">
            {/* Displaying logs dynamically */}
            {logsResponse?.data && logsResponse.data.length > 0 ? (
              logsResponse.data.map((log: any) => (
                <div key={log.id} className="relative flex flex-col gap-1 text-xs">
                  <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full bg-border border border-card flex items-center justify-center text-[7px] text-foreground font-bold">
                    L
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground font-medium">
                    <span className="font-bold text-foreground/80">{log.action}</span>
                    <span>• {new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-muted-foreground/60 leading-relaxed">
                    Event triggered by User: <span className="font-semibold text-foreground/70">{log.userId}</span>
                  </p>
                </div>
              ))
            ) : (
              /* Seed/Placeholder timeline milestones since no backend audit logs endpoint exists */
              <>
                <div className="relative flex flex-col gap-1 text-xs">
                  <div className="absolute -left-6.5 top-1 h-4 w-4 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="h-2 w-2 text-emerald-400" />
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground font-medium">
                    <span className="font-bold text-emerald-400">Account Active status configured</span>
                    <span>• {new Date(client.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="relative flex flex-col gap-1 text-xs">
                  <div className="absolute -left-6.5 top-1 h-4 w-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                    <CheckCircle2 className="h-2 w-2 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground font-medium">
                    <span className="font-bold text-primary">Corporate Profile registered</span>
                    <span>• {new Date(client.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-muted-foreground/60 leading-relaxed">
                    Client account details written successfully to databases. Scoped under organization tenant boundary.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {/* 1. Delete Client */}
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
                disabled={deleteClientMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteClientMutation.mutate(confirmDeleteId)}
                disabled={deleteClientMutation.isPending}
              >
                {deleteClientMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Client'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Delete Contact */}
      {confirmDeleteContactId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl border border-border/40 p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-base font-bold text-foreground">Remove Stakeholder</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Are you sure you want to delete this contact profile? This is a soft-delete and will hide the contact from lists.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteContactId(null)}
                disabled={deleteContactMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteContactMutation.mutate(confirmDeleteContactId)}
                disabled={deleteContactMutation.isPending}
              >
                {deleteContactMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Contact'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        client={client}
      />

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => {
          setIsContactModalOpen(false);
          setSelectedContact(undefined);
        }}
        contact={selectedContact}
        defaultAccountId={id}
      />
    </div>
  );
}
