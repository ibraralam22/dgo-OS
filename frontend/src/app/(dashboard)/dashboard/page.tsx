'use client';

import React from 'react';
import { useAuthStore } from '@store/auth-store';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@services/dashboard-api';
import { Sparkles, Loader2, ShieldCheck } from 'lucide-react';
import { AdminDashboard } from '@components/dashboard/admin-dashboard';
import { SalesDashboard } from '@components/dashboard/sales-dashboard';
import { ClientDashboard } from '@components/dashboard/client-dashboard';
import { ActivityLogsList } from '@components/dashboard/activity-logs-list';

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
          {isAdmin && <AdminDashboard metrics={metrics} />}
          {isSales && <SalesDashboard metrics={metrics} />}
          {isClient && <ClientDashboard metrics={metrics} />}
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
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>Assigned Target Conversion</span>
                    <span className="text-foreground">{metrics.leads?.conversionRate}</span>
                  </div>
                  <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: '18.2%' }} />
                  </div>
                </div>
              )}

              {isClient && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>Ticket Resolution Ratio (Current Period)</span>
                    <span className="text-foreground">87.5%</span>
                  </div>
                  <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '87.5%' }} />
                  </div>
                </div>
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
        <ActivityLogsList activityLogs={activityLogs} isActivityLoading={isActivityLoading} />
      )}
    </div>
  );
}
