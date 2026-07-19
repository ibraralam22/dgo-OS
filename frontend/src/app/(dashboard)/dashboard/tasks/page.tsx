'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, Task, TaskStatus, TaskPriority, TaskEntityType, CreateTaskInput } from '@services/tasks-api';
import { usersApi } from '@services/users-api';
import { useAuthStore } from '@store/auth-store';
import { useDebounce } from '@hooks/use-debounce';
import { toast } from '@utils/toast';
import { cn } from '@utils/cn';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import {
  CheckSquare,
  Plus,
  Search,
  Loader2,
  X,
  Trash2,
  AlertTriangle,
  Clock,
  User,
  Flag,
  LayoutGrid,
  List,
  ChevronRight,
  CheckCircle2,
  Circle,
  PlayCircle,
  Ban,
  Calendar,
  Link2,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUSES: { key: TaskStatus; label: string; icon: React.ReactNode; color: string; border: string; bg: string }[] = [
  { key: 'TODO', label: 'To Do', icon: <Circle className="h-3.5 w-3.5" />, color: 'text-slate-400', border: 'border-slate-500/20', bg: 'bg-slate-500/5' },
  { key: 'IN_PROGRESS', label: 'In Progress', icon: <PlayCircle className="h-3.5 w-3.5" />, color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/5' },
  { key: 'DONE', label: 'Done', icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
  { key: 'CANCELLED', label: 'Cancelled', icon: <Ban className="h-3.5 w-3.5" />, color: 'text-rose-400', border: 'border-rose-500/20', bg: 'bg-rose-500/5' },
];

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string; border: string }> = {
  LOW:    { label: 'Low',    color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20' },
  MEDIUM: { label: 'Medium', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  HIGH:   { label: 'High',   color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20' },
  URGENT: { label: 'Urgent', color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20' },
};

const ENTITY_LABELS: Record<string, string> = {
  lead: 'Lead',
  account: 'Account',
  opportunity: 'Deal',
  project: 'Project',
};

function isOverdue(task: Task) {
  return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' && task.status !== 'CANCELLED';
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 300);

  // Selected task for drawer / new task modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Queries
  const { data: kpis } = useQuery({
    queryKey: ['task-kpis'],
    queryFn: () => tasksApi.kpis(),
    staleTime: 30_000,
  });

  const { data: tasksResponse, isLoading } = useQuery({
    queryKey: ['tasks-list', page, debouncedSearch, filterStatus, filterPriority, filterAssignee, onlyMyTasks],
    queryFn: () =>
      tasksApi.list({
        page,
        limit: 200,
        search: debouncedSearch || undefined,
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        assignedToId: onlyMyTasks ? user?.id : filterAssignee || undefined,
      }),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-dropdown-list'],
    queryFn: () => usersApi.list({ page: 1, limit: 100 }),
  });

  const tasks = tasksResponse?.data || [];
  const users = usersData?.data || [];
  const hasWrite = user?.permissions?.includes('tasks:write') ?? false;

  // Group for kanban
  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [], CANCELLED: [] };
    tasks.forEach((t) => map[t.status]?.push(t));
    return map;
  }, [tasks]);

  // Mutations
  const patchStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => tasksApi.patchStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      queryClient.invalidateQueries({ queryKey: ['task-kpis'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update status'),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      queryClient.invalidateQueries({ queryKey: ['task-kpis'] });
      toast.success('Task archived');
      setSelectedTask(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete task'),
  });

  return (
    <div className="flex flex-col gap-6 pb-12 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black tracking-tight text-foreground">Task Manager</h1>
          <p className="text-xs text-muted-foreground">Create, assign, and track tasks across leads, deals, and projects.</p>
        </div>
        {hasWrite && (
          <Button onClick={() => setIsCreating(true)} className="gap-2 shrink-0" size="sm">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Open Tasks', value: kpis?.total ?? '—', icon: <CheckSquare className="h-6 w-6 text-primary/40" />, color: 'text-foreground' },
          { label: 'Overdue', value: kpis?.overdue ?? '—', icon: <AlertTriangle className="h-6 w-6 text-rose-500/40" />, color: 'text-rose-400' },
          { label: 'Completed Today', value: kpis?.completedToday ?? '—', icon: <CheckCircle2 className="h-6 w-6 text-emerald-500/40" />, color: 'text-emerald-400' },
          { label: 'High / Urgent', value: kpis?.urgentHigh ?? '—', icon: <Flag className="h-6 w-6 text-orange-500/40" />, color: 'text-orange-400' },
          { label: 'My Open Tasks', value: kpis?.myOpen ?? '—', icon: <User className="h-6 w-6 text-blue-500/40" />, color: 'text-blue-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card border border-border/25 rounded-2xl p-4 bg-card/30 flex items-center justify-between shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{kpi.label}</span>
              <span className={cn('text-2xl font-black mt-1', kpi.color)}>{kpi.value}</span>
            </div>
            {kpi.icon}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="glass-card border border-border/25 rounded-2xl p-4 bg-card/30 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer text-muted-foreground w-36"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer text-muted-foreground w-36"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer text-muted-foreground w-40"
          >
            <option value="">All Assignees</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
          </select>

          <button
            onClick={() => setOnlyMyTasks(!onlyMyTasks)}
            className={cn(
              'h-9 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer',
              onlyMyTasks
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            My Tasks
          </button>

          {/* View toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn('h-9 px-3 transition-colors cursor-pointer', viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn('h-9 px-3 transition-colors cursor-pointer', viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent')}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading tasks...</span>
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          grouped={grouped}
          hasWrite={hasWrite}
          onSelect={setSelectedTask}
          onStatusChange={(id, status) => patchStatusMutation.mutate({ id, status })}
        />
      ) : (
        <TableView
          tasks={tasks}
          hasWrite={hasWrite}
          onSelect={setSelectedTask}
          onStatusChange={(id, status) => patchStatusMutation.mutate({ id, status })}
        />
      )}

      {/* Task Detail Drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          users={users}
          hasWrite={hasWrite}
          onClose={() => {
            setSelectedTask(null);
            queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
            queryClient.invalidateQueries({ queryKey: ['task-kpis'] });
          }}
          onDelete={(id) => deleteTaskMutation.mutate(id)}
          onStatusChange={(id, status) => {
            patchStatusMutation.mutate({ id, status });
            setSelectedTask((prev) => prev ? { ...prev, status } : null);
          }}
        />
      )}

      {/* Create Task Modal */}
      {isCreating && (
        <CreateTaskModal
          users={users}
          onClose={() => setIsCreating(false)}
          onCreated={() => {
            setIsCreating(false);
            queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
            queryClient.invalidateQueries({ queryKey: ['task-kpis'] });
            toast.success('Task created successfully');
          }}
        />
      )}
    </div>
  );
}

// ─── Kanban Board ────────────────────────────────────────────────────────────

function KanbanBoard({
  grouped,
  hasWrite,
  onSelect,
  onStatusChange,
}: {
  grouped: Record<TaskStatus, Task[]>;
  hasWrite: boolean;
  onSelect: (t: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}) {
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

// ─── Task Card ───────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onSelect,
  onStatusChange,
  hasWrite,
}: {
  task: Task;
  hasWrite: boolean;
  onSelect: (t: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}) {
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

// ─── Table View ──────────────────────────────────────────────────────────────

function TableView({
  tasks,
  hasWrite,
  onSelect,
  onStatusChange,
}: {
  tasks: Task[];
  hasWrite: boolean;
  onSelect: (t: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}) {
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

// ─── Task Detail Drawer ──────────────────────────────────────────────────────

function TaskDrawer({
  task,
  users,
  hasWrite,
  onClose,
  onDelete,
  onStatusChange,
}: {
  task: Task;
  users: any[];
  hasWrite: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}) {
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

// ─── Create Task Modal ────────────────────────────────────────────────────────

function CreateTaskModal({
  users,
  onClose,
  onCreated,
}: {
  users: any[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [entityType, setEntityType] = useState<TaskEntityType | ''>('');
  const [entityId, setEntityId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      const payload: CreateTaskInput = {
        title,
        description: description || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        assignedToId: assignedToId || undefined,
        entityType: entityType ? (entityType as TaskEntityType) : undefined,
        entityId: (entityType && entityId) ? entityId : undefined,
      };
      await tasksApi.create(payload);
      onCreated();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create task';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md glass-card bg-background border border-border/30 rounded-2xl shadow-2xl z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/20">
          <h3 className="text-sm font-black text-foreground">Create New Task</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 rounded-lg">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Task Title *</label>
            <Input
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Send follow-up email to Acme Corp"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Optional context or notes..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
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
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Link to Entity</label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as TaskEntityType | '')}
                className="h-9 w-full rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer"
              >
                <option value="">None</option>
                <option value="lead">Lead</option>
                <option value="account">Account</option>
                <option value="opportunity">Deal</option>
                <option value="project">Project</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assign To</label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer"
              >
                <option value="">— Unassigned —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>
          </div>

          {entityType && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Entity ID (UUID)</label>
              <Input
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="Paste the entity UUID here"
              />
            </div>
          )}

          <Button type="submit" disabled={isSubmitting || !title.trim()} className="w-full mt-2 gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Task
          </Button>
        </form>
      </div>
    </div>
  );
}
