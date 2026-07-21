import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi, TicketStatus, TicketPriority } from '@services/tickets-api';
import { toast } from '@utils/toast';
import { cn } from '@utils/cn';
import { STATUS_CONFIG, PRIORITY_CONFIG } from './constants';
import { Button } from '@components/ui/button';
import { X, CheckCircle2, Loader2, Send } from 'lucide-react';

interface ITicketThreadDrawerProps {
  ticketId: string;
  isClient: boolean;
  agents: any[];
  onClose: () => void;
}

export const TicketThreadDrawer: React.FC<ITicketThreadDrawerProps> = ({
  ticketId,
  isClient,
  agents,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const [commentText, setCommentText] = useState('');

  // Fetch ticket details
  const { data: ticket, isLoading, refetch } = useQuery({
    queryKey: ['ticket-detail', ticketId],
    queryFn: () => ticketsApi.get(ticketId),
  });

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

  const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG['OPEN'];
  const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG['MEDIUM'];

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
