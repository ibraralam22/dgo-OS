'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsApi, TicketListItem, TicketStatus, TicketPriority, TicketCategory } from '@services/tickets-api';
import { clientsApi } from '@services/clients-api';
import { usersApi } from '@services/users-api';
import { useAuthStore } from '@store/auth-store';
import { useDebounce } from '@hooks/use-debounce';
import { toast } from '@utils/toast';
import { cn } from '@utils/cn';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import {
  HelpCircle,
  Plus,
  Search,
  Loader2,
  Clock,
  CheckCircle2,
  MessageSquare,
  Activity,
  ArrowRight,
  LifeBuoy,
  User,
} from 'lucide-react';

import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_LABELS } from '@components/tickets/constants';
import { CreateTicketModal } from '@components/tickets/create-ticket-modal';
import { TicketThreadDrawer } from '@components/tickets/ticket-thread-drawer';

export default function TicketsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 300);

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const hasWrite = user?.permissions?.includes('tickets:write') ?? false;
  const isClient = user?.role === 'ClientContact';

  // Queries
  const { data: summary } = useQuery({
    queryKey: ['tickets-summary'],
    queryFn: () => ticketsApi.summary(),
    staleTime: 30_000,
  });

  const { data: ticketsResponse, isLoading } = useQuery({
    queryKey: ['tickets-list', page, debouncedSearch, filterStatus, filterPriority, filterCategory],
    queryFn: () =>
      ticketsApi.list({
        page,
        limit: 15,
        search: debouncedSearch || undefined,
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        category: filterCategory || undefined,
      }),
  });

  const { data: accountsResponse } = useQuery({
    queryKey: ['accounts-dropdown-list'],
    queryFn: () => clientsApi.listAccounts({ page: 1, limit: 100 }),
    enabled: !isClient,
  });

  const { data: agentsResponse } = useQuery({
    queryKey: ['agents-dropdown-list'],
    queryFn: () => usersApi.list({ page: 1, limit: 100 }),
    enabled: !isClient,
  });

  const tickets = ticketsResponse?.data || [];
  const accounts = accountsResponse?.data || [];
  const agents = agentsResponse?.data || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tickets-list'] });
    queryClient.invalidateQueries({ queryKey: ['tickets-summary'] });
  };

  const handleCreated = () => {
    setIsCreating(false);
    invalidate();
    toast.success('Support ticket logged successfully');
  };

  return (
    <div className="flex flex-col gap-6 pb-12 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black tracking-tight text-foreground">Service Desk</h1>
          <p className="text-xs text-muted-foreground">Manage client support inquiries, assign tickets, and communicate through threaded conversation panels.</p>
        </div>
        {hasWrite && (
          <Button onClick={() => setIsCreating(true)} className="gap-2 shrink-0" size="sm">
            <Plus className="h-4 w-4" />
            Log Ticket
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Open Tickets', value: summary?.openTickets ?? 0, icon: <LifeBuoy className="h-6 w-6 text-primary/40" />, color: 'text-foreground' },
          { label: 'In Progress', value: summary?.inProgressTickets ?? 0, icon: <Clock className="h-6 w-6 text-amber-500/40" />, color: 'text-amber-400' },
          { label: 'Resolved Cases', value: summary?.resolvedTickets ?? 0, icon: <CheckCircle2 className="h-6 w-6 text-emerald-500/40" />, color: 'text-emerald-400' },
          { label: 'Closed/Archived', value: summary?.closedTickets ?? 0, icon: <Ban className="h-6 w-6 text-slate-500/40" />, color: 'text-slate-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card border border-border/25 rounded-2xl p-4 bg-card/30 flex items-center justify-between shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{kpi.label}</span>
              <span className={cn('text-2xl font-black mt-1', kpi.color)}>{kpi.value}</span>
            </div>
            {kpi.icon}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card border border-border/25 rounded-2xl p-4 bg-card/30 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets by subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer text-muted-foreground w-40"
          >
            <option value="">All Statuses</option>
            {Object.keys(STATUS_CONFIG).map((st) => (
              <option key={st} value={st}>{STATUS_CONFIG[st as TicketStatus].label}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer text-muted-foreground w-40"
          >
            <option value="">All Priorities</option>
            {Object.keys(PRIORITY_CONFIG).map((pr) => (
              <option key={pr} value={pr}>{PRIORITY_CONFIG[pr as TicketPriority].label}</option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer text-muted-foreground w-48"
          >
            <option value="">All Categories</option>
            {Object.keys(CATEGORY_LABELS).map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat as TicketCategory]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ticket List Table */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading support database...</span>
        </div>
      ) : tickets.length === 0 ? (
        <div className="h-48 border border-dashed border-border/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <HelpCircle className="h-8 w-8 opacity-30 animate-pulse" />
          <span className="text-xs">No support tickets matches filter criteria</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/20 bg-card/20 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/20 bg-muted/20 text-muted-foreground font-black uppercase tracking-wider select-none">
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10 font-medium">
              {tickets.map((t) => {
                const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG['OPEN'];
                const priorityCfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG['MEDIUM'];
                const categoryCfg = CATEGORY_LABELS[t.category] || t.category;

                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className="hover:bg-accent/10 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-extrabold text-foreground">{t.subject}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <User className="h-3 w-3" /> Logged by {t.createdBy.firstName} {t.createdBy.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-foreground">{t.account.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{t.account.domain}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground font-semibold">
                      {categoryCfg}
                    </td>
                    <td className="px-5 py-3.5">
                      {t.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black flex items-center justify-center">
                            {t.assignedTo.firstName[0]}{t.assignedTo.lastName[0]}
                          </div>
                          <span>{t.assignedTo.firstName} {t.assignedTo.lastName}</span>
                        </div>
                      ) : (
                        <span className="text-rose-400 font-semibold flex items-center gap-1">
                          <Activity className="h-3.5 w-3.5" /> Waiting Queue
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider', priorityCfg.color, priorityCfg.border, priorityCfg.bg)}>
                        {priorityCfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider', statusCfg.color, statusCfg.border, statusCfg.bg)}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedTicketId(t.id)}
                        className="text-muted-foreground hover:text-foreground hover:bg-accent p-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Ticket Conversation Drawer */}
      {selectedTicketId && (
        <TicketThreadDrawer
          ticketId={selectedTicketId}
          isClient={isClient}
          agents={agents}
          onClose={() => { setSelectedTicketId(null); invalidate(); }}
        />
      )}

      {/* Log Ticket Modal */}
      {isCreating && (
        <CreateTicketModal
          isClient={isClient}
          accounts={accounts}
          onClose={() => setIsCreating(false)}
          onCreated={handleCreated}
        />
      )}

    </div>
  );
}
const Ban = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);
