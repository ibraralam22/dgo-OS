import React, { useState } from 'react';
import { LeadListItem } from '@services/leads-api';
import { MoreHorizontal, Edit, CheckCircle, Trash2, Loader2, AlertCircle, User } from 'lucide-react';
import { cn } from '@utils/cn';

interface ILeadsTableProps {
  leads: LeadListItem[];
  isLoading: boolean;
  hasWriteAccess: boolean;
  onEdit: (lead: LeadListItem) => void;
  onConvert: (id: string) => void;
  onDelete: (id: string) => void;
}

export const LeadsTable: React.FC<ILeadsTableProps> = ({
  leads,
  isLoading,
  hasWriteAccess,
  onEdit,
  onConvert,
  onDelete,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'contacted':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'qualified':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'nurturing':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'unqualified':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'converted':
        return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
      default:
        return 'bg-muted/10 text-muted-foreground border border-muted/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'New Opportunity';
      case 'contacted': return 'Contacted';
      case 'qualified': return 'Qualified';
      case 'nurturing': return 'Nurturing';
      case 'unqualified': return 'Unqualified';
      case 'converted': return 'Converted (Won)';
      default: return status;
    }
  };

  return (
    <div className="overflow-x-auto min-h-[220px]">
      <table className="w-full text-left border-collapse min-w-[800px]" aria-label="Leads list directory">
        <thead>
          <tr className="border-b border-border/10 bg-accent/10">
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Contact</th>
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Company</th>
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Source</th>
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Stage</th>
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Score</th>
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Budget</th>
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Owner</th>
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={8} className="py-12 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Loading pipeline leads directory...
                </div>
              </td>
            </tr>
          ) : leads.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-12 text-center text-muted-foreground">
                <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto p-4 border border-dashed border-border rounded-xl">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold text-foreground text-sm">No leads found</span>
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    There are no lead records matching the selection. Create a new lead to populate this pipeline directory.
                  </span>
                </div>
              </td>
            </tr>
          ) : (
            leads.map((lead) => (
              <tr
                key={lead.id}
                className={cn(
                  "border-b border-border/10 hover:bg-accent/20 transition-all duration-150",
                  lead.status === 'converted' && 'opacity-70 bg-emerald-500/[0.02]'
                )}
              >
                <td className="px-5 py-3.5">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">
                      {lead.firstName} {lead.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">{lead.email}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{lead.companyName}</span>
                    {lead.website && (
                      <span className="text-[10px] text-primary hover:underline truncate max-w-[150px]">
                        {lead.website}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm font-medium text-muted-foreground capitalize">
                  {lead.source.replace('_', ' ')}
                </td>
                <td className="px-5 py-3.5">
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", getStatusBadgeClass(lead.status))}>
                    {getStatusLabel(lead.status)}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-12 bg-border/40 h-2 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          lead.score >= 70 ? 'bg-emerald-500' : lead.score >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                        )}
                        style={{ width: `${lead.score}%` }} 
                      />
                    </div>
                    <span className="text-[11px] font-bold text-foreground">{lead.score}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm font-semibold text-foreground">
                  {lead.budget 
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(lead.budget)) 
                    : '--'}
                </td>
                <td className="px-5 py-3.5">
                  {lead.owner ? (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{lead.owner.firstName} {lead.owner.lastName}</span>
                    </div>
                  ) : (
                    <span className="text-xs italic text-muted-foreground/60">Unassigned</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right relative">
                  {hasWriteAccess && (
                    <div className="inline-block">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === lead.id ? null : lead.id)}
                        aria-label="Toggle actions menu"
                        className="h-8 w-8 rounded-lg hover:bg-accent/40 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {activeMenuId === lead.id && (
                        <div className="absolute right-5 mt-1.5 w-36 bg-card border border-border rounded-lg shadow-xl py-1 z-10 animate-in fade-in slide-in-from-top-1 duration-150">
                          <button
                            onClick={() => onEdit(lead)}
                            className="w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-accent flex items-center gap-2 cursor-pointer focus:outline-none"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Edit Lead
                          </button>
                          
                          {lead.status !== 'converted' && (
                            <button
                              onClick={() => {
                                onConvert(lead.id);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 cursor-pointer focus:outline-none border-t border-border/10"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Convert Lead
                            </button>
                          )}

                          <button
                            onClick={() => {
                              onDelete(lead.id);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs font-semibold text-red-400 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer focus:outline-none border-t border-border/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete Lead
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
