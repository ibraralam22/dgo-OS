import React, { useState } from 'react';
import Link from 'next/link';
import { AccountListItem } from '@services/clients-api';
import { Globe, MoreHorizontal, ExternalLink, Edit2, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@utils/cn';

interface IClientTableProps {
  accountsList: AccountListItem[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (account: AccountListItem) => void;
  onDelete: (id: string) => void;
}

export const ClientTable: React.FC<IClientTableProps> = ({
  accountsList,
  isLoading,
  isError,
  onEdit,
  onDelete,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto min-h-[220px]">
      <table className="w-full text-left border-collapse min-w-[900px]" aria-label="Clients directory table">
        <thead>
          <tr className="border-b border-border/10 bg-accent/10">
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Client Company</th>
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Industry</th>
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Size</th>
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Parent Account</th>
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Contacts</th>
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Loading clients directory...
                </div>
              </td>
            </tr>
          ) : isError ? (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center text-red-400 font-semibold text-sm">
                Failed to load B2B accounts. Please reload or check connection.
              </td>
            </tr>
          ) : accountsList.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground text-sm font-medium">
                No client profiles found matching search criteria.
              </td>
            </tr>
          ) : (
            accountsList.map((account) => (
              <tr 
                key={account.id} 
                className="border-b border-border/10 hover:bg-accent/5 transition-colors group"
              >
                {/* Client Name & Domain */}
                <td className="px-5 py-3.5 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <Link 
                      href={`/dashboard/clients/${account.id}`}
                      className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      {account.name}
                    </Link>
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Globe className="h-3 w-3 text-muted-foreground/60" />
                      {account.domain}
                    </span>
                  </div>
                </td>

                {/* Industry */}
                <td className="px-5 py-3.5 text-xs font-semibold text-muted-foreground">
                  {account.industry || 'General Outsourcing'}
                </td>

                {/* Size */}
                <td className="px-5 py-3.5 text-xs font-semibold text-foreground/80">
                  {account.employeeCount ? `${account.employeeCount} Employees` : 'N/A'}
                </td>

                {/* Parent Account */}
                <td className="px-5 py-3.5 text-xs font-semibold text-muted-foreground">
                  {account.parentAccount ? (
                    <Link 
                      href={`/dashboard/clients/${account.parentAccount.id}`}
                      className="text-primary hover:underline"
                    >
                      {account.parentAccount.name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground/40 font-normal">Independent</span>
                  )}
                </td>

                {/* Contacts Count */}
                <td className="px-5 py-3.5 text-xs font-semibold text-foreground/80">
                  {account._count?.contacts ?? 0} Stakeholders
                </td>

                {/* Status Badge */}
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center px-2 py-1.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                    account.status === 'ACTIVE' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : account.status === 'ONBOARDING'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {account.status}
                  </span>
                </td>

                {/* Actions Dropdown */}
                <td className="px-5 py-3.5 text-right relative">
                  <button
                    onClick={() => setActiveMenuId(activeMenuId === account.id ? null : account.id)}
                    className="h-8 w-8 inline-flex items-center justify-center hover:bg-accent/40 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>

                  {activeMenuId === account.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setActiveMenuId(null)}
                      />
                      <div className="absolute right-5 mt-1 w-36 bg-card border border-border rounded-lg shadow-xl py-1 z-20 animate-in fade-in slide-in-from-top-1 duration-150 text-left">
                        <Link
                          href={`/dashboard/clients/${account.id}`}
                          className="w-full px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-accent/40 flex items-center gap-2 cursor-pointer focus:outline-none"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View Hub
                        </Link>

                        <button
                          onClick={() => {
                            onEdit(account);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-accent/40 flex items-center gap-2 cursor-pointer focus:outline-none border-t border-border/10"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit Profile
                        </button>

                        <button
                          onClick={() => {
                            onDelete(account.id);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer focus:outline-none border-t border-border/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Profile
                        </button>
                      </div>
                    </>
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
