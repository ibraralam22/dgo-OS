import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi, LeadListItem } from '@services/leads-api';
import { usersApi } from '@services/users-api';
import { toast } from '@utils/toast';
import { Loader2, X } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: LeadListItem;
}

export default function LeadModal({ isOpen, onClose, lead }: LeadModalProps) {
  const isEdit = !!lead;
  const queryClient = useQueryClient();

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [source, setSource] = useState('website');
  const [status, setStatus] = useState('new');
  const [score, setScore] = useState(0);
  const [budget, setBudget] = useState('');
  const [ownerId, setOwnerId] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Fetch active organization users for owner assignment dropdown
  const { data: usersResponse, isLoading: loadingUsers } = useQuery({
    queryKey: ['org-users-list'],
    queryFn: () => usersApi.list({ page: 1, limit: 100 }),
    enabled: isOpen,
  });

  const usersList = usersResponse?.data ?? [];

  // Reset or load values on open
  useEffect(() => {
    if (isOpen) {
      if (isEdit && lead) {
        setFirstName(lead.firstName);
        setLastName(lead.lastName);
        setEmail(lead.email);
        setPhone(lead.phone || '');
        setCompanyName(lead.companyName);
        setWebsite(lead.website || '');
        setSource(lead.source);
        setStatus(lead.status);
        setScore(lead.score);
        setBudget(lead.budget ? String(lead.budget) : '');
        setOwnerId(lead.ownerId || '');
      } else {
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setCompanyName('');
        setWebsite('');
        setSource('website');
        setStatus('new');
        setScore(0);
        setBudget('');
        setOwnerId('');
      }
      setErrors({});
    }
  }, [isOpen, isEdit, lead]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => leadsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast.success('Lead created successfully');
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: any }) => leadsApi.update(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast.success('Lead updated successfully');
      onClose();
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!source.trim()) newErrors.source = 'Source is required';
    
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email address format';
    }

    if (score < 0 || score > 100) {
      newErrors.score = 'Score must be between 0 and 100';
    }

    if (budget && isNaN(Number(budget))) {
      newErrors.budget = 'Budget must be a number';
    } else if (budget && Number(budget) < 0) {
      newErrors.budget = 'Budget must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      firstName,
      lastName,
      email,
      phone: phone.trim() || undefined,
      companyName,
      website: website.trim() || undefined,
      source,
      status,
      score: Number(score),
      budget: budget ? Number(budget) : undefined,
      ownerId: ownerId || undefined,
    };

    if (isEdit && lead) {
      updateMutation.mutate({ id: lead.id, payload });
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
      aria-labelledby="lead-modal-title"
    >
      <div className="w-full max-w-lg bg-card/95 border-l border-border/40 text-foreground flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/20">
          <h2 id="lead-modal-title" className="text-lg font-bold tracking-tight flex items-center gap-2">
            {isEdit ? 'Modify CRM Lead' : 'Create New CRM Lead'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close form drawer"
            className="h-8 w-8 rounded-lg hover:bg-accent/40 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          
          {/* Contact Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="lead-first-name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                First Name *
              </label>
              <Input
                id="lead-first-name"
                value={firstName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                placeholder="e.g. John"
                className={errors.firstName ? 'border-red-500 focus:ring-red-500/50' : ''}
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && (
                <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.firstName}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="lead-last-name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Last Name *
              </label>
              <Input
                id="lead-last-name"
                value={lastName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                placeholder="e.g. Doe"
                className={errors.lastName ? 'border-red-500 focus:ring-red-500/50' : ''}
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && (
                <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.lastName}</span>
              )}
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="lead-email" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Email Address *
              </label>
              <Input
                id="lead-email"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="e.g. john@corp.com"
                className={errors.email ? 'border-red-500 focus:ring-red-500/50' : ''}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.email}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="lead-phone" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Phone Number
              </label>
              <Input
                id="lead-phone"
                value={phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                placeholder="e.g. +15550100"
              />
            </div>
          </div>

          {/* Company Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="lead-company" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Company Name *
              </label>
              <Input
                id="lead-company"
                value={companyName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Industries"
                className={errors.companyName ? 'border-red-500 focus:ring-red-500/50' : ''}
                aria-invalid={!!errors.companyName}
              />
              {errors.companyName && (
                <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.companyName}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="lead-website" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Website URL
              </label>
              <Input
                id="lead-website"
                value={website}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWebsite(e.target.value)}
                placeholder="e.g. acme.com"
              />
            </div>
          </div>

          {/* CRM details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="lead-source" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Acquisition Source *
              </label>
              <select
                id="lead-source"
                value={source}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSource(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              >
                <option value="website">Website Form</option>
                <option value="referral">Client Referral</option>
                <option value="cold_call">Cold Outreach</option>
                <option value="email">Email Campaign</option>
                <option value="ad">Paid Advertising</option>
                <option value="other">Other Source</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="lead-status" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Pipeline Stage *
              </label>
              <select
                id="lead-status"
                value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              >
                <option value="new">New Opportunity</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="nurturing">Nurturing</option>
                <option value="unqualified">Unqualified</option>
                <option value="converted">Converted (Won)</option>
              </select>
            </div>
          </div>

          {/* Budget & Score */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="lead-budget" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Estimated Budget ($)
              </label>
              <Input
                id="lead-budget"
                type="text"
                value={budget}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBudget(e.target.value)}
                placeholder="e.g. 5000.00"
                className={errors.budget ? 'border-red-500 focus:ring-red-500/50' : ''}
                aria-invalid={!!errors.budget}
              />
              {errors.budget && (
                <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.budget}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="lead-score" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Opportunity Score (0-100)
              </label>
              <Input
                id="lead-score"
                type="number"
                value={score}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScore(Number(e.target.value))}
                min={0}
                max={100}
                className={errors.score ? 'border-red-500 focus:ring-red-500/50' : ''}
                aria-invalid={!!errors.score}
              />
              {errors.score && (
                <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.score}</span>
              )}
            </div>
          </div>

          {/* Owner Assignment */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lead-owner" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
              Assigned Account Owner
            </label>
            <select
              id="lead-owner"
              value={ownerId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setOwnerId(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              disabled={loadingUsers}
            >
              <option value="">Unassigned (Queue)</option>
              {usersList.map((usr) => (
                <option key={usr.id} value={usr.id}>
                  {usr.firstName} {usr.lastName} ({usr.role.name})
                </option>
              ))}
            </select>
          </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/20 flex items-center justify-end gap-3 bg-card/50">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClose} 
            disabled={isSaving}
            type="button"
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleSubmit} 
            disabled={isSaving}
            type="submit"
          >
            {isSaving && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
            {isEdit ? 'Update Lead' : 'Create Lead'}
          </Button>
        </div>
      </div>
    </div>
  );
}
