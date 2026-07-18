import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi, PermissionItem } from '@services/roles-api';
import { toast } from '@utils/toast';
import { Loader2, X, Shield } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleId: string | null;
}

export default function RoleModal({ isOpen, onClose, roleId }: RoleModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!roleId;

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Fetch available permissions
  const { data: permData, isLoading: loadingPerms } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => rolesApi.getPermissions(),
    enabled: isOpen,
  });

  // 2. Fetch role details if editing
  const { data: roleData, isLoading: loadingRoleDetails } = useQuery({
    queryKey: ['role-details', roleId],
    queryFn: () => rolesApi.get(roleId!),
    enabled: isOpen && isEdit,
  });

  // Initialize form values on modal open / detail load
  useEffect(() => {
    if (isOpen) {
      if (isEdit && roleData?.data) {
        setName(roleData.data.name);
        setDescription(roleData.data.description || '');
        setSelectedPermissions(roleData.data.permissions);
      } else {
        setName('');
        setDescription('');
        setSelectedPermissions([]);
      }
      setErrors({});
    }
  }, [isOpen, isEdit, roleData]);

  // Group permissions by category
  const permissionsGrouped = useMemo(() => {
    if (!permData?.data) return {};
    const groups: Record<string, PermissionItem[]> = {};
    permData.data.forEach((p) => {
      const parts = p.code.split(':');
      const category = parts[0] || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(p);
    });
    return groups;
  }, [permData]);

  // Actions
  const togglePermission = (code: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleCategory = (category: string, codes: string[]) => {
    const allSelected = codes.every((c) => selectedPermissions.includes(c));
    if (allSelected) {
      // Remove all codes of this category
      setSelectedPermissions((prev) => prev.filter((c) => !codes.includes(c)));
    } else {
      // Add missing codes of this category
      setSelectedPermissions((prev) => {
        const added = codes.filter((c) => !prev.includes(c));
        return [...prev, ...added];
      });
    }
  };

  // Mutation
  const mutation = useMutation({
    mutationFn: (payload: { name: string; description?: string; permissionCodes: string[] }) => {
      if (isEdit) {
        return rolesApi.update(roleId!, payload);
      } else {
        return rolesApi.create(payload);
      }
    },
    onSuccess: (res) => {
      toast.success(isEdit ? 'Role updated successfully.' : 'Role created successfully.');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      onClose();
    },
    onError: () => {
      // apiClient response interceptor already handles main error toasts, so we do nothing here
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Role name is required.';
    }
    if (selectedPermissions.length === 0) {
      newErrors.permissions = 'Please select at least one permission.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    mutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      permissionCodes: selectedPermissions,
    });
  };

  if (!isOpen) return null;

  const isLoading = loadingPerms || (isEdit && loadingRoleDetails);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="glass-card rounded-2xl border border-border/60 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-modal-title"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Shield className="h-4.5 w-4.5 text-primary" />
            </div>
            <h2 id="role-modal-title" className="text-base font-extrabold text-foreground tracking-tight">
              {isEdit ? 'Edit Custom Role' : 'Create Custom Role'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
            aria-label="Close modal dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        {isLoading ? (
          <div className="flex-1 py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs">Loading resources…</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
            {/* Name Input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="role-name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Role Name
              </label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lead Coordinator"
                className={errors.name ? 'border-red-500 focus:ring-red-500/50' : ''}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'role-name-error' : undefined}
              />
              {errors.name && (
                <span id="role-name-error" className="text-[11px] text-red-400 pl-0.5 mt-0.5">
                  {errors.name}
                </span>
              )}
            </div>

            {/* Description Input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="role-description" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Description
              </label>
              <textarea
                id="role-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Summarize the core duties or access scope of this role…"
                className="w-full min-h-[70px] rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/60 resize-y"
                maxLength={500}
              />
            </div>

            {/* Permission Grid */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-border/20 pb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                  Permission Mapping
                </span>
                {errors.permissions && (
                  <span className="text-[11px] text-red-400">
                    {errors.permissions}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-5 max-h-[300px] overflow-y-auto pr-1">
                {Object.entries(permissionsGrouped).map(([category, perms]) => {
                  const categoryCodes = perms.map((p) => p.code);
                  const isAllCategorySelected = categoryCodes.every((c) => selectedPermissions.includes(c));

                  return (
                    <div key={category} className="border border-border/30 rounded-xl bg-accent/10 p-4 flex flex-col gap-3">
                      {/* Group Header */}
                      <div className="flex items-center justify-between border-b border-border/10 pb-1.5">
                        <span className="text-xs font-bold text-foreground capitalize tracking-wide">
                          {category} Management
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleCategory(category, categoryCodes)}
                          className="text-[10px] font-bold text-primary hover:underline cursor-pointer focus-visible:outline-none"
                        >
                          {isAllCategorySelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>

                      {/* Checkboxes grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {perms.map((p) => {
                          const isSelected = selectedPermissions.includes(p.code);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-start gap-3 rounded-lg border p-2.5 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-primary/5 border-primary/40 text-foreground'
                                  : 'bg-card/40 border-border/30 text-muted-foreground hover:bg-card/80 hover:text-foreground'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePermission(p.code)}
                                className="mt-0.5 h-3.5 w-3.5 rounded border-border bg-card text-primary focus:ring-primary/50 cursor-pointer"
                              />
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-bold font-mono tracking-tight">
                                  {p.code}
                                </span>
                                <span className="text-[10px] text-muted-foreground leading-relaxed">
                                  {p.description || 'No description available'}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 border-t border-border/20 pt-4 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={mutation.isPending}
                className="min-w-24"
              >
                {mutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isEdit ? (
                  'Save Changes'
                ) : (
                  'Create Role'
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
