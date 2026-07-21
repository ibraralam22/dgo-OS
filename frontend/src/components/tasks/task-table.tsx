import React from 'react';
import { Task, TaskStatus } from '@services/tasks-api';
import { STATUSES, PRIORITY_CONFIG, ENTITY_LABELS, isOverdue } from './constants';
import { cn } from '@utils/cn';
import { Link2, Clock, ChevronRight, CheckSquare } from 'lucide-react';

interface ITableViewProps {
  tasks: Task[];
  hasWrite: boolean;
  onSelect: (t: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

export const TableView: React.FC<ITableViewProps> = ({
  tasks,
  hasWrite,
  onSelect,
  onStatusChange,
}) => {
  if (tasks.length === 0) {
    return (
      <div className="h-48 border border-dashed border-border/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <CheckSquare className="h-8 w-8 opacity-30 animate-pulse" />
        <span className="text-xs">No tasks found</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/20 bg-card/20 shadow-sm">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-border/20 bg-muted/20 text-muted-foreground font-black uppercase tracking-wider select-none">
            <th className="px-5 py-3">Title</th>
            <th className="px-5 py-3">Priority</th>
            <th className="px-5 py-3">Entity</th>
            <th className="px-5 py-3">Assigned To</th>
            <th className="px-5 py-3">Due Date</th>
            <th className="px-5 py-3">Status</th>
            {hasWrite && <th className="px-5 py-3 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/10 font-medium">
          {tasks.map((task) => {
            const priority = PRIORITY_CONFIG[task.priority];
            const statusCfg = STATUSES.find((s) => s.key === task.status)!;
            const overdue = isOverdue(task);

            return (
              <tr
                key={task.id}
                onClick={() => onSelect(task)}
                className="hover:bg-accent/10 transition-colors cursor-pointer"
              >
                <td className="px-5 py-3.5">
                  <span className={cn('font-extrabold text-foreground', task.status === 'DONE' && 'line-through text-muted-foreground')}>
                    {task.title}
                  </span>
                  {task.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <span className={cn('px-1.5 py-0.5 rounded border text-[10px] font-black uppercase', priority.color, priority.bg, priority.border)}>
                    {priority.label}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  {task.entityType ? (
                    <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Link2 className="h-3 w-3" /> {ENTITY_LABELS[task.entityType]}
                    </span>
                  ) : <span className="text-muted-foreground/40">—</span>}
                </td>
                <td className="px-5 py-3.5">
                  {task.assignedTo ? (
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black flex items-center justify-center">
                        {task.assignedTo.firstName[0]}{task.assignedTo.lastName[0]}
                      </div>
                      <span>{task.assignedTo.firstName} {task.assignedTo.lastName}</span>
                    </div>
                  ) : <span className="text-muted-foreground/40 italic">Unassigned</span>}
                </td>
                <td className="px-5 py-3.5">
                  {task.dueDate ? (
                    <span className={cn('text-[10px] flex items-center gap-1', overdue ? 'text-rose-400 font-bold' : 'text-muted-foreground')}>
                      <Clock className="h-3 w-3" />
                      {new Date(task.dueDate).toLocaleDateString()}
                      {overdue && ' ⚠'}
                    </span>
                  ) : <span className="text-muted-foreground/40">—</span>}
                </td>
                <td className="px-5 py-3.5">
                  <span className={cn('px-2 py-0.5 rounded border text-[10px] font-black uppercase', statusCfg.color, statusCfg.border, statusCfg.bg)}>
                    {statusCfg.label}
                  </span>
                </td>
                {hasWrite && (
                  <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
