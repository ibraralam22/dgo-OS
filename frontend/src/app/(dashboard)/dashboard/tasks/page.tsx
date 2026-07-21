'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, Task, TaskStatus } from '@services/tasks-api';
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
  AlertTriangle,
  CheckCircle2,
  Flag,
  User,
  LayoutGrid,
  List,
} from 'lucide-react';

import { STATUSES, PRIORITY_CONFIG } from '@components/tasks/constants';
import { KanbanBoard } from '@components/tasks/task-kanban';
import { TableView } from '@components/tasks/task-table';
import { TaskDrawer } from '@components/tasks/task-drawer';
import { CreateTaskModal } from '@components/tasks/create-task-modal';

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
