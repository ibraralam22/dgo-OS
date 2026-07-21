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

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Resource Utilization</span>
                      <span className="text-foreground">82% Capacity</span>
                    </div>
                    <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: '82%' }} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Active Projects</span>
                      <span className="text-foreground">15/20 In Progress</span>
                    </div>
                    <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-cyan-500 h-full rounded-full transition-all duration-1000" style={{ width: '75%' }} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Team Availability</span>
                      <span className="text-foreground">18/20 Available</span>
                    </div>
                    <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: '90%' }} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Avg Response Time</span>
                      <span className="text-foreground">2.3 mins</span>
                    </div>
                    <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: '85%' }} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Customer Satisfaction</span>
                      <span className="text-foreground">4.8/5.0 Rating</span>
                    </div>
                    <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: '96%' }} />
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

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Monthly Quota Achievement</span>
                      <span className="text-foreground">78% Complete</span>
                    </div>
                    <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: '78%' }} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Pipeline Value</span>
                      <span className="text-foreground">$325K Open</span>
                    </div>
                    <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-cyan-500 h-full rounded-full" style={{ width: '65%' }} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Call Activity This Week</span>
                      <span className="text-foreground">47 Calls</span>
                    </div>
                    <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '88%' }} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Follow-ups Pending</span>
                      <span className="text-foreground">12 Actions</span>
                    </div>
                    <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: '40%' }} />
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

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Support Queue Status</span>
                      <span className="text-foreground">4 Tickets In Queue</span>
                    </div>
                    <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: '30%' }} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Avg Support Response Time</span>
                      <span className="text-foreground">4.2 mins</span>
                    </div>
                    <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '92%' }} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Account Health Score</span>
                      <span className="text-foreground">92/100</span>
                    </div>
                    <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '92%' }} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* System Status & Quick Actions */}
          <div className="glass-card rounded-xl p-6 flex flex-col gap-6">
            <div>
              <h3 className="text-base font-bold text-foreground">System Status & Alerts</h3>
              <p className="text-xs text-muted-foreground mt-1">Real-time system health and critical actions.</p>
            </div>

            <div className="flex flex-col gap-4">
              {/* System Status Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-background/40 p-3 flex flex-col gap-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">API Status</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-500">Operational</span>
                  </div>
                </div>
                <div className="rounded-lg bg-background/40 p-3 flex flex-col gap-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Database</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-500">Healthy</span>
                  </div>
                </div>
                <div className="rounded-lg bg-background/40 p-3 flex flex-col gap-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Storage</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-semibold text-amber-500">83% Used</span>
                  </div>
                </div>
                <div className="rounded-lg bg-background/40 p-3 flex flex-col gap-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Security</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-500">Secure</span>
                  </div>
                </div>
              </div>

              {/* Active Alerts */}
              <div className="border-t border-border/30 pt-4">
                <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Active Alerts</h4>
                <div className="space-y-2">
                  <div className="rounded-lg bg-background/40 border-l-2 border-amber-500 px-3 py-2 flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">High Memory Usage Detected</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">API Server #2 - 87% utilized</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-background/40 border-l-2 border-primary px-3 py-2 flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">Maintenance Window Scheduled</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Friday 2:00 AM - 3:30 AM UTC</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="border-t border-border/30 pt-4">
                <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button className="rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold py-2 px-3 transition-colors">
                    Generate Report
                  </button>
                  <button className="rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold py-2 px-3 transition-colors">
                    Export Data
                  </button>
                  <button className="rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold py-2 px-3 transition-colors">
                    Run Backup
                  </button>
                  <button className="rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold py-2 px-3 transition-colors">
                    View Logs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Performance Metrics */}
      {!isMetricsLoading && (isAdmin || isSales) && (
        <div className="glass-card rounded-xl p-6 flex flex-col gap-4">
          <h3 className="text-base font-bold text-foreground">Team Performance Metrics</h3>
          
          {/* Team Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Team Members */}
            <div className="rounded-lg bg-background/40 p-4 flex flex-col gap-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Team Members</span>
              <span className="text-2xl font-bold text-foreground">{metrics?.teamSize || 0}</span>
              <span className="text-[10px] text-emerald-500 font-semibold">100% Active</span>
            </div>

            {/* Total Calls */}
            <div className="rounded-lg bg-background/40 p-4 flex flex-col gap-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Calls This Week</span>
              <span className="text-2xl font-bold text-foreground">{metrics?.totalCallsThisWeek || 324}</span>
              <span className="text-[10px] text-emerald-500 font-semibold">↑ 12% from last week</span>
            </div>

            {/* Deals Closed */}
            <div className="rounded-lg bg-background/40 p-4 flex flex-col gap-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Deals Closed (MTD)</span>
              <span className="text-2xl font-bold text-foreground">{metrics?.dealsClosedMTD || 28}</span>
              <span className="text-[10px] text-primary font-semibold">Avg: $45,200</span>
            </div>

            {/* Team Revenue */}
            <div className="rounded-lg bg-background/40 p-4 flex flex-col gap-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Revenue (MTD)</span>
              <span className="text-2xl font-bold text-foreground">$1.27M</span>
              <span className="text-[10px] text-emerald-500 font-semibold">Goal: $1.5M</span>
            </div>
          </div>

          {/* Team Members Performance Table */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Top Performers</h4>
            <div className="space-y-2">
              {[
                { name: 'Sarah Johnson', role: 'Senior Sales Rep', deals: 12, revenue: '$450K', conversion: '68%' },
                { name: 'Michael Chen', role: 'Sales Representative', deals: 9, revenue: '$320K', conversion: '54%' },
                { name: 'Emma Rodriguez', role: 'Sales Representative', deals: 7, revenue: '$215K', conversion: '42%' },
              ].map((member, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-background/40 px-4 py-3 text-xs">
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="font-semibold text-foreground">{member.name}</span>
                    <span className="text-muted-foreground">{member.role}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-primary font-bold">{member.deals}</span>
                      <span className="text-muted-foreground ml-1">deals</span>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <span className="text-foreground font-semibold">{member.revenue}</span>
                    </div>
                    <div className="text-right min-w-[60px]">
                      <span className="text-emerald-500 font-semibold">{member.conversion}</span>
                    </div>
                  </div>
                </div>
              ))}
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
