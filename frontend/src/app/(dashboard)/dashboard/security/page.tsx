'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { securityApi, AuditLog } from '@services/security-api';
import { useAuthStore } from '@store/auth-store';
import { toast } from '@utils/toast';
import { cn } from '@utils/cn';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import {
  ShieldAlert,
  Activity,
  UserCheck,
  Search,
} from 'lucide-react';
import { AuditLogTable } from '@components/security/audit-log-table';
import { AuditLogDrawer } from '@components/security/audit-log-drawer';
import { ActiveSessionsList } from '@components/security/active-sessions-list';

export default function SecurityPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'logs' | 'sessions'>('logs');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'TenantAdmin';

  // Queries
  const { data: logData, isLoading: isLogsLoading } = useQuery({
    queryKey: ['security-logs', page, searchQuery],
    queryFn: () => securityApi.getAuditLogs({ page, limit: 15, search: searchQuery || undefined }),
    enabled: activeTab === 'logs' && isAdmin,
  });

  const { data: sessionData, isLoading: isSessionsLoading } = useQuery({
    queryKey: ['security-sessions'],
    queryFn: () => securityApi.getSessions(),
    enabled: activeTab === 'sessions' && isAdmin,
  });

  // Mutations
  const revokeMutation = useMutation({
    mutationFn: (id: string) => securityApi.revokeSession(id),
    onSuccess: () => {
      toast.success('User session revoked successfully');
      queryClient.invalidateQueries({ queryKey: ['security-sessions'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Revocation failed'),
  });

  // Handle Search Input Change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  if (!isAdmin) {
    return (
      <div className="h-96 border border-dashed border-border/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <ShieldAlert className="h-10 w-10 text-rose-500 opacity-60 animate-bounce" />
        <span className="text-sm font-bold text-foreground">Access Denied</span>
        <span className="text-xs">Only Organization and System Administrators are authorized to view security logs.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground">Audit Security</h1>
        <p className="text-xs text-muted-foreground">Inspect organizational operations logs, verify login sessions, and revoke credentials access family triggers.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20">
        <button
          onClick={() => setActiveTab('logs')}
          className={cn(
            'flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] cursor-pointer focus:outline-none',
            activeTab === 'logs'
              ? 'border-primary text-primary font-black'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Activity className="h-4 w-4" />
          Operation Audit Logs
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={cn(
            'flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] cursor-pointer focus:outline-none',
            activeTab === 'sessions'
              ? 'border-primary text-primary font-black'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <UserCheck className="h-4 w-4" />
          Active Login Sessions
        </button>
      </div>

      {/* AUDIT LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="flex flex-col gap-4">
          {/* Controls */}
          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs by IP, User email, or Action..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          <AuditLogTable
            logData={logData}
            isLogsLoading={isLogsLoading}
            page={page}
            onPageChange={setPage}
            onInspectDiff={setSelectedLog}
          />
        </div>
      )}

      {/* ACTIVE USER SESSIONS TAB */}
      {activeTab === 'sessions' && (
        <ActiveSessionsList
          sessionData={sessionData}
          isSessionsLoading={isSessionsLoading}
          onRevoke={(id) => revokeMutation.mutate(id)}
          isRevoking={revokeMutation.isPending}
        />
      )}

      {/* JSON Payload Diff Drawer Modal */}
      <AuditLogDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
