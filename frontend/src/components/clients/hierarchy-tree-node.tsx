import React from 'react';
import { Building2 } from 'lucide-react';
import { HierarchyNode } from '@services/clients-api';

interface IHierarchyTreeNodeProps {
  node: HierarchyNode;
  activeId: string;
}

export const HierarchyTreeNode: React.FC<IHierarchyTreeNodeProps> = ({ node, activeId }) => {
  const isActive = node.id === activeId;
  const hasChildren = node.subsidiaries && node.subsidiaries.length > 0;
  return (
    <li
      role="treeitem"
      aria-selected={isActive}
      aria-expanded={hasChildren ? true : undefined}
      className="flex flex-col gap-2 pl-4 border-l border-border/20 mt-2 list-none"
    >
      <div
        tabIndex={0}
        className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold w-fit border ${
          isActive
            ? 'bg-primary/10 border-primary/30 text-primary'
            : 'bg-card/45 border-border/10 text-foreground/80 hover:bg-accent/10 transition-colors'
        }`}
      >
        <Building2 className="h-3.5 w-3.5" />
        {isActive ? (
          <span>{node.name} (Active Profile)</span>
        ) : (
          <a href={`/dashboard/clients/${node.id}`} className="hover:underline focus:outline-none">
            {node.name} ({node.domain})
          </a>
        )}
      </div>
      {hasChildren && (
        <ul role="group" className="flex flex-col gap-1 list-none p-0 m-0">
          {node.subsidiaries.map((child) => (
            <HierarchyTreeNode key={child.id} node={child} activeId={activeId} />
          ))}
        </ul>
      )}
    </li>
  );
};
