import React from 'react';
import Link from 'next/link';
import { OpportunityListItem, OpportunityStage } from '@services/opportunities-api';
import { ShieldCheck, AlertCircle, Edit, Trash2, ArrowRight } from 'lucide-react';
import { STAGES, formatCurrency } from './constants';
import { cn } from '@utils/cn';

interface IOpportunityKanbanProps {
  opportunitiesByStage: Record<OpportunityStage, OpportunityListItem[]>;
  hasWriteAccess: boolean;
  onEdit: (opp: OpportunityListItem, e: React.MouseEvent) => void;
  onDelete: (id: string) => void;
}

export const OpportunityKanban: React.FC<IOpportunityKanbanProps> = ({
  opportunitiesByStage,
  hasWriteAccess,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 overflow-x-auto pb-4">
      {STAGES.map(({ stage, label, prob, color, border, bg }) => {
        const list = opportunitiesByStage[stage] ?? [];
        const colTotal = list.reduce((sum, o) => sum + Number(o.amount), 0);

        return (
          <div key={stage} className="flex flex-col gap-4 min-w-[240px] bg-card/25 rounded-xl border border-border/20 p-4 h-[600px]">
            {/* Column Header */}
            <div className="flex items-center justify-between border-b border-border/10 pb-2">
              <div className="flex flex-col">
                <span className={cn('text-sm font-bold tracking-tight', color)}>{label}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">{prob}% Probability</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs bg-muted/30 px-2 py-0.5 rounded-full text-foreground font-semibold">
                  {list.length}
                </span>
                <span className="text-[10px] text-muted-foreground font-bold mt-0.5">{formatCurrency(colTotal)}</span>
              </div>
            </div>

            {/* Cards Container */}
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
              {list.length === 0 ? (
                <div className="h-full border border-dashed border-border/10 rounded-lg flex items-center justify-center p-4">
                  <span className="text-[11px] text-muted-foreground text-center">No deals in this stage</span>
                </div>
              ) : (
                list.map((opp) => (
                  <Link
                    key={opp.id}
                    href={`/dashboard/opportunities/${opp.id}`}
                    className="group flex flex-col bg-card/85 border border-border/30 hover:border-primary/45 rounded-lg p-3 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 relative overflow-hidden"
                  >
                    {/* Status glow indicators */}
                    {opp.stage === 'CLOSED_WON' && <div className="absolute top-0 right-0 w-12 h-1 bg-emerald-500" />}
                    {opp.stage === 'CLOSED_LOST' && <div className="absolute top-0 right-0 w-12 h-1 bg-rose-500" />}

                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {opp.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                      Account: <span className="text-foreground font-medium">{opp.account?.name}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      Value: <span className="text-foreground font-extrabold">{formatCurrency(opp.amount)}</span>
                    </span>

                    {opp.requiresApproval && (
                      <div className={cn(
                        "flex items-center gap-1 mt-2 px-1.5 py-0.5 rounded text-[9px] font-bold w-fit",
                        opp.approved ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      )}>
                        {opp.approved ? <ShieldCheck className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {opp.approved ? 'Approved' : 'Needs Approval'}
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-border/10 mt-3 pt-2 text-[9px] text-muted-foreground">
                      <span>Est. Close: {opp.closeDate ? opp.closeDate.split('T')[0] : 'N/A'}</span>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {hasWriteAccess && (
                          <button
                            onClick={(e) => onEdit(opp, e)}
                            className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                          >
                            <Edit className="h-2.5 w-2.5" />
                          </button>
                        )}
                        {hasWriteAccess && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onDelete(opp.id);
                            }}
                            className="p-0.5 rounded hover:bg-accent text-rose-400 hover:text-rose-300 cursor-pointer focus:outline-none"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        )}
                        <ArrowRight className="h-3 w-3 text-primary" />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
