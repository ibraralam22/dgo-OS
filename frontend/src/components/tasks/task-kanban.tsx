import React from 'react';
import { Task, TaskStatus } from '@services/tasks-api';
import { STATUSES, PRIORITY_CONFIG, ENTITY_LABELS, isOverdue } from './constants';
import { cn } from '@utils/cn';
import { Link2, Calendar } from 'lucide-react';

interface IKanbanBoardProps {
  grouped: Record<TaskStatus, Task[]>;
  hasWrite: boolean;
  onSelect: (t: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

export const KanbanBoard: React.FC<IKanbanBoardProps> = ({
  grouped,
  hasWrite,
  onSelect,
  onStatusChange,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
      {STATUSES.map((col) => (
        <div key={col.key} className={cn('rounded-2xl border p-3 flex flex-col gap-3 min-h-48', col.border, col.bg)}>
          {/* Column Header */}
          <div className={cn('flex items-center justify-between text-[10px] font-black uppercase tracking-widest', col.color)}>
            <div className="flex items-center gap-1.5">
              {col.icon}
              {col.label}
            </div>
            <span className="text-foreground/50">{grouped[col.key].length}</span>
          </div>

          {/* Cards */}
          {grouped[col.key].length === 0 ? (
            <p className="text-[10px] text-muted-foreground/50 italic text-center py-4">No tasks</p>
          ) : (
            grouped[col.key].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                hasWrite={hasWrite}
                onSelect={onSelect}
                onStatusChange={onStatusChange}
              />
            ))
          )}
        </div>
      ))}
    </div>
  );
}

interface ITaskCardProps {
  task: Task;
  hasWrite: boolean;
  onSelect: (t: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

export const TaskCard: React.FC<ITaskCardProps> = ({
  task,
  onSelect,
  onStatusChange,
  hasWrite,
}) => {
  const priority = PRIORITY_CONFIG[task.priority];
  const overdue = isOverdue(task);

  // Next logical status
  const nextStatus: Record<TaskStatus, TaskStatus | null> = {
    TODO: 'IN_PROGRESS',
    IN_PROGRESS: 'DONE',
    DONE: null,
    CANCELLED: null,
  };
  const next = nextStatus[task.status];

  return (
    <div
      onClick={() => onSelect(task)}
      className="bg-card/60 border border-border/30 rounded-xl p-3 flex flex-col gap-2 hover:bg-accent/10 transition-colors cursor-pointer group shadow-sm"
    >
      {/* Priority + Entity */}
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border', priority.color, priority.bg, priority.border)}>
          {priority.label}
        </span>
        {task.entityType && (
          <span className="text-[9px] text-muted-foreground font-semibold uppercase flex items-center gap-0.5">
            <Link2 className="h-2.5 w-2.5" />
            {ENTITY_LABELS[task.entityType]}
          </span>
        )}
      </div>

      {/* Title */}
      <p className={cn('text-xs font-semibold leading-snug text-foreground', task.status === 'DONE' && 'line-through text-muted-foreground')}>
        {task.title}
      </p>

      {/* Due date + Assignee */}
      <div className="flex items-center justify-between gap-2 mt-0.5">
        {task.dueDate ? (
          <span className={cn('text-[9px] font-semibold flex items-center gap-1', overdue ? 'text-rose-400' : 'text-muted-foreground')}>
            <Calendar className="h-2.5 w-2.5" />
            {new Date(task.dueDate).toLocaleDateString()}
            {overdue && ' ⚠'}
          </span>
        ) : (
          <span />
        )}

        {task.assignedTo && (
          <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[8px] font-black flex items-center justify-center shrink-0">
            {task.assignedTo.firstName[0]}{task.assignedTo.lastName[0]}
          </div>
        )}
      </div>

      {/* Quick advance button */}
      {hasWrite && next && (
        <button
          onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, next); }}
          className="mt-1 w-full text-[9px] font-bold text-muted-foreground hover:text-foreground border border-border/20 rounded-lg py-1 hover:bg-accent/20 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
        >
          Move → {STATUSES.find((s) => s.key === next)?.label}
        </button>
      )}
    </div>
  );
}
