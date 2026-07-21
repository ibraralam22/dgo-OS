import React from 'react';
import { UserSession } from '@services/security-api';
import { Monitor, Terminal, Clock, Cpu, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@components/ui/button';
import { cn } from '@utils/cn';

interface IActiveSessionsListProps {
  sessionData?: UserSession[];
  isSessionsLoading: boolean;
  onRevoke: (id: string) => void;
  isRevoking: boolean;
}

export const ActiveSessionsList: React.FC<IActiveSessionsListProps> = ({
  sessionData,
  isSessionsLoading,
  onRevoke,
  isRevoking,
}) => {
  const formatDateTime = (val: string) => {
    return new Date(val).toLocaleString();
  };

  if (isSessionsLoading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Scanning active login sessions...</span>
      </div>
    );
  }

  if (sessionData?.length === 0) {
    return (
      <div className="h-48 border border-dashed border-border/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Monitor className="h-8 w-8 opacity-30 animate-pulse" />
        <span className="text-xs">No active sessions found</span>
      </div>
    );
  }

  return (
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
              onClick={() => onRevoke(session.id)}
              disabled={isRevoking}
              variant="outline"
              size="sm"
              className="w-full mt-4 text-rose-400 border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-500 gap-1.5"
            >
              {isRevoking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Revoke Token Family
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};
