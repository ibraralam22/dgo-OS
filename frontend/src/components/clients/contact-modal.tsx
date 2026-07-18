import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi, ContactListItem, ContactRole, ContactStatus } from '@services/clients-api';
import { toast } from '@utils/toast';
import { Loader2, X } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact?: ContactListItem;
  defaultAccountId?: string; // Pre-select account context if opened from Client detail page
}

export default function ContactModal({ isOpen, onClose, contact, defaultAccountId }: ContactModalProps) {
  const isEdit = !!contact;
  const queryClient = useQueryClient();

  // Form states
  const [accountId, setAccountId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [roleScope, setRoleScope] = useState<ContactRole>('USER');
  const [isPrimaryBilling, setIsPrimaryBilling] = useState(false);
  const [status, setStatus] = useState<ContactStatus>('ACTIVE');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch accounts list for client selection
  const { data: accountsResponse } = useQuery({
    queryKey: ['accounts-selector-list'],
    queryFn: () => clientsApi.listAccounts({ page: 1, limit: 200 }),
    enabled: isOpen,
  });

  const accounts = accountsResponse?.data ?? [];

  // Reset or load values
  useEffect(() => {
    if (isOpen) {
      if (isEdit && contact) {
        setAccountId(contact.accountId);
        setFirstName(contact.firstName);
        setLastName(contact.lastName);
        setEmail(contact.email);
        setPhone(contact.phone || '');
        setJobTitle(contact.jobTitle || '');
        setDepartment(contact.department || '');
        setRoleScope(contact.roleScope);
        setIsPrimaryBilling(contact.isPrimaryBilling);
        setStatus(contact.status);
      } else {
        setAccountId(defaultAccountId || '');
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setJobTitle('');
        setDepartment('');
        setRoleScope('USER');
        setIsPrimaryBilling(false);
        setStatus('ACTIVE');
      }
      setErrors({});
    }
  }, [isOpen, isEdit, contact, defaultAccountId]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => clientsApi.createContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts-list'] });
      queryClient.invalidateQueries({ queryKey: ['account-detail', accountId] });
      toast.success('Stakeholder contact registered successfully');
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to create contact';
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: any }) =>
      clientsApi.updateContact(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts-list'] });
      queryClient.invalidateQueries({ queryKey: ['account-detail', accountId] });
      queryClient.invalidateQueries({ queryKey: ['account-detail', contact?.accountId] });
      toast.success('Stakeholder contact updated successfully');
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to update contact';
      toast.error(msg);
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!accountId) newErrors.accountId = 'Client account is required';
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Invalid email address format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload: any = {
      accountId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      department: department.trim() || undefined,
      roleScope,
      isPrimaryBilling,
      status,
    };

    if (isEdit && contact) {
      updateMutation.mutate({ id: contact.id, payload });
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
      aria-labelledby="contact-modal-title"
    >
      <div className="w-full max-w-lg bg-card/95 border-l border-border/40 text-foreground flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/20">
          <h2 id="contact-modal-title" className="text-lg font-bold tracking-tight">
            {isEdit ? 'Modify Contact Profile' : 'Register Stakeholder Contact'}
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
          {/* Associated Client profile */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-account" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
              Client Account *
            </label>
            <select
              id="contact-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={!!defaultAccountId && !isEdit}
              className="h-10 rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer disabled:opacity-60"
            >
              <option value="">-- Select Client Profile --</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.domain})
                </option>
              ))}
            </select>
            {errors.accountId && <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.accountId}</span>}
          </div>

          {/* Stakeholder Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contact-first-name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                First Name *
              </label>
              <Input
                id="contact-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. John"
                className={errors.firstName ? 'border-red-500 focus:ring-red-500/50' : ''}
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.firstName}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="contact-last-name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Last Name *
              </label>
              <Input
                id="contact-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Doe"
                className={errors.lastName ? 'border-red-500 focus:ring-red-500/50' : ''}
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.lastName}</span>}
            </div>
          </div>

          {/* Stakeholder Contact Credentials */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contact-email" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Email Address *
              </label>
              <Input
                id="contact-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. john.doe@acme.com"
                className={errors.email ? 'border-red-500 focus:ring-red-500/50' : ''}
                aria-invalid={!!errors.email}
              />
              {errors.email && <span className="text-[11px] text-red-400 pl-0.5 mt-0.5">{errors.email}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="contact-phone" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Phone Number
              </label>
              <Input
                id="contact-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 555-0199"
              />
            </div>
          </div>

          {/* Job details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contact-title" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Job Title
              </label>
              <Input
                id="contact-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. VP of Tech"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="contact-dept" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Department
              </label>
              <Input
                id="contact-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Infrastructure"
              />
            </div>
          </div>

          {/* Influence Role Scope */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-role" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
              Influence / Authority Level
            </label>
            <select
              id="contact-role"
              value={roleScope}
              onChange={(e) => setRoleScope(e.target.value as ContactRole)}
              className="h-10 rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="DECISION_MAKER">Decision Maker (C-Suite / VP)</option>
              <option value="INFLUENCER">Influencer (Director / Team Lead)</option>
              <option value="GATEKEEPER">Gatekeeper (Finance / Admin)</option>
              <option value="USER">Standard User (Individual Contributor)</option>
            </select>
          </div>

          {/* Operational Status */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-status" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
              Stakeholder Status
            </label>
            <select
              id="contact-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ContactStatus)}
              className="h-10 rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="ACTIVE">Active Contact</option>
              <option value="INACTIVE">Inactive Contact</option>
            </select>
          </div>

          {/* Primary Billing Contact Tag */}
          <div className="flex items-center gap-3 mt-2 pl-0.5">
            <input
              id="contact-primary-billing"
              type="checkbox"
              checked={isPrimaryBilling}
              onChange={(e) => setIsPrimaryBilling(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50 bg-card cursor-pointer"
            />
            <label htmlFor="contact-primary-billing" className="text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer">
              Designate as Primary Billing Contact
            </label>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border/20 bg-accent/5 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="min-w-[100px]">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? 'Save Changes' : 'Register Contact'}
          </Button>
        </div>
      </div>
    </div>
  );
}
