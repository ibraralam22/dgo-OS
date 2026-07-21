'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, UserListItem } from '@services/users-api';
import { toast } from '@utils/toast';
import { useAuthStore } from '@store/auth-store';
import { useDebounce } from '@hooks/use-debounce';
import {
  Users,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserX,
} from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { cn } from '@utils/cn';
import UserModal from '@components/users/user-modal';
import { StatusBadge, RoleBadge, Avatar } from '@components/users/user-badges';
import { ActionMenu } from '@components/users/action-menu';
import { ConfirmDialog } from '@components/users/confirm-dialog';

export default function UsersPage() {
  const { user: me } = useAuthStore();
  const queryClient = useQueryClient();
  const canWrite = me?.permissions?.includes('iam:write') ?? false;

  // Filters & pagination
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserListItem | null>(null);
  const [roleUser, setRoleUser] = useState<UserListItem | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'suspend' | 'activate' | 'remove'; user: UserListItem } | null>(null);

  // Queries
  const queryKey = ['users', page, debouncedSearch, statusFilter, roleFilter];
  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => usersApi.list({
      page,
      limit: 10,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      role: roleFilter || undefined,
    }),
    placeholderData: (prev) => prev,
  });

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, string> }) =>
      usersApi.update(id, payload),
    onSuccess: (_data, vars) => {
      const action = vars.payload.status === 'suspended' ? 'suspended' : 'activated';
      toast.success(`User ${action} successfully.`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmAction(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      toast.success('User removed from organization.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmAction(null);
    },
  });

  const users = data?.data ?? [];
  const meta = data?.meta;

  const roles = useMemo(() => ['TenantAdmin', 'SalesRepresentative', 'ClientContact'], []);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Users className="h-4.5 w-4.5 text-primary" />
            </div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">User Directory</h1>
          </div>
          <p className="text-xs text-muted-foreground pl-10">
            Manage workspace members, roles, and access controls
          </p>
        </div>
        {canWrite && (
          <Button
            id="add-user-btn"
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add User
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl border border-border/40 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            id="user-search-input"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search name or email…"
            className="pl-9 h-9 text-sm"
            aria-label="Search users by name or email"
          />
        </div>

        <select
          id="user-status-filter"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          aria-label="Filter by Status"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>

        <select
          id="user-role-filter"
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          aria-label="Filter by Role"
        >
          <option value="">All Roles</option>
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 select-none bg-muted/20">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Joined</th>
                {canWrite && <th className="px-4 py-3 w-12" />}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs">Loading users…</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <UserX className="h-8 w-8 opacity-40" />
                      <span className="text-sm font-medium">No users found</span>
                      <span className="text-xs opacity-60">Try adjusting your search or filters</span>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u, i) => (
                  <tr
                    key={u.id}
                    className={cn(
                      'group border-b border-border/20 hover:bg-accent/20 transition-colors',
                      isFetching && 'opacity-60',
                      i === users.length - 1 && 'border-b-0'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar firstName={u.firstName} lastName={u.lastName} />
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-sm">
                            {u.firstName} {u.lastName}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role.name} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                    {canWrite && (
                      <td className="px-3 py-3 text-right">
                        <ActionMenu
                          user={u}
                          canWrite={canWrite}
                          onEdit={(usr) => setEditUser(usr)}
                          onChangeRole={(usr) => setRoleUser(usr)}
                          onToggleStatus={(usr) =>
                            setConfirmAction({
                              type: usr.status === 'suspended' ? 'activate' : 'suspend',
                              user: usr,
                            })
                          }
                          onRemove={(usr) => setConfirmAction({ type: 'remove', user: usr })}
                        />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
            <span className="text-xs text-muted-foreground">
              Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total} users
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.page <= 1}
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="h-7 flex items-center px-3 text-xs font-medium text-foreground">
                {meta.page} / {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={meta.page >= meta.totalPages}
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {createModalOpen && (
        <UserModal
          mode="create"
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setCreateModalOpen(false);
          }}
        />
      )}

      {/* Edit Profile Modal */}
      {editUser && (
        <UserModal
          mode="edit"
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setEditUser(null);
          }}
        />
      )}

      {/* Change Role Modal */}
      {roleUser && (
        <UserModal
          mode="role"
          user={roleUser}
          onClose={() => setRoleUser(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setRoleUser(null);
          }}
        />
      )}

      {/* Confirm Dialog */}
      {confirmAction && (
        <ConfirmDialog
          title={
            confirmAction.type === 'remove'
              ? 'Remove User from Organization'
              : confirmAction.type === 'suspend'
              ? 'Suspend User Account'
              : 'Activate User Account'
          }
          message={
            confirmAction.type === 'remove'
              ? `Remove ${confirmAction.user.firstName} ${confirmAction.user.lastName} from this organization? Their active sessions will be revoked immediately.`
              : confirmAction.type === 'suspend'
              ? `Suspend ${confirmAction.user.firstName} ${confirmAction.user.lastName}? All active sessions will be revoked immediately.`
              : `Reactivate ${confirmAction.user.firstName} ${confirmAction.user.lastName}? They will be able to log in again.`
          }
          confirmLabel={
            confirmAction.type === 'remove'
              ? 'Remove'
              : confirmAction.type === 'suspend'
              ? 'Suspend'
              : 'Activate'
          }
          destructive={confirmAction.type !== 'activate'}
          loading={updateUserMutation.isPending || removeMutation.isPending}
          onConfirm={() => {
            if (confirmAction.type === 'remove') {
              removeMutation.mutate(confirmAction.user.id);
            } else {
              updateUserMutation.mutate({
                id: confirmAction.user.id,
                payload: { status: confirmAction.type === 'suspend' ? 'suspended' : 'active' },
              });
            }
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
