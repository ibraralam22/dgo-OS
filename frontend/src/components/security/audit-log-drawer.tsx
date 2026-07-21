import React from 'react';
import { AuditLog } from '@services/security-api';
import { Shield, X } from 'lucide-react';
import { Button } from '@components/ui/button';

interface IAuditLogDrawerProps {
  log: AuditLog | null;
  onClose: () => void;
}

export const AuditLogDrawer: React.FC<IAuditLogDrawerProps> = ({ log, onClose }) => {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl glass-card bg-background border border-border/30 rounded-2xl shadow-2xl z-10 animate-in zoom-in-95 duration-150 p-6 flex flex-col max-h-[85vh]">
        
        <div className="flex items-center justify-between border-b border-border/20 pb-4 mb-4 shrink-0">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
              <Shield className="h-4.5 w-4.5 text-primary" /> Inspect Operation Log Diff
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono">Action ID: {log.id}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 rounded-lg">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold leading-relaxed">
          
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Payload Before Change</span>
            <pre className="flex-1 rounded-xl border border-border bg-card p-4 overflow-auto font-mono text-[10px] max-h-[50vh] text-rose-400">
              {log.payloadBefore
                ? JSON.stringify(log.payloadBefore, null, 2)
                : '// No prior state (CREATE or AUTH event)'}
            </pre>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Payload After Change</span>
            <pre className="flex-1 rounded-xl border border-border bg-card p-4 overflow-auto font-mono text-[10px] max-h-[50vh] text-emerald-400">
              {log.payloadAfter
                ? JSON.stringify(log.payloadAfter, null, 2)
                : '// No post state (DELETE event)'}
            </pre>
          </div>

        </div>
      </div>
    </div>
  );
};
