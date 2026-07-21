import React from 'react';
import Link from 'next/link';
import { OpportunityListItem } from '@services/opportunities-api';
import { ArrowRight, Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from './constants';
import { cn } from '@utils/cn';

interface IOpportunityTableProps {
  opportunities: OpportunityListItem[];
  hasWriteAccess: boolean;
  onEdit: (opp: OpportunityListItem, e: React.MouseEvent) => void;
  onDelete: (id: string) => void;
}

export const OpportunityTable: React.FC<IOpportunityTableProps> = ({
  opportunities,
  hasWriteAccess,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="glass-card rounded-xl overflow-hidden border border-border/20">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/30 bg-muted/10 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <th className="px-6 py-4">Deal Title</th>
              <th className="px-6 py-4">B2B Account</th>
              <th className="px-6 py-4">Assigned Owner</th>
              <th className="px-6 py-4">Est. Close Date</th>
              <th className="px-6 py-4">Stage</th>
              <th className="px-6 py-4">Budget Value</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/10 text-sm text-foreground">
            {opportunities.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                  No deals found matching filter queries.
                </td>
              </tr>
            ) : (
              opportunities.map((opp) => (
                <tr key={opp.id} className="hover:bg-muted/5 transition-colors group">
                  <td className="px-6 py-4 font-bold text-foreground hover:text-primary transition-colors">
                    <Link href={`/dashboard/opportunities/${opp.id}`}>
                      {opp.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{opp.account?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {opp.owner ? `${opp.owner.firstName} ${opp.owner.lastName}` : <span className="italic">Unassigned</span>}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{opp.closeDate ? opp.closeDate.split('T')[0] : 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[11px] font-bold border',
                        opp.stage === 'DISCOVERY' && 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                        opp.stage === 'PROPOSAL' && 'bg-sky-500/10 text-sky-400 border-sky-500/20',
                        opp.stage === 'NEGOTIATION' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                        opp.stage === 'CLOSED_WON' && 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                        opp.stage === 'CLOSED_LOST' && 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      )}
                    >
                      {opp.stage.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-foreground">{formatCurrency(opp.amount)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/dashboard/opportunities/${opp.id}`} className="p-1 rounded hover:bg-accent/40 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none">
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      {hasWriteAccess && (
                        <button
                          onClick={(e) => onEdit(opp, e)}
                          className="p-1 rounded hover:bg-accent/40 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {hasWriteAccess && (
                        <button
                          onClick={() => onDelete(opp.id)}
                          className="p-1 rounded hover:bg-accent/40 text-rose-400 hover:text-rose-300 cursor-pointer focus:outline-none"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
