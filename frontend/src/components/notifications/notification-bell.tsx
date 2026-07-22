'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@store/auth-store';
import { notificationsApi, Notification } from '@services/notifications-api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@components/ui/dropdown-menu';

const routes: Record<string, string> = { lead: '/dashboard/leads', account: '/dashboard/clients', contact: '/dashboard/clients', opportunity: '/dashboard/opportunities', quotation: '/dashboard/opportunities', project: '/dashboard/projects', milestone: '/dashboard/projects', task: '/dashboard/tasks', calendar: '/dashboard/calendar', invoice: '/dashboard/billing', payment: '/dashboard/billing', ticket: '/dashboard/tickets', report: '/dashboard/reports' };

export const NotificationBell: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken, activeOrganizationId, user } = useAuthStore();
  const enabled = Boolean(user?.permissions.includes('notifications:read') || user?.role === 'SuperAdmin');
  const { data: count } = useQuery({ queryKey: ['notifications', 'count', activeOrganizationId], queryFn: notificationsApi.unreadCount, enabled, refetchInterval: 60_000 });
  const { data, isLoading } = useQuery({ queryKey: ['notifications', 'recent', activeOrganizationId], queryFn: () => notificationsApi.list({ limit: 8 }), enabled });
  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }) });
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }) });

  React.useEffect(() => {
    if (!enabled || !accessToken || !activeOrganizationId) return;
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    const socket: Socket = io(`${url}/notifications`, { transports: ['websocket'], auth: { token: accessToken, organizationId: activeOrganizationId } });
    socket.on('notification.created', (notification: Notification) => {
      queryClient.setQueryData<{ count: number }>(['notifications', 'count', activeOrganizationId], (old) => ({ count: (old?.count || 0) + 1 }));
      queryClient.setQueryData<{ data: Notification[]; total: number }>(['notifications', 'recent', activeOrganizationId], (old) => old ? { data: [notification, ...old.data].slice(0, 8), total: old.total + 1 } : old);
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
    });
    return () => { socket.disconnect(); };
  }, [accessToken, activeOrganizationId, enabled, queryClient]);

  if (!enabled) return null;
  const open = (notification: Notification): void => { if (!notification.readAt) markRead.mutate(notification.id); router.push(routes[notification.resourceType] || '/dashboard/notifications'); };
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button aria-label="View notifications" className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors border border-border/30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <Bell className="h-4.5 w-4.5 text-muted-foreground" aria-hidden="true" />
        {(count?.count || 0) > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{count!.count > 99 ? '99+' : count!.count}</span>}
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-96 p-0">
      <DropdownMenuLabel className="flex items-center justify-between py-3"><span>Notifications</span><button onClick={() => markAll.mutate()} disabled={!count?.count || markAll.isPending} className="text-xs text-primary hover:underline disabled:opacity-50">Mark all read</button></DropdownMenuLabel>
      <DropdownMenuSeparator />
      <div className="max-h-96 overflow-y-auto">{isLoading ? <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : data?.data.length ? data.data.map((notification) => <DropdownMenuItem key={notification.id} onSelect={() => open(notification)} className={`items-start py-3 px-3 cursor-pointer ${!notification.readAt ? 'bg-primary/5' : ''}`}><span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0 opacity-0 data-[unread=true]:opacity-100" data-unread={!notification.readAt} /><span className="min-w-0"><span className="block text-sm font-semibold truncate">{notification.title}</span><span className="block text-xs text-muted-foreground truncate">{notification.body}</span><span className="block text-[10px] text-muted-foreground mt-1">{new Date(notification.createdAt).toLocaleString()}</span></span></DropdownMenuItem>) : <p className="p-6 text-center text-sm text-muted-foreground">You’re all caught up.</p>}</div>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild className="justify-center py-3"><Link href="/dashboard/notifications">View all notifications <CheckCheck className="h-4 w-4 ml-2" /></Link></DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
};
