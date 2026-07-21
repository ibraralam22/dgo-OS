'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, ProjectOnboarding } from '@services/projects-api';
import { usersApi } from '@services/users-api';
import { useAuthStore } from '@store/auth-store';
import { useDebounce } from '@hooks/use-debounce';
import { toast } from '@utils/toast';
import {
  Briefcase,
  Search,
  Loader2,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { cn } from '@utils/cn';
import { ProjectDetailsDrawer } from '@components/projects/project-details-drawer';

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Search & Filtering States
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<ProjectOnboarding | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // Queries
  const { data: projectsResponse, isLoading } = useQuery({
    queryKey: ['projects-list', page, debouncedSearch, selectedStatus, selectedManager],
    queryFn: () =>
      projectsApi.list({
        page,
        limit: 15,
        search: debouncedSearch || undefined,
        status: selectedStatus || undefined,
        managerId: selectedManager || undefined,
      }),
  });

  const { data: usersResponse } = useQuery({
    queryKey: ['users-dropdown-list'],
    queryFn: () => usersApi.list({ page: 1, limit: 100 }),
  });

  const projects = projectsResponse?.data || [];
  const totalProjectsCount = projectsResponse?.total || 0;
  const usersList = usersResponse?.data || [];

  // Project Mutation Actions
  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      toast.success('Project archived successfully');
      setSelectedProject(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to delete project';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  const hasWriteAccess = user?.permissions.includes('projects:write') ?? false;

  // Calculators for KPIs
  const activeCount = projects.filter((p) => p.status === 'IN_PROGRESS').length;
  const completedCount = projects.filter((p) => p.status === 'COMPLETED').length;
  const suspendedCount = projects.filter((p) => p.status === 'SUSPENDED').length;

  return (
    <div className="flex flex-col gap-6 text-foreground pb-12 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground">Project Pods & Onboarding</h1>
        <p className="text-xs text-muted-foreground">
          Manage delivery client onboarding pipelines, checklists, and resource managers.
        </p>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card border border-border/25 rounded-2xl p-5 bg-card/30 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Pipelines</span>
            <span className="text-2xl font-black text-foreground mt-0.5">{totalProjectsCount}</span>
          </div>
          <Briefcase className="h-8 w-8 text-primary/40 shrink-0" />
        </div>

        <div className="glass-card border border-border/25 rounded-2xl p-5 bg-card/30 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Setup</span>
            <span className="text-2xl font-black text-blue-400 mt-0.5">{activeCount}</span>
          </div>
          <PlayCircle className="h-8 w-8 text-blue-500/30 shrink-0" />
        </div>

        <div className="glass-card border border-border/25 rounded-2xl p-5 bg-card/30 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Completed Deliveries</span>
            <span className="text-2xl font-black text-emerald-400 mt-0.5">{completedCount}</span>
          </div>
          <CheckCircle2 className="h-8 w-8 text-emerald-500/30 shrink-0" />
        </div>

        <div className="glass-card border border-border/25 rounded-2xl p-5 bg-card/30 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Blocked / Suspended</span>
            <span className="text-2xl font-black text-amber-400 mt-0.5">{suspendedCount}</span>
          </div>
          <AlertTriangle className="h-8 w-8 text-amber-500/30 shrink-0" />
        </div>
      </div>

      {/* Filter Options */}
      <div className="glass-card border border-border/25 rounded-2xl p-4 bg-card/30 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search onboarding projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer w-full md:w-44 text-muted-foreground"
          >
            <option value="">-- All Statuses --</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>

          {/* Manager filter */}
          <select
            value={selectedManager}
            onChange={(e) => setSelectedManager(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer w-full md:w-48 text-muted-foreground"
          >
            <option value="">-- All Project Managers --</option>
            {usersList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Table */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Retrieving project delivery records...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="h-64 border border-dashed border-border/20 rounded-2xl flex flex-col items-center justify-center gap-3 text-muted-foreground bg-card/5">
          <Briefcase className="h-8 w-8 text-muted-foreground/45 animate-pulse" />
          <span className="text-xs font-medium">No active onboarding project pods found</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/20 bg-card/20 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/20 bg-muted/20 text-muted-foreground font-black uppercase tracking-wider select-none">
                <th className="px-5 py-3">Project Title</th>
                <th className="px-5 py-3">Delivery Template</th>
                <th className="px-5 py-3">Client Account</th>
                <th className="px-5 py-3">Assigned Manager</th>
                <th className="px-5 py-3">Milestone Progress</th>
                <th className="px-5 py-3">Onboarding Status</th>
                {hasWriteAccess && <th className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10 font-medium">
              {projects.map((proj) => {
                const totalMilestones = proj.milestones.length;
                const completedMilestones = proj.milestones.filter((m) => m.completed).length;
                const progressPercentage = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

                return (
                  <tr
                    key={proj.id}
                    onClick={() => setSelectedProject(proj)}
                    className="hover:bg-accent/10 transition-colors cursor-pointer animate-in fade-in duration-100"
                  >
                    <td className="px-5 py-4">
                      <span className="font-extrabold text-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                        {proj.name}
                        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 opacity-40 group-hover:opacity-100" />
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold px-2 py-0.5 rounded border border-border bg-card text-[10px] text-muted-foreground">
                        {proj.templateType}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-foreground">
                        {proj.opportunity.account.name}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {proj.assignedManager ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-[9px]">
                            {proj.assignedManager.firstName[0]}
                            {proj.assignedManager.lastName[0]}
                          </div>
                          <span>
                            {proj.assignedManager.firstName} {proj.assignedManager.lastName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 font-semibold italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3 w-36">
                        <div className="h-1.5 w-full bg-muted border border-border/10 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all duration-300',
                              progressPercentage === 100 ? 'bg-emerald-500' : 'bg-primary'
                            )}
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black tracking-tighter text-foreground shrink-0 w-8">
                          {progressPercentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-black uppercase border',
                          proj.status === 'COMPLETED' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                          proj.status === 'IN_PROGRESS' && 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                          proj.status === 'SUSPENDED' && 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        )}
                      >
                        {proj.status}
                      </span>
                    </td>
                    {hasWriteAccess && (
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to archive this project onboarding?')) {
                              deleteProjectMutation.mutate(proj.id);
                            }
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          Archive
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Project Details Sidebar Drawer */}
      {selectedProject && (
        <ProjectDetailsDrawer
          project={selectedProject}
          users={usersList}
          hasWriteAccess={hasWriteAccess}
          onClose={() => {
            setSelectedProject(null);
            queryClient.invalidateQueries({ queryKey: ['projects-list'] });
          }}
        />
      )}
    </div>
  );
}
