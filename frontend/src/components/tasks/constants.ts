import React from 'react';
import { Task, TaskStatus, TaskPriority } from '@services/tasks-api';
import { Circle, PlayCircle, CheckCircle2, Ban } from 'lucide-react';

export const STATUSES: {
  key: TaskStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
  border: string;
  bg: string;
}[] = [
  { key: 'TODO', label: 'To Do', icon: React.createElement(Circle, { className: 'h-3.5 w-3.5' }), color: 'text-slate-400', border: 'border-slate-500/20', bg: 'bg-slate-500/5' },
  { key: 'IN_PROGRESS', label: 'In Progress', icon: React.createElement(PlayCircle, { className: 'h-3.5 w-3.5' }), color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/5' },
  { key: 'DONE', label: 'Done', icon: React.createElement(CheckCircle2, { className: 'h-3.5 w-3.5' }), color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
  { key: 'CANCELLED', label: 'Cancelled', icon: React.createElement(Ban, { className: 'h-3.5 w-3.5' }), color: 'text-rose-400', border: 'border-rose-500/20', bg: 'bg-rose-500/5' },
];

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string; border: string }> = {
  LOW:    { label: 'Low',    color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20' },
  MEDIUM: { label: 'Medium', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  HIGH:   { label: 'High',   color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20' },
  URGENT: { label: 'Urgent', color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20' },
};

export const ENTITY_LABELS: Record<string, string> = {
  lead: 'Lead',
  account: 'Account',
  opportunity: 'Deal',
  project: 'Project',
};

export function isOverdue(task: Task) {
  return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' && task.status !== 'CANCELLED';
}
