'use client';

import React from 'react';
import { useAuthStore } from '@store/auth-store';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, AuditLogItem } from '@services/dashboard-api';
import {
  ShieldCheck,
  Sparkles,
  Users,
  TrendingUp,
  Coins,
  Ticket,
  Activity,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: metrics, isLoading: isMetricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => dashboardApi.getMetrics(),
  });

  const hasIamRead = user?.permissions.includes('iam:read') ?? false;

  const { data: activityLogs, isLoading: isActivityLoading } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => dashboardApi.getActivity(),
    enabled: hasIamRead,
  });

  const getActionLabel = (log: AuditLogItem) => {
    const userName = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System';
    const targetName = log.payloadAfter?.name || log.payloadAfter?.email || log.resourceId || '';

    switch (log.action) {
      case 'role.create':
        return `${userName} created role "${targetName}"`;
      case 'role.update':
        return `${userName} updated role "${targetName}"`;
      case 'role.delete':
        return `${userName} deleted role "${targetName}"`;
      case 'user.create':
        return `${userName} invited user "${targetName}"`;
      case 'user.update':
        return `${userName} updated profile of "${targetName}"`;
      case 'user.role_change':
        return `${userName} updated roles configuration for "${targetName}"`;
      case 'user.remove':
        return `${userName} removed user "${targetName}"`;
      case 'auth.login':
        return `${userName} logged in successfully`;
      case 'auth.compromise_detected':
        return `Security compromise alert: duplicate refresh token rotation detected`;
      default:
        return `${userName} performed action "${log.action}" on "${log.resourceName}"`;
    }
  };

  const userRole = metrics?.role || user?.role || 'Guest';
  const isAdmin = userRole === 'SuperAdmin' || userRole === 'TenantAdmin';
  const isSales = userRole === 'SalesRepresentative';
  const isClient = userRole === 'ClientContact';

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome Banner */}
      <div className="glass-card rounded-2xl p-8 relative overflow-hidden flex flex-col gap-3 shadow-lg shadow-black/20">
        <div className="absolute top-[-20%] right-[-10%] h-56 w-56 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
          <Sparkles className="h-4 w-4" />
          DGO CRM ANALYTICS SYSTEM
        </div>
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
          Welcome back, {user ? user.firstName : 'User'}!
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
          Here is your role-tailored workspace summary for today. Explore active metrics, customer relations pipelines, and security profiles.
        </p>
      </div>

      {/* Loading Overlay */}
      {isMetricsLoading && (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
          <span className="text-sm text-muted-foreground">Loading dashboard analytics...</span>
        </div>
      )}

      {/* Dashboard KPI Grid based on role */}
      {!isMetricsLoading && metrics && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* 1. ADMIN DASHBOARD */}
          {isAdmin && (
            <>
              {/* User count */}
              <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
                <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary shadow-inner">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active Users</span>
                  <span className="text-2xl font-extrabold text-foreground mt-0.5">
                    {metrics.userCount ?? 0}
                  </span>
                </div>
              </div>

              {/* Leads */}
              <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
                <div className="h-10 w-10 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Leads</span>
                  <span className="text-2xl font-extrabold text-foreground mt-0.5">
                    {metrics.leads?.total ?? 0}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                    {metrics.leads?.growth} growth ({metrics.leads?.conversionRate} conv.)
                  </span>
                </div>
              </div>

              {/* Pipeline deals value */}
              <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
                <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
                  <Coins className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Pipeline Value</span>
                  <span className="text-2xl font-extrabold text-foreground mt-0.5">
                    {metrics.pipeline?.value}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                    {metrics.pipeline?.deals} deals in progress
                  </span>
                </div>
              </div>

              {/* Support Tickets */}
              <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <Ticket className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Support Desk</span>
                  <span className="text-2xl font-extrabold text-foreground mt-0.5">
                    {metrics.tickets?.open} Open
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                    {metrics.tickets?.resolved} resolved tickets
                  </span>
                </div>
              </div>
            </>
          )}

          {/* 2. SALES REPRESENTATIVE DASHBOARD */}
          {isSales && (
            <>
              {/* Leads */}
              <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300 col-span-1 sm:col-span-2 lg:col-span-1">
                <div className="h-10 w-10 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Assigned Leads</span>
                  <span className="text-2xl font-extrabold text-foreground mt-0.5">
                    {metrics.leads?.total ?? 0}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                    {metrics.leads?.conversionRate} Conversion Rate
                  </span>
                </div>
              </div>

              {/* Pipeline Value */}
              <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
                <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
                  <Coins className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Opportunities Value</span>
                  <span className="text-2xl font-extrabold text-foreground mt-0.5">
                    {metrics.pipeline?.value}
                  </span>
                </div>
              </div>

              {/* Pipeline Deals count */}
              <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
                <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active Deals</span>
                  <span className="text-2xl font-extrabold text-foreground mt-0.5">
                    {metrics.pipeline?.deals} Deals
                  </span>
                </div>
              </div>
            </>
          )}

          {/* 3. CLIENT CONTACT DASHBOARD */}
          {isClient && (
            <>
              {/* Open Tickets */}
              <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300 col-span-1 sm:col-span-2 lg:col-span-1">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <Ticket className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">My Open Tickets</span>
                  <span className="text-2xl font-extrabold text-foreground mt-0.5">
                    {metrics.tickets?.open} Tickets
                  </span>
                </div>
              </div>

              {/* Resolved Tickets */}
              <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
                <div className="h-10 w-10 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Resolved Tickets</span>
                  <span className="text-2xl font-extrabold text-foreground mt-0.5">
                    {metrics.tickets?.resolved} Tickets
                  </span>
                </div>
              </div>

              {/* SLA compliance */}
              <div className="glass-card rounded-xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
                <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">SLA Met Rate</span>
                  <span className="text-2xl font-extrabold text-foreground mt-0.5">
                    {metrics.tickets?.slaStatus}
                  </span>
                </div>
              </div>
            </>
          )}

        </div>
      )}

      {/* Visual Analytics Mini-Graphs Section */}
      {!isMetricsLoading && metrics && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* CRM pipeline / Tickets Progress Bar Panel */}
          <div className="glass-card rounded-xl p-6 flex flex-col gap-6">
            <div>
              <h3 className="text-base font-bold text-foreground">Operational Capacity Summary</h3>
              <p className="text-xs text-muted-foreground mt-1">Live allocation status for the current workspace tenant.</p>
            </div>
            
            <div className="flex flex-col gap-4">
              {/* Row 1 */}
              {isAdmin && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Lead Conversion Funnel</span>
                      <span className="text-foreground">{metrics.leads?.conversionRate} achieved</span>
                    </div>
                    <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: '24.5%' }} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Service Desk SLA Rates</span>
                      <span className="text-foreground">94.8% SLA Target Met</span>
                    </div>
                    <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: '94.8%' }} />
                    </div>
                  </div>
                </>
              )}

              {isSales && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Assigned Target Conversion</span>
                      <span className="text-foreground">{metrics.leads?.conversionRate}</span>
                    </div>
                    <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: '18.2%' }} />
                    </div>
                  </div>
                </>
              )}

              {isClient && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Ticket Resolution Ratio (Current Period)</span>
                      <span className="text-foreground">87.5%</span>
                    </div>
                    <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '87.5%' }} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Security profile context box */}
          <div className="glass-card rounded-xl p-6 flex flex-col gap-4">
            <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Security Access Control Context
            </h3>
            <div className="flex flex-col gap-3.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between border-b border-border/20 pb-2">
                <span className="font-semibold">User Authentication</span>
                <span className="text-foreground">Stateless JWT + Rotation cookie</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/20 pb-2 col-span-2">
                <span className="font-semibold">Permissions Assigned</span>
                <span className="text-foreground font-mono truncate max-w-[200px]" title={user?.permissions.join(', ') || 'None'}>
                  {user && user.permissions.length > 0 ? user.permissions.join(', ') : 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Security Clearance Level</span>
                <span className="text-foreground font-bold">{userRole}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Timeline Feed (Only for admins/managers) */}
      {!isMetricsLoading && hasIamRead && (
        <div className="glass-card rounded-xl p-6 border border-border/40">
          <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-foreground">
            <Activity className="h-5 w-5 text-primary" />
            Recent Security & Administrative Activity
          </h3>

          {isActivityLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading activity logs...
            </div>
          )}

          {!isActivityLoading && activityLogs && activityLogs.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border border-dashed border-border rounded-lg">
              <AlertCircle className="h-4 w-4" />
              No audit logs have been recorded in this organization workspace yet.
            </div>
          )}

          {!isActivityLoading && activityLogs && activityLogs.length > 0 && (
            <div className="relative border-l border-border/30 ml-3 pl-6 space-y-6">
              {activityLogs.map((log) => (
                <div key={log.id} className="relative group">
                  {/* Dot */}
                  <div className="absolute -left-[30px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background shadow shadow-primary/20 group-hover:scale-110 transition-transform" />
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-foreground">
                      {getActionLabel(log)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {new Date(log.createdAt).toLocaleString()}
                      {log.ipAddress && ` • IP: ${log.ipAddress}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
