import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, Task, TaskStatus, TaskPriority } from '@services/tasks-api';
import { toast } from '@utils/toast';
import { cn } from '@utils/cn';
import { STATUSES, PRIORITY_CONFIG, ENTITY_LABELS, isOverdue } from './constants';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { X, Link2, AlertTriangle, CheckCircle2, Trash2, Loader2 } from 'lucide-react';

interface ITaskDrawerProps {
  task: Task;
  users: any[];
  hasWrite: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

export const TaskDrawer: React.FC<ITaskDrawerProps> = ({
  task,
  users,
  hasWrite,
  onClose,
  onDelete,
  onStatusChange,
}) => {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.split('T')[0] : '');
  const [assignedToId, setAssignedToId] = useState(task.assignedToId || '');

  const updateMutation = useMutation({
    mutationFn: (data: any) => tasksApi.update(task.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      queryClient.invalidateQueries({ queryKey: ['task-kpis'] });
      toast.success('Task updated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update task'),
  });

  const handleSave = async () => {
    setIsSaving(true);
    await updateMutation.mutateAsync({
      title,
      description: description || undefined,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      assignedToId: assignedToId || null,
    });
    setIsSaving(false);
  };

  const statusTransitions: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'TODO' as TaskStatus, label: 'To Do', color: 'border-slate-500/30 text-slate-400 hover:bg-slate-500/10' },
    { status: 'IN_PROGRESS' as TaskStatus, label: 'In Progress', color: 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10' },
    { status: 'DONE' as TaskStatus, label: 'Mark Done', color: 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' },
    { status: 'CANCELLED' as TaskStatus, label: 'Cancel', color: 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10' },
  ].filter((t) => t.status !== task.status);

  const priority_cfg = PRIORITY_CONFIG[priority];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-xs cursor-pointer" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-background border-l border-border/25 shadow-2xl flex flex-col h-full z-10 glass-card animate-in slide-in-from-right duration-200">

        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-border/25 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn('text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0', priority_cfg.color, priority_cfg.bg, priority_cfg.border)}>
                {priority_cfg.label}
              </span>
              {task.entityType && (
                <span className="text-[9px] text-muted-foreground font-semibold uppercase flex items-center gap-1 shrink-0">
                  <Link2 className="h-2.5 w-2.5" />
                  {ENTITY_LABELS[task.entityType]}
                </span>
              )}
              {isOverdue(task) && (
                <span className="text-[9px] text-rose-400 font-black uppercase flex items-center gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" /> Overdue
                </span>
              )}
            </div>
            <h3 className="text-sm font-black text-foreground truncate">{task.title}</h3>
            <p className="text-[10px] text-muted-foreground">
              Created by {task.createdBy.firstName} {task.createdBy.lastName} · {new Date(task.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 rounded-lg shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Status Transitions */}
        <div className="px-6 py-3 border-b border-border/10 flex gap-2 flex-wrap">
          {statusTransitions.map((t) => (
            <button
              key={t.status}
              onClick={() => onStatusChange(task.id, t.status)}
              className={cn('text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer', t.color)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

          {/* Edit Fields */}
          <div className="flex flex-col gap-4">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Task Details</h4>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!hasWrite} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!hasWrite}
                rows={4}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                placeholder="Add context or notes..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  disabled={!hasWrite}
                  className="h-9 w-full rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Due Date</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!hasWrite} />
              </div>

              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assigned To</label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  disabled={!hasWrite}
                  className="h-9 w-full rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer"
                >
                  <option value="">— Unassigned —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Entity link info (read-only) */}
            {task.entityType && (
              <div className="p-3 rounded-xl border border-border/20 bg-muted/5 flex items-center gap-3">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Linked Entity</span>
                  <span className="text-xs font-semibold text-foreground mt-0.5">
                    {ENTITY_LABELS[task.entityType]} · <span className="text-muted-foreground font-mono text-[9px]">{task.entityId}</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {hasWrite && (
            <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2" size="sm">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          )}

          {/* Completion stamp */}
          {task.completedAt && (
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completed on {new Date(task.completedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Footer — Delete */}
        {hasWrite && (
          <div className="px-6 py-4 border-t border-border/15">
            <button
              onClick={() => {
                if (confirm('Archive this task? This action cannot be undone.')) {
                  onDelete(task.id);
                }
              }}
              className="w-full flex items-center justify-center gap-2 text-[10px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2 rounded-lg border border-red-500/20 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Archive Task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
