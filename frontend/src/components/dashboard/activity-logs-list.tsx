import React from 'react';
import { AuditLogItem } from '@services/dashboard-api';
import { Activity, Loader2, AlertCircle, Clock } from 'lucide-react';

interface IActivityLogsListProps {
  activityLogs?: AuditLogItem[];
  isActivityLoading: boolean;
}

export const ActivityLogsList: React.FC<IActivityLogsListProps> = ({
  activityLogs,
  isActivityLoading,
}) => {
  const getActionLabel = (log: AuditLogItem) => {
    const userName = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System';
    const targetName = log.payloadAfter?.name || log.payloadAfter?.email || log.resourceId || '';

    switch (log.action) {
      case 'role.create':
        return `${userName} created role "${targetName}"`;
      case 'role.update':
        return `${userName} updated role "${targetName}"`;
      case 'role.delete':
        return `${userName} deleted role "${targetName}"`;
      case 'user.create':
        return `${userName} invited user "${targetName}"`;
      case 'user.update':
        return `${userName} updated profile of "${targetName}"`;
      case 'user.role_change':
        return `${userName} updated roles configuration for "${targetName}"`;
      case 'user.remove':
        return `${userName} removed user "${targetName}"`;
      case 'auth.login':
        return `${userName} logged in successfully`;
      case 'auth.compromise_detected':
        return `Security compromise alert: duplicate refresh token rotation detected`;
      default:
        return `${userName} performed action "${log.action}" on "${log.resourceName}"`;
    }
  };

  return (
    <div className="glass-card rounded-xl p-6 border border-border/40">
      <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-foreground">
        <Activity className="h-5 w-5 text-primary" />
        Recent Security & Administrative Activity
      </h3>

      {isActivityLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading activity logs...
        </div>
      )}

      {!isActivityLoading && activityLogs && activityLogs.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border border-dashed border-border rounded-lg">
          <AlertCircle className="h-4 w-4" />
          No audit logs have been recorded in this organization workspace yet.
        </div>
      )}

      {!isActivityLoading && activityLogs && activityLogs.length > 0 && (
        <div className="relative border-l border-border/30 ml-3 pl-6 space-y-6">
          {activityLogs.map((log) => (
            <div key={log.id} className="relative group">
              {/* Dot */}
              <div className="absolute -left-[30px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background shadow shadow-primary/20 group-hover:scale-110 transition-transform" />
              
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-foreground">
                  {getActionLabel(log)}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {new Date(log.createdAt).toLocaleString()}
                  {log.ipAddress && ` • IP: ${log.ipAddress}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
