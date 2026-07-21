import React, { useState } from 'react';
import { RoleListItem } from '@services/roles-api';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';

interface IActionMenuProps {
  role: RoleListItem;
  canWrite: boolean;
  onEdit: (r: RoleListItem) => void;
  onRemove: (r: RoleListItem) => void;
}

export const ActionMenu: React.FC<IActionMenuProps> = ({
  role,
  canWrite,
  onEdit,
  onRemove,
}) => {
  const [open, setOpen] = useState(false);

  if (!canWrite) return null;

  return (
    <div className="relative">
      <button
        id={`role-action-${role.id}`}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
        aria-label="Role actions"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-40 glass-card rounded-xl border border-border/60 shadow-xl overflow-hidden bg-background">
          {role.isSystem ? (
            <div className="px-3 py-2 text-[11px] text-muted-foreground bg-accent/20 italic">
              Read-only System Role
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  setOpen(false);
                  onEdit(role);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-accent/50 transition-colors cursor-pointer text-left"
              >
                <Edit className="h-3.5 w-3.5 text-muted-foreground" /> Edit Role
              </button>
              <div className="border-t border-border/30 mx-3" />
              <button
                onClick={() => {
                  setOpen(false);
                  onRemove(role);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Role
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
