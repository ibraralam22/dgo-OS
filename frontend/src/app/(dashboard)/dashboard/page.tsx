'use client';

import React from 'react';
import { useAuthStore } from '../../../store/auth-store';
import { ShieldCheck, Sparkles, LayoutDashboard, Users, CreditCard, Layers } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome Banner */}
      <div className="glass-card rounded-2xl p-8 relative overflow-hidden flex flex-col gap-3 shadow-lg shadow-black/20">
        <div className="absolute top-[-20%] right-[-10%] h-56 w-56 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
          <Sparkles className="h-4 w-4" />
          SYSTEM BOOT COMPLETED
        </div>
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
          Welcome back, {user ? user.firstName : 'User'}!
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
          The Decent Global Outsourcing enterprise foundation is successfully initialized. 
          Use the role-based selector links in the sidebar to review directories and portal settings.
        </p>
      </div>

      {/* Grid Status Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Workspace Tenant</span>
            <span className="text-sm font-bold text-foreground mt-0.5">Active</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Role Assigned</span>
            <span className="text-sm font-bold text-foreground mt-0.5">{user ? user.role : 'Guest'}</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Stripe Webhooks</span>
            <span className="text-sm font-bold text-foreground mt-0.5">Idempotency Guard Active</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
            <Layers className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Database Mode</span>
            <span className="text-sm font-bold text-foreground mt-0.5">PostgreSQL + RLS</span>
          </div>
        </div>
      </div>

      {/* Security Profile Info Box */}
      <div className="glass-card rounded-xl p-6 border border-border/40">
        <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-foreground">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Security Access Control Context
        </h3>
        <div className="flex flex-col gap-3.5 text-xs text-muted-foreground">
          <div className="flex items-center justify-between border-b border-border/20 pb-2">
            <span className="font-semibold">User Authentication</span>
            <span className="text-foreground">JWT Stateless Access + Cookie Refresh Family</span>
          </div>
          <div className="flex items-center justify-between border-b border-border/20 pb-2">
            <span className="font-semibold">Granular Permissions Assigned</span>
            <span className="text-foreground font-mono">
              {user ? user.permissions.join(', ') : 'None'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold">Security Level</span>
            <span className="text-foreground">Role-Based Guard (RBAC Interceptor) Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
