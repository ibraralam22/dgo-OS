import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi, AccountListItem, AccountStatus } from '@services/clients-api';
import { toast } from '@utils/toast';
import { Loader2, X } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: AccountListItem;
}

export default function ClientModal({ isOpen, onClose, client }: ClientModalProps) {
  const isEdit = !!client;
  const queryClient = useQueryClient();

  // Form states
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  const [annualRevenue, setAnnualRevenue] = useState('');
  const [billingStreet, setBillingStreet] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingCountry, setBillingCountry] = useState('');
  const [parentAccountId, setParentAccountId] = useState('');
  const [status, setStatus] = useState<AccountStatus>('ACTIVE');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch accounts list for parent account selection (excluding self if editing)
  const { data: accountsResponse } = useQuery({
    queryKey: ['accounts-selector-list'],
    queryFn: () => clientsApi.listAccounts({ page: 1, limit: 200 }),
    enabled: isOpen,
  });

  const availableParents = (accountsResponse?.data ?? []).filter(
    (acc) => !isEdit || acc.id !== client?.id
  );

  // Reset/Load form state on open
  useEffect(() => {
    if (isOpen) {
      if (isEdit && client) {
        setName(client.name);
        setDomain(client.domain);
        setIndustry(client.industry || '');
        setEmployeeCount(client.employeeCount ? String(client.employeeCount) : '');
        setAnnualRevenue(client.annualRevenue ? String(client.annualRevenue) : '');
        setBillingStreet(client.billingStreet || '');
        setBillingCity(client.billingCity || '');
        setBillingCountry(client.billingCountry);
        setParentAccountId(client.parentAccountId || '');
        setStatus(client.status);
      } else {
        setName('');
        setDomain('');
        setIndustry('');
        setEmployeeCount('');
        setAnnualRevenue('');
        setBillingStreet('');
        setBillingCity('');
        setBillingCountry('');
        setParentAccountId('');
        setStatus('ACTIVE');
      }
      setErrors({});
    }
  }, [isOpen, isEdit, client]);

  // Listen for Escape key press to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => clientsApi.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast.success('Client profile created successfully');
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to create client profile';
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: any }) =>
      clientsApi.updateAccount(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-list'] });
      queryClient.invalidateQueries({ queryKey: ['account-detail', client?.id] });
      queryClient.invalidateQueries({ queryKey: ['account-hierarchy', client?.id] });
      toast.success('Client profile updated successfully');
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to update client profile';
      toast.error(msg);
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Business name is required';
    if (!domain.trim()) {
      newErrors.domain = 'Domain is required';
    } else {
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(domain.trim())) {
        newErrors.domain = 'Invalid domain format (e.g. acme.com)';
      }
    }
    if (!billingCountry.trim()) newErrors.billingCountry = 'Billing country is required';

    if (employeeCount && isNaN(parseInt(employeeCount, 10))) {
      newErrors.employeeCount = 'Employee count must be a number';
    }
    if (annualRevenue && isNaN(parseFloat(annualRevenue))) {
      newErrors.annualRevenue = 'Annual revenue must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload: any = {
      name: name.trim(),
      domain: domain.trim().toLowerCase(),
      industry: industry.trim() || undefined,
      employeeCount: employeeCount ? parseInt(employeeCount, 10) : undefined,
      annualRevenue: annualRevenue ? parseFloat(annualRevenue) : undefined,
      billingStreet: billingStreet.trim() || undefined,
      billingCity: billingCity.trim() || undefined,
      billingCountry: billingCountry.trim(),
      parentAccountId: parentAccountId || undefined,
      status,
    };

    if (isEdit && client) {
      updateMutation.mutate({ id: client.id, payload });
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
      aria-labelledby="client-modal-title"
    >
      <div className="w-full max-w-lg bg-card/95 border-l border-border/40 text-foreground flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/20">
          <h2 id="client-modal-title" className="text-lg font-bold tracking-tight">
            {isEdit ? 'Modify Client Account' : 'Create Client Account'}
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
          {/* General Information */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="client-name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
              Business Name *
            </label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ACME Corporation"
              className={errors.name ? 'border-red-500 focus:ring-red-500/50' : ''}
              aria-invalid={!!errors.name}
            />
            {errors.name && <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.name}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="client-domain" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Primary Domain *
              </label>
              <Input
                id="client-domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. acme.com"
                className={errors.domain ? 'border-red-500 focus:ring-red-500/50' : ''}
                aria-invalid={!!errors.domain}
              />
              {errors.domain && <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.domain}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="client-industry" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Industry
              </label>
              <Input
                id="client-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Outsourcing"
              />
            </div>
          </div>

          {/* Firmographic Specs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="client-employees" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Employee Count
              </label>
              <Input
                id="client-employees"
                type="number"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
                placeholder="e.g. 500"
                className={errors.employeeCount ? 'border-red-500 focus:ring-red-500/50' : ''}
              />
              {errors.employeeCount && <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.employeeCount}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="client-revenue" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Annual Revenue ($)
              </label>
              <Input
                id="client-revenue"
                type="number"
                value={annualRevenue}
                onChange={(e) => setAnnualRevenue(e.target.value)}
                placeholder="e.g. 15000000"
                className={errors.annualRevenue ? 'border-red-500 focus:ring-red-500/50' : ''}
              />
              {errors.annualRevenue && <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.annualRevenue}</span>}
            </div>
          </div>

          {/* Hierarchy Mapping */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="client-parent" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
              Parent Account (Hierarchy)
            </label>
            <select
              id="client-parent"
              value={parentAccountId}
              onChange={(e) => setParentAccountId(e.target.value)}
              className="h-10 rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="">-- Independent Account (No Parent) --</option>
              {availableParents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name} ({parent.domain})
                </option>
              ))}
            </select>
          </div>

          {/* Address Details */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="client-street" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
              Billing Street Address
            </label>
            <Input
              id="client-street"
              value={billingStreet}
              onChange={(e) => setBillingStreet(e.target.value)}
              placeholder="e.g. 100 Corporate Parkway"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="client-city" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Billing City
              </label>
              <Input
                id="client-city"
                value={billingCity}
                onChange={(e) => setBillingCity(e.target.value)}
                placeholder="e.g. San Francisco"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="client-country" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Billing Country *
              </label>
              <Input
                id="client-country"
                value={billingCountry}
                onChange={(e) => setBillingCountry(e.target.value)}
                placeholder="e.g. United States"
                className={errors.billingCountry ? 'border-red-500 focus:ring-red-500/50' : ''}
              />
              {errors.billingCountry && <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.billingCountry}</span>}
            </div>
          </div>

          {/* Status Configuration */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="client-status" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
              Operational Status
            </label>
            <select
              id="client-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as AccountStatus)}
              className="h-10 rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="ACTIVE">Active Engagement</option>
              <option value="ONBOARDING">Initial Onboarding</option>
              <option value="INACTIVE">Inactive / Suspended</option>
            </select>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border/20 bg-accent/5 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="min-w-[100px]">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? 'Save Changes' : 'Create Client'}
          </Button>
        </div>
      </div>
    </div>
  );
}
