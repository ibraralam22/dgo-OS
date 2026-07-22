'use client';

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsApi, NotificationStatus } from '@services/notifications-api';
import { Button } from '@components/ui/button';

export default function NotificationsPage(): React.JSX.Element {
  const [status, setStatus] = React.useState<NotificationStatus>('all');
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notifications', 'list', status], queryFn: () => notificationsApi.list({ status, limit: 100 }) });
  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }) });
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }) });
  return <div className="max-w-4xl mx-auto space-y-6 pb-12"><div className="flex items-start justify-between"><div><h1 className="text-2xl font-black tracking-tight">Notifications</h1><p className="text-sm text-muted-foreground mt-1">Your recent CRM activity and reminders.</p></div><Button size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}><CheckCheck className="h-4 w-4 mr-2" />Mark all read</Button></div><div className="flex gap-2"><Button size="sm" variant={status === 'all' ? 'primary' : 'outline'} onClick={() => setStatus('all')}>All</Button><Button size="sm" variant={status === 'unread' ? 'primary' : 'outline'} onClick={() => setStatus('unread')}>Unread</Button></div><div className="rounded-xl border border-border divide-y bg-card">{isLoading ? <p className="p-8 text-center text-muted-foreground">Loading notifications…</p> : data?.data.length ? data.data.map((item) => <button key={item.id} onClick={() => !item.readAt && markRead.mutate(item.id)} className={`w-full text-left p-4 hover:bg-accent/50 transition-colors flex gap-3 ${!item.readAt ? 'bg-primary/5' : ''}`}><Bell className="h-5 w-5 mt-0.5 text-primary shrink-0" /><span><span className="block font-semibold">{item.title}</span><span className="block text-sm text-muted-foreground mt-1">{item.body}</span><span className="block text-xs text-muted-foreground mt-2">{new Date(item.createdAt).toLocaleString()}</span></span></button>) : <p className="p-8 text-center text-muted-foreground">No notifications to show.</p>}</div></div>;
}
