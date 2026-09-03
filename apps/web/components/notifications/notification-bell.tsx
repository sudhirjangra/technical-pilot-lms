'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  getMyNotifications,
  getUnreadCount,
  markAllRead,
  markNotificationRead,
  type Notification,
} from '@/server/notifications.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/shadcn/popover';
import { Bell, CheckCheck, GraduationCap, Megaphone, MessageSquare, Sparkles, Trophy } from '@repo/shadcn/lucide';
import { cn } from '@repo/shadcn/lib/utils';

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  course_added: GraduationCap,
  offer: Sparkles,
  congratulation: Trophy,
  announcement: Megaphone,
  query_reply: MessageSquare,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getUnreadCount().then(setUnread);
  }, []);

  useEffect(() => {
    if (open) {
      getMyNotifications().then(setNotifications);
      getUnreadCount().then(setUnread);
    }
  }, [open]);

  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      const result = await markNotificationRead(id);
      if (result.error) return;
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      setUnread((prev) => Math.max(0, prev - 1));
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      const result = await markAllRead();
      if (result.error) return;
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkAllRead} disabled={pending}>
              <CheckCheck className="mr-1 size-3" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Bell className="mb-2 size-8 opacity-30" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = typeIcons[n.type] ?? Bell;
              return (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                    !n.is_read && 'bg-primary/5',
                  )}
                >
                  <div className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    !n.is_read ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                  )}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm leading-snug', !n.is_read && 'font-medium')}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
