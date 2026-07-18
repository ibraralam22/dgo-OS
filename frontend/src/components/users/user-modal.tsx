'use client';

import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { usersApi, UserListItem, CreateUserPayload } from '../../services/users-api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from '../../utils/toast';

type ModalMode = 'create' | 'edit' | 'role';

interface UserModalProps {
  mode: ModalMode;
  user?: UserListItem;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLES = ['TenantAdmin', 'SalesRepresentative', 'ClientContact'];

export default function UserModal({ mode, user, onClose, onSuccess }: UserModalProps) {
  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const isRole = mode === 'role';

  // Form state
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [roleName, setRoleName] = useState(user?.role.name ?? ROLES[0]);

  // Lock scroll when modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload),
    onSuccess: () => {
      toast.success('User created successfully.');
      onSuccess();
    },
  });

  // Edit profile mutation
  const editMutation = useMutation({
    mutationFn: (payload: Record<string, string>) => usersApi.update(user!.id, payload),
    onSuccess: () => {
      toast.success('Profile updated successfully.');
      onSuccess();
    },
  });

  // Change role mutation
  const roleMutation = useMutation({
    mutationFn: (role: string) => usersApi.updateRole(user!.id, role),
    onSuccess: () => {
      toast.success('Role updated successfully.');
      onSuccess();
    },
  });

  const isLoading = createMutation.isPending || editMutation.isPending || roleMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isCreate) {
      if (!email || !firstName || !lastName || !password || !roleName) {
        toast.error('Please fill all required fields.');
        return;
      }
      createMutation.mutate({ email, firstName, lastName, phone: phone || undefined, password, roleName });
    } else if (isEdit) {
      const payload: Record<string, string> = {};
      if (firstName && firstName !== user?.firstName) payload.firstName = firstName;
      if (lastName && lastName !== user?.lastName) payload.lastName = lastName;
      if (phone !== (user?.phone ?? '')) payload.phone = phone;
      if (Object.keys(payload).length === 0) { onClose(); return; }
      editMutation.mutate(payload);
    } else if (isRole) {
      roleMutation.mutate(roleName);
    }
  };

  const title = isCreate ? 'Add New User' : isEdit ? 'Edit User Profile' : 'Change User Role';
  const description = isCreate
    ? 'Create a new user account and assign them to this organization.'
    : isEdit
    ? `Update profile information for ${user?.firstName} ${user?.lastName}.`
    : `Assign a new role to ${user?.firstName} ${user?.lastName} within this organization.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card rounded-2xl border border-border/60 shadow-2xl w-full max-w-md flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/30">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-extrabold text-foreground tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <button
            id="close-user-modal"
            onClick={onClose}
            disabled={isLoading}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form id="user-modal-form" onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          {/* Role-only mode */}
          {isRole && (
            <div className="flex flex-col gap-1.5">
              <Label className="pl-1 text-xs">New Role</Label>
              <select
                id="modal-role-select"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                disabled={isLoading}
                className="h-9 w-full rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <p className="text-[11px] text-muted-foreground pl-1">
                Current role: <span className="font-semibold text-foreground">{user?.role.name}</span>
              </p>
            </div>
          )}

          {/* Create / Edit fields */}
          {(isCreate || isEdit) && (
            <>
              {isCreate && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="modal-email" className="pl-1 text-xs">Email Address *</Label>
                  <Input
                    id="modal-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@company.com"
                    required
                    disabled={isLoading}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="modal-firstname" className="pl-1 text-xs">First Name *</Label>
                  <Input
                    id="modal-firstname"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    required={isCreate}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="modal-lastname" className="pl-1 text-xs">Last Name *</Label>
                  <Input
                    id="modal-lastname"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required={isCreate}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="modal-phone" className="pl-1 text-xs">Phone <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  id="modal-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 010 0100"
                  disabled={isLoading}
                />
              </div>

              {isCreate && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="modal-role" className="pl-1 text-xs">Role *</Label>
                    <select
                      id="modal-role"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      disabled={isLoading}
                      className="h-9 w-full rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="modal-password" className="pl-1 text-xs">
                      Password * <span className="text-muted-foreground">(min 12 chars, mixed case, number, special)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="modal-password"
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Secure@Password2026!"
                        required
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPass ? 'Hide password' : 'Show password'}
                      >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-5 border-t border-border/30">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            id="user-modal-submit"
            variant="primary"
            size="sm"
            type="submit"
            form="user-modal-form"
            disabled={isLoading}
          >
            {isLoading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Saving…</>
            ) : (
              isCreate ? 'Create User' : isEdit ? 'Save Changes' : 'Update Role'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
