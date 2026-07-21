import React, { useState } from 'react';
import Link from 'next/link';
import { ContactListItem } from '@services/clients-api';
import { Crown, Mail, Building2, MoreHorizontal, Edit2, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@utils/cn';

interface IContactsTableProps {
  displayedContacts: ContactListItem[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (contact: ContactListItem) => void;
  onSetPrimaryBilling: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ContactsTable: React.FC<IContactsTableProps> = ({
  displayedContacts,
  isLoading,
  isError,
  onEdit,
  onSetPrimaryBilling,
  onDelete,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto min-h-[220px]">
      <table className="w-full text-left border-collapse min-w-[900px]" aria-label="Customer contacts directory table">
        <thead>
          <tr className="border-b border-border/10 bg-accent/10">
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Stakeholder Contact</th>
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Client Company</th>
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Title & Division</th>
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Influence Level</th>
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Loading stakeholder directory...
                </div>
              </td>
            </tr>
          ) : isError ? (
            <tr>
              <td colSpan={6} className="px-5 py-12 text-center text-red-400 font-semibold text-sm">
                Failed to load contacts directory. Please reload or check connection.
              </td>
            </tr>
          ) : displayedContacts.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm font-medium">
                No stakeholder contact records found.
              </td>
            </tr>
          ) : (
            displayedContacts.map((contact) => (
              <tr 
                key={contact.id} 
                className="border-b border-border/10 hover:bg-accent/5 transition-colors group"
              >
                {/* Contact Details */}
                <td className="px-5 py-3.5 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {contact.firstName[0]}{contact.lastName[0]}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-foreground flex items-center gap-2">
                        {contact.firstName} {contact.lastName}
                        {contact.isPrimaryBilling && (
                          <span title="Primary Billing Contact">
                            <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-muted-foreground/60" />
                        {contact.email}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Company Redirection Link */}
                <td className="px-5 py-3.5 text-xs font-bold">
                  {contact.account ? (
                    <Link 
                      href={`/dashboard/clients/${contact.account.id}`}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      {contact.account.name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground/40 font-normal">Independent</span>
                  )}
                </td>

                {/* Job Title / Division */}
                <td className="px-5 py-3.5 text-xs font-semibold text-foreground/80">
                  <div className="flex flex-col">
                    <span>{contact.jobTitle || 'Stakeholder'}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">{contact.department || 'N/A'}</span>
                  </div>
                </td>

                {/* Influence Badge */}
                <td className="px-5 py-3.5">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider ${
                    contact.roleScope === 'DECISION_MAKER'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : contact.roleScope === 'INFLUENCER'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : contact.roleScope === 'GATEKEEPER'
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                  }`}>
                    {contact.roleScope.replace('_', ' ')}
                  </span>
                </td>

                {/* Status */}
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                    contact.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    {contact.status}
                  </span>
                </td>

                {/* Row Actions */}
                <td className="px-5 py-3.5 text-right relative">
                  <button
                    onClick={() => setActiveMenuId(activeMenuId === contact.id ? null : contact.id)}
                    className="h-8 w-8 inline-flex items-center justify-center hover:bg-accent/40 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>

                  {activeMenuId === contact.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setActiveMenuId(null)}
                      />
                      <div className="absolute right-5 mt-1 w-40 bg-card border border-border rounded-lg shadow-xl py-1 z-20 animate-in fade-in slide-in-from-top-1 duration-150 text-left">
                        <button
                          onClick={() => {
                            onEdit(contact);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-accent/40 flex items-center gap-2 cursor-pointer focus:outline-none"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Modify Profile
                        </button>

                        {!contact.isPrimaryBilling && (
                          <button
                            onClick={() => {
                              onSetPrimaryBilling(contact.id);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 flex items-center gap-2 cursor-pointer focus:outline-none border-t border-border/10"
                          >
                            <Crown className="h-3.5 w-3.5" />
                            Set Billing Point
                          </button>
                        )}

                        <button
                          onClick={() => {
                            onDelete(contact.id);
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
