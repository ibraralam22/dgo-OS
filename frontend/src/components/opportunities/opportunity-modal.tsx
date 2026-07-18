import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { opportunitiesApi, OpportunityListItem } from '@services/opportunities-api';
import { clientsApi } from '@services/clients-api';
import { usersApi } from '@services/users-api';
import { toast } from '@utils/toast';
import { Loader2, X } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';

interface OpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity?: OpportunityListItem;
  defaultAccountId?: string;
}

export default function OpportunityModal({ isOpen, onClose, opportunity, defaultAccountId }: OpportunityModalProps) {
  const isEdit = !!opportunity;
  const queryClient = useQueryClient();

  // Form states
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [amount, setAmount] = useState('');
  const [closeDate, setCloseDate] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Fetch Accounts for dropdown
  const { data: accountsResponse, isLoading: loadingAccounts } = useQuery({
    queryKey: ['accounts-dropdown-list'],
    queryFn: () => clientsApi.listAccounts({ page: 1, limit: 100 }),
    enabled: isOpen,
  });

  // 2. Fetch Users for owner assignment
  const { data: usersResponse, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-dropdown-list'],
    queryFn: () => usersApi.list({ page: 1, limit: 100 }),
    enabled: isOpen,
  });

  const accountsList = accountsResponse?.data ?? [];
  const usersList = usersResponse?.data ?? [];

  // Reset/Load form state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (isEdit && opportunity) {
        setName(opportunity.name);
        setAccountId(opportunity.accountId);
        setOwnerId(opportunity.ownerId || '');
        setAmount(String(opportunity.amount));
        
        // Parse date for HTML date input: YYYY-MM-DD
        const parsedDate = opportunity.closeDate ? opportunity.closeDate.split('T')[0] : '';
        setCloseDate(parsedDate);
        setDescription(opportunity.description || '');
      } else {
        setName('');
        setAccountId(defaultAccountId || '');
        setOwnerId('');
        setAmount('');
        setCloseDate('');
        setDescription('');
      }
      setErrors({});
    }
  }, [isOpen, isEdit, opportunity, defaultAccountId]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => opportunitiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast.success('Deal created successfully');
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to create deal';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: any }) => opportunitiesApi.update(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities-list'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-detail', opportunity?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast.success('Deal details updated successfully');
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update deal';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Deal title is required';
    if (!accountId) newErrors.accountId = 'Target client account is required';

    if (!amount.trim()) {
      newErrors.amount = 'Deal amount/budget is required';
    } else if (isNaN(Number(amount))) {
      newErrors.amount = 'Amount must be a numeric value';
    } else if (Number(amount) < 0) {
      newErrors.amount = 'Amount cannot be negative';
    }

    if (!closeDate) {
      newErrors.closeDate = 'Target close date is required';
    } else {
      const selectedDate = new Date(closeDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today && !isEdit) {
        newErrors.closeDate = 'Close date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      name,
      accountId,
      ownerId: ownerId || undefined,
      amount: Number(amount),
      closeDate: new Date(closeDate).toISOString(),
      description: description.trim() || undefined,
    };

    if (isEdit && opportunity) {
      updateMutation.mutate({ id: opportunity.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!isOpen) return null;

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="opportunity-modal-title"
    >
      <div className="w-full max-w-lg bg-card/95 border-l border-border/40 text-foreground flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/20">
          <h2 id="opportunity-modal-title" className="text-lg font-bold tracking-tight flex items-center gap-2">
            {isEdit ? 'Modify Deal Parameters' : 'Initiate New CRM Deal'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close deal drawer"
            className="h-8 w-8 rounded-lg hover:bg-accent/40 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          {/* Deal Title */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="opp-name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
              Deal Name / Title *
            </label>
            <Input
              id="opp-name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder="e.g. ACME - 10 Java Devs Squad"
              className={errors.name ? 'border-red-500 focus:ring-red-500/50' : ''}
              aria-invalid={!!errors.name}
            />
            {errors.name && <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.name}</span>}
          </div>

          {/* Account Selection */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="opp-account" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
              Target B2B Account *
            </label>
            <select
              id="opp-account"
              value={accountId}
              disabled={isEdit} // Disallow changing account in edit mode for safety
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAccountId(e.target.value)}
              className={`h-9 w-full rounded-lg border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer ${
                errors.accountId ? 'border-red-500' : 'border-border'
              }`}
            >
              <option value="">-- Choose target client account --</option>
              {accountsList.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.domain})
                </option>
              ))}
            </select>
            {errors.accountId && <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.accountId}</span>}
          </div>

          {/* Amount / Value */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="opp-amount" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
              Deal Amount / Budget (USD) *
            </label>
            <Input
              id="opp-amount"
              type="text"
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
              placeholder="e.g. 120000"
              className={errors.amount ? 'border-red-500 focus:ring-red-500/50' : ''}
              aria-invalid={!!errors.amount}
            />
            {errors.amount && <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.amount}</span>}
            <span className="text-[10px] text-muted-foreground pl-0.5">
              Note: Deals exceeding $10,000,000 will require administrative approval before closing.
            </span>
          </div>

          {/* Close Date */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="opp-close-date" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
              Estimated Close Date *
            </label>
            <Input
              id="opp-close-date"
              type="date"
              value={closeDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCloseDate(e.target.value)}
              className={errors.closeDate ? 'border-red-500 focus:ring-red-500/50' : ''}
              aria-invalid={!!errors.closeDate}
            />
            {errors.closeDate && <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.closeDate}</span>}
          </div>

          {/* Owner Assignment */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="opp-owner" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
              Assigned Sales Rep / Owner
            </label>
            <select
              id="opp-owner"
              value={ownerId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setOwnerId(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="">-- Assign deal owner (Optional) --</option>
              {usersList.map((usr) => (
                <option key={usr.id} value={usr.id}>
                  {usr.firstName} {usr.lastName} ({usr.email})
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="opp-desc" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
              Deal Description / Brief Summary
            </label>
            <textarea
              id="opp-desc"
              rows={4}
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Provide context about squad composition, technology stack, target start dates, etc."
              className="w-full rounded-lg border border-border bg-card text-sm text-foreground p-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border/20 flex items-center justify-end gap-3 bg-accent/10">
          <Button variant="ghost" onClick={onClose} disabled={isSaving} size="sm">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving} size="sm" className="gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Save Updates' : 'Create Deal'}
          </Button>
        </div>
      </div>
    </div>
  );
}
