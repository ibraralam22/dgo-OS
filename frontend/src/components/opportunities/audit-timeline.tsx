import React from 'react';
import { History, Clock, Loader2 } from 'lucide-react';
import { formatCurrency } from './constants';

interface IAuditTimelineProps {
  auditLogs: any[];
  loadingLogs: boolean;
}

export const AuditTimeline: React.FC<IAuditTimelineProps> = ({ auditLogs, loadingLogs }) => {
  return (
    <div className="glass-card border border-border/20 rounded-2xl p-6 bg-card/30 flex flex-col gap-5 h-[550px] overflow-hidden">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/10 pb-2 flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        Audit Trail Activity
      </h3>

      <div className="flex-1 overflow-y-auto flex flex-col gap-5 pr-1">
        {loadingLogs ? (
          <div className="h-full flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading audit logs...
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground text-center p-4">
            No registered activities recorded for this opportunity yet.
          </div>
        ) : (
          auditLogs.map((log) => {
            const date = new Date(log.createdAt).toLocaleString();
            const userName = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System';
            
            // Format nice message based on action
            let details = '';
            if (log.action === 'opportunity.stage_changed' && log.payloadAfter) {
              details = `Stage transitioned to ${log.payloadAfter.stage}`;
            } else if (log.action === 'opportunity.amount_modified' && log.payloadAfter) {
              details = `Amount updated to ${formatCurrency(log.payloadAfter.amount)}`;
            } else if (log.action === 'opportunity.approved') {
              details = 'Special VP approval granted';
            } else {
              details = log.action.replace('opportunity.', 'Deal ').replace('_', ' ');
            }

            return (
              <div key={log.id} className="flex gap-3 text-xs">
                <div className="flex flex-col items-center">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Clock className="h-3 w-3" />
                  </div>
                  <div className="flex-1 w-[1px] bg-border/20 mt-2" />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-bold text-foreground">{userName}</span>
                    <span>{date.split(',')[0]}</span>
                  </div>
                  <span className="text-muted-foreground font-semibold capitalize-first">{details}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
