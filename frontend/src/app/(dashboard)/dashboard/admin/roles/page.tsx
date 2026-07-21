'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi, RoleListItem } from '@services/roles-api';
import { toast } from '@utils/toast';
import { useAuthStore } from '@store/auth-store';
import {
  Shield,
  Plus,
  Search,
  Users,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { cn } from '@utils/cn';
import RoleModal from '@components/roles/role-modal';
import { TypeBadge } from '@components/roles/role-badges';
import { ActionMenu } from '@components/roles/action-menu';
import { ConfirmDialog } from '@components/roles/confirm-dialog';

export default function RolesPage() {
  const { user: me } = useAuthStore();
  const queryClient = useQueryClient();
  const canWrite = me?.permissions?.includes('iam:write') ?? false;

  // Search local state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modal / dialog states
  const [modalOpen, setModalOpen] = useState(false);
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<RoleListItem | null>(null);

  // Queries
  const { data: rolesData, isLoading, isFetching } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list(),
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesApi.remove(id),
    onSuccess: () => {
      toast.success('Role deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setRoleToDelete(null);
    },
  });

  const rawRoles = rolesData?.data ?? [];

  // Local filtering & searching
  const filteredRoles = useMemo(() => {
    return rawRoles.filter((role: RoleListItem) => {
      const matchSearch =
        role.name.toLowerCase().includes(search.toLowerCase()) ||
        (role.description && role.description.toLowerCase().includes(search.toLowerCase()));

      const matchType =
        typeFilter === 'all' ||
        (typeFilter === 'system' && role.isSystem) ||
        (typeFilter === 'custom' && !role.isSystem);

      return matchSearch && matchType;
    });
  }, [rawRoles, search, typeFilter]);

  const handleEditRole = (role: RoleListItem) => {
    setActiveRoleId(role.id);
    setModalOpen(true);
  };

  const handleCreateRole = () => {
    setActiveRoleId(null);
    setModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (roleToDelete) {
      deleteMutation.mutate(roleToDelete.id);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Shield className="h-4.5 w-4.5 text-primary" />
            </div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">
              Roles & Permissions
            </h1>
          </div>
          <p className="text-xs text-muted-foreground pl-10">
            View system roles and customize workspace permissions mappings
          </p>
        </div>
        {canWrite && (
          <Button
            id="add-role-btn"
            variant="primary"
            size="sm"
            onClick={handleCreateRole}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Create Custom Role
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl border border-border/40 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            id="role-search-input"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Search role name or details…"
            className="pl-9 h-9 text-sm"
            aria-label="Search roles by name or description"
          />
        </div>

        <select
          id="role-type-filter"
          value={typeFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          aria-label="Filter by Role Type"
        >
          <option value="all">All Roles</option>
          <option value="system">System Roles</option>
          <option value="custom">Custom Roles</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Roles List">
            <thead>
              <tr className="border-b border-border/40 select-none bg-muted/20">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Role Name
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-36">
                  Scope
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-28">
                  Permissions
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-28">
                  Assigned Users
                </th>
                {canWrite && <th className="px-4 py-3 w-12" />}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={canWrite ? 6 : 5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs">Loading roles…</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 6 : 5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Shield className="h-8 w-8 opacity-40 text-primary" />
                      <span className="text-sm font-medium">No roles found</span>
                      <span className="text-xs opacity-60">
                        Try adjusting your search filters
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role: RoleListItem, i: number) => (
                  <tr
                    key={role.id}
                    className={cn(
                      'group border-b border-border/20 hover:bg-accent/20 transition-colors',
                      isFetching && 'opacity-60',
                      i === filteredRoles.length - 1 && 'border-b-0'
                    )}
                  >
                    <td className="px-4 py-4.5 font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        {role.name}
                      </div>
                    </td>
                    <td className="px-4 py-4.5 text-xs text-muted-foreground leading-relaxed">
                      {role.description || 'No description provided.'}
                    </td>
                    <td className="px-4 py-4.5">
                      <TypeBadge isSystem={role.isSystem} />
                    </td>
                    <td className="px-4 py-4.5 text-center font-semibold text-foreground text-xs">
                      <span className="inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5">
                        <CheckCircle className="h-3 w-3 text-primary/70" /> {role.permissionCount}
                      </span>
                    </td>
                    <td className="px-4 py-4.5 text-center font-semibold text-foreground text-xs">
                      <span className="inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5">
                        <Users className="h-3 w-3 text-primary/70" /> {role.userCount}
                      </span>
                    </td>
                    {canWrite && (
                      <td className="px-3 py-4 text-right">
                        <ActionMenu
                          role={role}
                          canWrite={canWrite}
                          onEdit={handleEditRole}
                          onRemove={(r) => setRoleToDelete(r)}
                        />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal dialog */}
      <RoleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        roleId={activeRoleId}
      />

      {/* Delete confirmation dialogue */}
      {roleToDelete && (
        <ConfirmDialog
          title="Delete Custom Role"
          message={`Are you sure you want to delete the role "${roleToDelete.name}"? This action is permanent and cannot be undone.`}
          confirmLabel="Delete Role"
          destructive
          loading={deleteMutation.isPending}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setRoleToDelete(null)}
        />
      )}
    </div>
  );
}
