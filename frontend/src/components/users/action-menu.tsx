import React, { useState } from 'react';
import { UserListItem } from '@services/users-api';
import { MoreHorizontal, Edit, ShieldCheck, RefreshCw, Trash2 } from 'lucide-react';

interface IActionMenuProps {
  user: UserListItem;
  canWrite: boolean;
  onEdit: (u: UserListItem) => void;
  onChangeRole: (u: UserListItem) => void;
  onToggleStatus: (u: UserListItem) => void;
  onRemove: (u: UserListItem) => void;
}

export const ActionMenu: React.FC<IActionMenuProps> = ({
  user,
  canWrite,
  onEdit,
  onChangeRole,
  onToggleStatus,
  onRemove,
}) => {
  const [open, setOpen] = useState(false);

  if (!canWrite) return null;

  return (
    <div className="relative">
      <button
        id={`user-action-${user.id}`}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="User actions"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 glass-card rounded-xl border border-border/60 shadow-xl overflow-hidden bg-background">
          <button
            onClick={() => { setOpen(false); onEdit(user); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-accent/50 transition-colors cursor-pointer text-left"
          >
            <Edit className="h-3.5 w-3.5 text-muted-foreground" /> Edit Profile
          </button>
          <button
            onClick={() => { setOpen(false); onChangeRole(user); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-accent/50 transition-colors cursor-pointer text-left"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /> Change Role
          </button>
          <button
            onClick={() => { setOpen(false); onToggleStatus(user); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-accent/50 transition-colors cursor-pointer text-left"
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            {user.status === 'suspended' ? 'Activate User' : 'Suspend User'}
          </button>
          <div className="border-t border-border/30 mx-3" />
          <button
            onClick={() => { setOpen(false); onRemove(user); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove from Org
          </button>
        </div>
      )}
    </div>
  );
}
