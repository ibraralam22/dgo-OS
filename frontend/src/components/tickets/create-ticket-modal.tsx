import React, { useState } from 'react';
import { ticketsApi, TicketPriority, TicketCategory, CreateTicketInput } from '@services/tickets-api';
import { toast } from '@utils/toast';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { CATEGORY_LABELS, PRIORITY_CONFIG } from './constants';
import { X, LifeBuoy, Loader2 } from 'lucide-react';

interface ICreateTicketModalProps {
  isClient: boolean;
  accounts: any[];
  onClose: () => void;
  onCreated: () => void;
}

export const CreateTicketModal: React.FC<ICreateTicketModalProps> = ({
  isClient,
  accounts,
  onClose,
  onCreated,
}) => {
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
