import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, ProjectOnboarding, ProjectStatus } from '@services/projects-api';
import { toast } from '@utils/toast';
import { cn } from '@utils/cn';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { X, Trash2, Clock, Square, CheckSquare, Loader2, Plus } from 'lucide-react';

interface IProjectDetailsDrawerProps {
  project: ProjectOnboarding;
  users: any[];
  hasWriteAccess: boolean;
  onClose: () => void;
}

export const ProjectDetailsDrawer: React.FC<IProjectDetailsDrawerProps> = ({ project, users, hasWriteAccess, onClose }) => {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  // Edit fields
  const [name, setName] = useState(project.name);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [templateType, setTemplateType] = useState(project.templateType);
  const [targetStartDate, setTargetStartDate] = useState(
    project.targetStartDate ? project.targetStartDate.split('T')[0] : ''
  );
  const [assignedManagerId, setAssignedManagerId] = useState(project.assignedManagerId || '');

  // Milestone check list states
  const [milestones, setMilestones] = useState(project.milestones);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  // Update Project Mutation
  const updateProjectMutation = useMutation({
    mutationFn: (payload: any) => projectsApi.update(project.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      toast.success('Project details updated successfully');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update project';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  // Milestone Mutations
  const toggleMilestoneMutation = useMutation({
    mutationFn: (params: { milestoneId: string; completed: boolean }) =>
      projectsApi.updateMilestone(project.id, params.milestoneId, { completed: params.completed }),
    onSuccess: (updated) => {
      setMilestones(milestones.map((m) => (m.id === updated.id ? updated : m)));
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to toggle milestone';
      toast.error(msg);
    },
  });

  const createMilestoneMutation = useMutation({
    mutationFn: (title: string) => projectsApi.createMilestone(project.id, { title }),
    onSuccess: (newMilestone) => {
      setMilestones([...milestones, newMilestone]);
      setNewMilestoneTitle('');
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      toast.success('Task milestone added');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to create task';
      toast.error(msg);
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: (milestoneId: string) => projectsApi.deleteMilestone(project.id, milestoneId),
    onSuccess: (_, deletedId) => {
      setMilestones(milestones.filter((m) => m.id !== deletedId));
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      toast.success('Task milestone removed');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to delete task';
      toast.error(msg);
    },
  });

  const handleSaveProject = async () => {
    setIsUpdating(true);
    await updateProjectMutation.mutateAsync({
      name,
      status,
      templateType,
      targetStartDate: new Date(targetStartDate).toISOString(),
      assignedManagerId: assignedManagerId || null,
    });
    setIsUpdating(false);
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;
    createMilestoneMutation.mutate(newMilestoneTitle);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-xs cursor-pointer" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative w-full max-w-xl bg-background border-l border-border/25 shadow-2xl flex flex-col h-full z-10 glass-card animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/25 flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-sm font-black text-foreground">Workspace Pipeline Details</h3>
            <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">{project.opportunity.name}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 rounded-lg cursor-pointer">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content - Scrollable split */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* Metadata Parameters */}
          <div className="flex flex-col gap-4 border-b border-border/10 pb-5">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Delivery Onboarding Info</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Project Name *</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!hasWriteAccess}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Delivery Template</label>
                <Input
                  type="text"
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value)}
                  disabled={!hasWriteAccess}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Target Start Date</label>
                <Input
                  type="date"
                  value={targetStartDate}
                  onChange={(e) => setTargetStartDate(e.target.value)}
                  disabled={!hasWriteAccess}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assigned PM</label>
                <select
                  value={assignedManagerId}
                  onChange={(e) => setAssignedManagerId(e.target.value)}
                  disabled={!hasWriteAccess}
                  className="h-9 w-full rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Unassigned --</option>
                  {users.map((usr) => (
                    <option key={usr.id} value={usr.id}>
                      {usr.firstName} {usr.lastName} ({usr.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Onboarding State</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  disabled={!hasWriteAccess}
                  className="h-9 w-full rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer"
                >
                  <option value="IN_PROGRESS">IN_PROGRESS (Active)</option>
                  <option value="SUSPENDED">SUSPENDED (Blocked)</option>
                  <option value="COMPLETED">COMPLETED (Delivered)</option>
                </select>
              </div>
            </div>

            {hasWriteAccess && (
              <Button onClick={handleSaveProject} disabled={isUpdating} className="w-full mt-2 gap-2" size="sm">
                {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Details
              </Button>
            )}
          </div>

          {/* Interactive Checklists */}
          <div className="flex flex-col gap-4">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Onboarding Checklist Milestones
            </h4>

            {/* Checklist tasks */}
            <div className="flex flex-col gap-3">
              {milestones.length === 0 ? (
                <span className="text-xs text-muted-foreground italic pl-1">No milestones added yet.</span>
              ) : (
                milestones.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 border border-border/10 rounded-xl bg-card/5 gap-3 group">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (hasWriteAccess) {
                            toggleMilestoneMutation.mutate({ milestoneId: m.id, completed: !m.completed });
                          }
                        }}
                        disabled={toggleMilestoneMutation.isPending || !hasWriteAccess}
                        className="text-muted-foreground hover:text-primary transition-colors shrink-0 disabled:opacity-50"
                      >
                        {m.completed ? (
                          <CheckSquare className="h-5 w-5 text-primary" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>

                      <div className="flex flex-col">
                        <span className={cn('text-xs font-semibold', m.completed && 'line-through text-muted-foreground')}>
                          {m.title}
                        </span>
                        {m.completed && m.completedAt && (
                          <span className="text-[9px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-2.5 w-2.5" /> Completed on {new Date(m.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {hasWriteAccess && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Delete this task milestone?')) {
                            deleteMilestoneMutation.mutate(m.id);
                          }
                        }}
                        className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add custom milestone form */}
            {hasWriteAccess && (
              <form onSubmit={handleAddMilestone} className="flex items-center gap-2 mt-2">
                <Input
                  type="text"
                  placeholder="e.g. Schedule team introduction"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={createMilestoneMutation.isPending} size="sm" className="shrink-0 gap-1 font-bold">
                  <Plus className="h-4 w-4" />
                  Add Task
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
