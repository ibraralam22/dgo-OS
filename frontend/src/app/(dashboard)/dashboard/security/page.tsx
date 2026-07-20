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
  Shield,
  Activity,
  UserCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Clock,
  Terminal,
  Cpu,
  Monitor,
  Trash2,
} from 'lucide-react';

export default function SecurityPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'logs' | 'sessions'>('logs');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'TenantAdmin';

  // Format Date
  const formatDateTime = (val: string) => {
    return new Date(val).toLocaleString();
  };

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

      {/* ─── AUDIT LOGS TAB ─────────────────────────────────────────────────── */}
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

          {/* Grid */}
          {isLogsLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Loading audit database...</span>
            </div>
          ) : logData?.logs?.length === 0 ? (
            <div className="h-48 border border-dashed border-border/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Terminal className="h-8 w-8 opacity-30 animate-pulse" />
              <span className="text-xs">No audit logs match criteria</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="overflow-x-auto rounded-2xl border border-border/20 bg-card/20 shadow-sm text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/20 bg-muted/20 text-muted-foreground font-black uppercase tracking-wider select-none">
                      <th className="px-5 py-3">Timestamp</th>
                      <th className="px-5 py-3">Actor Email</th>
                      <th className="px-5 py-3">Action Description</th>
                      <th className="px-5 py-3">Affected Target</th>
                      <th className="px-5 py-3">IP Location</th>
                      <th className="px-5 py-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10 font-medium">
                    {logData?.logs?.map((log) => (
                      <tr key={log.id} className="hover:bg-accent/10 transition-colors">
                        <td className="px-5 py-3.5 text-muted-foreground font-mono text-[10px]">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="px-5 py-3.5 text-foreground font-bold">
                          {log.user ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})` : 'System Daemon'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase font-mono">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {log.resourceName} ({log.resourceId?.slice(0, 8) || 'N/A'})
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground font-mono">
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Button onClick={() => setSelectedLog(log)} variant="outline" size="sm">
                            Inspect Diff
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-border/25 pt-4">
                <span className="text-[11px] text-muted-foreground">
                  Showing page <b>{logData?.page}</b> of <b>{logData?.totalPages}</b> ({logData?.total} total audit logs)
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(p + 1, logData?.totalPages || 1))}
                    disabled={page >= (logData?.totalPages || 1)}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── ACTIVE USER SESSIONS TAB ───────────────────────────────────────── */}
      {activeTab === 'sessions' && (
        isSessionsLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Scanning active login sessions...</span>
          </div>
        ) : sessionData?.length === 0 ? (
          <div className="h-48 border border-dashed border-border/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Monitor className="h-8 w-8 opacity-30 animate-pulse" />
            <span className="text-xs">No active sessions found</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessionData?.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'glass-card border bg-card/25 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden transition-all',
                  session.isRevoked ? 'opacity-50 border-rose-500/20' : 'border-border/30 hover:border-border/50'
                )}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-extrabold text-foreground text-xs">
                        {session.user.firstName} {session.user.lastName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{session.user.email}</span>
                    </div>

                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider',
                      session.isRevoked ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                    )}>
                      {session.isRevoked ? 'Revoked' : 'Active'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 text-[10px] text-muted-foreground font-semibold border-t border-border/10 pt-3">
                    <span className="flex items-center gap-1.5"><Terminal className="h-3 w-3" /> IP: <b className="font-mono text-foreground">{session.ipAddress || 'Unknown'}</b></span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Logged: <b className="text-foreground">{formatDateTime(session.createdAt)}</b></span>
                    <span className="flex items-center gap-1.5"><Cpu className="h-3 w-3" /> Expires: <b className="text-foreground">{formatDateTime(session.expiresAt)}</b></span>
                    {session.userAgent && (
                      <span className="flex items-start gap-1.5 max-h-12 overflow-y-auto leading-normal"><Monitor className="h-3 w-3 shrink-0" /> UA: <b className="text-[9px] font-mono text-foreground break-all">{session.userAgent}</b></span>
                    )}
                  </div>
                </div>

                {!session.isRevoked && (
                  <Button
                    onClick={() => revokeMutation.mutate(session.id)}
                    disabled={revokeMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="w-full mt-4 text-rose-400 border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-500 gap-1.5"
                  >
                    {revokeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Revoke Token Family
                  </Button>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* JSON Payload Diff Drawer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
          <div className="relative w-full max-w-4xl glass-card bg-background border border-border/30 rounded-2xl shadow-2xl z-10 animate-in zoom-in-95 duration-150 p-6 flex flex-col max-h-[85vh]">
            
            <div className="flex items-center justify-between border-b border-border/20 pb-4 mb-4 shrink-0">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Shield className="h-4.5 w-4.5 text-primary" /> Inspect Operation Log Diff
                </h3>
                <span className="text-[10px] text-muted-foreground font-mono">Action ID: {selectedLog.id}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)} className="h-7 w-7 rounded-lg">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold leading-relaxed">
              
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Payload Before Change</span>
                <pre className="flex-1 rounded-xl border border-border bg-card p-4 overflow-auto font-mono text-[10px] max-h-[50vh] text-rose-400">
                  {selectedLog.payloadBefore
                    ? JSON.stringify(selectedLog.payloadBefore, null, 2)
                    : '// No prior state (CREATE or AUTH event)'}
                </pre>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Payload After Change</span>
                <pre className="flex-1 rounded-xl border border-border bg-card p-4 overflow-auto font-mono text-[10px] max-h-[50vh] text-emerald-400">
                  {selectedLog.payloadAfter
                    ? JSON.stringify(selectedLog.payloadAfter, null, 2)
                    : '// No post state (DELETE event)'}
                </pre>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
