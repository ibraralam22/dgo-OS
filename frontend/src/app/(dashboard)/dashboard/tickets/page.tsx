'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi, TicketListItem, Ticket, TicketStatus, TicketPriority, TicketCategory, CreateTicketInput } from '@services/tickets-api';
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
  X,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Ban,
  Calendar,
  MessageSquare,
  User,
  Activity,
  ArrowRight,
  LifeBuoy,
  FileText,
  UserCheck,
  Send,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; color: string; border: string; bg: string }
> = {
  OPEN:        { label: 'Open',        color: 'text-sky-400',    bg: 'bg-sky-500/5',    border: 'border-sky-500/20'    },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-400',  bg: 'bg-amber-500/5',  border: 'border-amber-500/20'  },
  RESOLVED:    { label: 'Resolved',    color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' },
  CLOSED:      { label: 'Closed',      color: 'text-slate-500',  bg: 'bg-slate-500/5',  border: 'border-slate-500/20'  },
};

const PRIORITY_CONFIG: Record<
  TicketPriority,
  { label: string; color: string; border: string; bg: string }
> = {
  LOW:    { label: 'Low',    color: 'text-slate-400', border: 'border-slate-500/10', bg: 'bg-slate-500/5'   },
  MEDIUM: { label: 'Medium', color: 'text-blue-400',  border: 'border-blue-500/20',  bg: 'bg-blue-500/5'    },
  HIGH:   { label: 'High',   color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5'   },
  URGENT: { label: 'Urgent', color: 'text-rose-400',  border: 'border-rose-500/20',  bg: 'bg-rose-500/5'    },
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  GENERAL:   'General Request',
  TECHNICAL: 'Technical Issue',
  BILLING:   'Billing / Invoice Support',
  ACCOUNT:   'Account / Access Request',
};

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
          { label: 'High Priority Unresolved', value: summary?.highPriorityUnresolved ?? 0, icon: <AlertTriangle className="h-6 w-6 text-rose-500/40" />, color: 'text-rose-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card border border-border/25 rounded-2xl p-4 bg-card/30 flex items-center justify-between shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{kpi.label}</span>
              <span className={cn('text-xl font-black mt-1', kpi.color)}>{kpi.value}</span>
            </div>
            {kpi.icon}
          </div>
        ))}
      </div>

      {/* Toolbar Filter */}
      <div className="glass-card border border-border/25 rounded-2xl p-4 bg-card/30 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search Ticket subject..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer text-muted-foreground w-36"
          >
            <option value="">All Statuses</option>
            {Object.keys(STATUS_CONFIG).map((st) => (
              <option key={st} value={st}>{STATUS_CONFIG[st as TicketStatus].label}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer text-muted-foreground w-36"
          >
            <option value="">All Priorities</option>
            {Object.keys(PRIORITY_CONFIG).map((pr) => (
              <option key={pr} value={pr}>{PRIORITY_CONFIG[pr as TicketPriority].label}</option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer text-muted-foreground w-44"
          >
            <option value="">All Categories</option>
            {Object.keys(CATEGORY_LABELS).map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat as TicketCategory]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tickets table */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading service desk registry...</span>
        </div>
      ) : tickets.length === 0 ? (
        <div className="h-48 border border-dashed border-border/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <HelpCircle className="h-8 w-8 opacity-30 animate-pulse" />
          <span className="text-xs">No support tickets logged</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/20 bg-card/20 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/20 bg-muted/20 text-muted-foreground font-black uppercase tracking-wider select-none">
                <th className="px-5 py-3">Ticket ID</th>
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Account</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Assigned Agent</th>
                <th className="px-5 py-3 text-right">Replies</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10 font-medium">
              {tickets.map((t) => {
                const statusCfg = STATUS_CONFIG[t.status];
                const priorityCfg = PRIORITY_CONFIG[t.priority];

                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className="hover:bg-accent/10 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-mono text-muted-foreground text-[10px]">
                      {t.id.slice(0, 8)}...
                    </td>
                    <td className="px-5 py-3.5 font-extrabold text-foreground">
                      {t.subject}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-foreground">
                      {t.account.name}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground font-semibold">
                      {CATEGORY_LABELS[t.category]}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider', priorityCfg.color, priorityCfg.border, priorityCfg.bg)}>
                        {priorityCfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider', statusCfg.color, statusCfg.border, statusCfg.bg)}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-foreground font-bold">
                      {t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-muted-foreground pr-8">
                      <span className="inline-flex items-center gap-1 bg-muted/30 border border-border/20 px-2 py-0.5 rounded-lg text-[10px]">
                        <MessageSquare className="h-3 w-3" />
                        {t._count.comments}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Ticket conversation thread Slide Drawer */}
      {selectedTicketId && (
        <TicketThreadDrawer
          ticketId={selectedTicketId}
          isClient={isClient}
          agents={agents}
          onClose={() => { setSelectedTicketId(null); invalidate(); }}
        />
      )}

      {/* Create Ticket Modal */}
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

// ─── Ticket Conversation thread Slide Drawer ─────────────────────────────────

function TicketThreadDrawer({
  ticketId,
  isClient,
  agents,
  onClose,
}: {
  ticketId: string;
  isClient: boolean;
  agents: any[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const [commentText, setCommentText] = useState('');

  // Fetch ticket details
  const { data: ticket, isLoading, refetch } = useQuery({
    queryKey: ['ticket-detail', ticketId],
    queryFn: () => ticketsApi.get(ticketId),
  });

  const queryParams = queryClient.getQueryState(['ticket-detail', ticketId]);

  const updateMutation = useMutation({
    mutationFn: (data: { status?: TicketStatus; priority?: TicketPriority; assignedToId?: string | null }) =>
      ticketsApi.update(ticketId, data),
    onSuccess: () => {
      refetch();
      toast.success('Ticket updated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Update failed'),
  });

  const commentMutation = useMutation({
    mutationFn: (comment: string) => ticketsApi.createComment(ticketId, comment),
    onSuccess: () => {
      setCommentText('');
      refetch();
      // Scroll to bottom
      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to send reply'),
  });

  useEffect(() => {
    if (ticket?.comments) {
      threadEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [ticket?.comments]);

  if (isLoading || !ticket) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-background/60 backdrop-blur-xs" onClick={onClose} />
        <div className="relative w-full max-w-2xl bg-background border-l border-border/25 shadow-2xl flex flex-col h-full z-10 glass-card p-8 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[ticket.status];
  const priorityCfg = PRIORITY_CONFIG[ticket.priority];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-xs cursor-pointer" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-background border-l border-border/25 shadow-2xl flex flex-col h-full z-10 glass-card animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/20 flex flex-col gap-2 shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className={cn('px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider', statusCfg.color, statusCfg.border, statusCfg.bg)}>
                  {statusCfg.label}
                </span>
                <span className={cn('px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider', priorityCfg.color, priorityCfg.border, priorityCfg.bg)}>
                  {priorityCfg.label}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">#{ticket.id.slice(0, 8)}</span>
              </div>
              <h3 className="text-base font-black text-foreground mt-0.5">{ticket.subject}</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 rounded-lg shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Conversation flow */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 bg-card/5">
          {/* Ticket original description box */}
          <div className="p-4 bg-muted/15 border border-border/20 rounded-2xl flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
              <span className="font-bold text-foreground">{ticket.createdBy.firstName} {ticket.createdBy.lastName} ({ticket.createdBy.email})</span>
              <span>{new Date(ticket.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap mt-1">{ticket.description}</p>
          </div>

          {/* Conversation replies bubbles */}
          <div className="flex flex-col gap-4 mt-2">
            {ticket.comments.map((comment) => {
              const isCurrentUser = comment.userId === ticket.createdById;

              return (
                <div key={comment.id} className={cn('flex flex-col max-w-[80%]', isCurrentUser ? 'self-start' : 'self-end')}>
                  <span className="text-[9px] text-muted-foreground mb-1 select-none font-bold">
                    {comment.user.firstName} {comment.user.lastName} ({new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </span>
                  <div className={cn('p-3 rounded-2xl text-xs leading-relaxed shadow-xs', isCurrentUser ? 'bg-muted/15 border border-border/20 text-foreground rounded-tl-none' : 'bg-primary/10 border border-primary/20 text-foreground rounded-tr-none')}>
                    {comment.comment}
                  </div>
                </div>
              );
            })}
            <div ref={threadEndRef} />
          </div>
        </div>

        {/* Control Desk Actions Panel (Visible for Internal Agents/Admins only) */}
        {!isClient && (
          <div className="px-6 py-3 border-t border-border/10 bg-muted/10 grid grid-cols-2 gap-3 shrink-0">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Assign Agent</label>
              <select
                value={ticket.assignedToId || ''}
                onChange={(e) => updateMutation.mutate({ assignedToId: e.target.value || null })}
                className="h-8 rounded-lg border border-border bg-card text-xs font-semibold px-2 focus:outline-none cursor-pointer"
              >
                <option value="">— Unassigned —</option>
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>{ag.firstName} {ag.lastName}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Stage Status</label>
              <select
                value={ticket.status}
                onChange={(e) => updateMutation.mutate({ status: e.target.value as TicketStatus })}
                className="h-8 rounded-lg border border-border bg-card text-xs font-semibold px-2 focus:outline-none cursor-pointer"
              >
                {Object.keys(STATUS_CONFIG).map((st) => (
                  <option key={st} value={st}>{STATUS_CONFIG[st as TicketStatus].label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Client Resolve controls */}
        {isClient && ['OPEN', 'IN_PROGRESS'].includes(ticket.status) && (
          <div className="px-6 py-2.5 border-t border-border/10 bg-muted/5 flex justify-end shrink-0">
            <Button
              onClick={() => updateMutation.mutate({ status: 'RESOLVED' })}
              variant="outline"
              size="sm"
              className="text-emerald-400 hover:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/10 gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark Case Resolved
            </Button>
          </div>
        )}

        {/* Reply Editor input */}
        {ticket.status !== 'CLOSED' && (
          <div className="px-6 py-4 border-t border-border/15 flex gap-2 items-end bg-background shrink-0">
            <textarea
              placeholder="Write a message reply to help client..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={2}
              className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
            />
            <Button
              onClick={() => {
                if (!commentText.trim()) return;
                commentMutation.mutate(commentText);
              }}
              className="h-9 w-9 p-0 shrink-0"
              disabled={commentMutation.isPending}
            >
              {commentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create Ticket Modal ─────────────────────────────────────────────────────

function CreateTicketModal({
  isClient,
  accounts,
  onClose,
  onCreated,
}: {
  isClient: boolean;
  accounts: any[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [accountId, setAccountId] = useState('');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [category, setCategory] = useState<TicketCategory>('GENERAL');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isClient && !accountId) {
      toast.error('Client account is required');
      return;
    }
    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    if (description.trim().length < 10) {
      toast.error('Please describe details (minimum 10 characters)');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateTicketInput = {
        accountId: isClient ? '00000000-0000-0000-0000-000000000000' : accountId, // resolves backend
        subject: subject.trim(),
        description: description.trim(),
        priority,
        category,
      };

      await ticketsApi.create(payload);
      onCreated();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to log ticket';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg glass-card bg-background border border-border/30 rounded-2xl shadow-2xl z-10 animate-in zoom-in-95 duration-150 p-6 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/20 pb-4 mb-4 shrink-0">
          <h3 className="text-sm font-black text-foreground">Log Support Request</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 rounded-lg">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Account select (internal users only) */}
          {!isClient && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Client Account *</label>
              <select
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer"
              >
                <option value="">— Select B2B Account —</option>
                {accounts.map((ac) => (
                  <option key={ac.id} value={ac.id}>{ac.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Subject / Summary *</label>
            <Input
              placeholder="What is the issue about?"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className="h-9 w-full rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer"
              >
                {Object.keys(CATEGORY_LABELS).map((cat) => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat as TicketCategory]}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="h-9 w-full rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer"
              >
                {Object.keys(PRIORITY_CONFIG).map((pr) => (
                  <option key={pr} value={pr}>{PRIORITY_CONFIG[pr as TicketPriority].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Details / Description *</label>
            <textarea
              placeholder="Please provide details of the request (minimum 10 characters)..."
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full mt-2 gap-2" size="sm">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LifeBuoy className="h-4 w-4" />}
            Log Ticket Draft
          </Button>
        </form>
      </div>
    </div>
  );
}
