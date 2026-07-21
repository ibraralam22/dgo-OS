import React from 'react';
import { Lock } from 'lucide-react';

interface ITypeBadgeProps {
  isSystem: boolean;
}

export const TypeBadge: React.FC<ITypeBadgeProps> = ({ isSystem }) => {
  return isSystem ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
      <Lock className="h-2.5 w-2.5" /> System
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
      Custom
    </span>
  );
};
