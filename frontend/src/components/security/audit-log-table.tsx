import React from 'react';
import { AuditLog } from '@services/security-api';
import { ChevronLeft, ChevronRight, Loader2, Terminal } from 'lucide-react';
import { Button } from '@components/ui/button';

interface IAuditLogTableProps {
  logData?: {
    logs: AuditLog[];
    page: number;
    totalPages: number;
    total: number;
  };
  isLogsLoading: boolean;
  page: number;
  onPageChange: (newPage: number) => void;
  onInspectDiff: (log: AuditLog) => void;
}

export const AuditLogTable: React.FC<IAuditLogTableProps> = ({
  logData,
  isLogsLoading,
  page,
  onPageChange,
  onInspectDiff,
}) => {
  const formatDateTime = (val: string) => {
    return new Date(val).toLocaleString();
  };

  if (isLogsLoading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Loading audit database...</span>
      </div>
    );
  }

  if (logData?.logs?.length === 0) {
    return (
      <div className="h-48 border border-dashed border-border/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Terminal className="h-8 w-8 opacity-30 animate-pulse" />
        <span className="text-xs">No audit logs match criteria</span>
      </div>
    );
  }

  return (
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
                  <Button onClick={() => onInspectDiff(log)} variant="outline" size="sm">
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
            onClick={() => onPageChange(Math.max(page - 1, 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(page + 1, logData?.totalPages || 1))}
            disabled={page >= (logData?.totalPages || 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
