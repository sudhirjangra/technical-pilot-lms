'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  broadcastNotification,
  getMyNotifications,
  getUnreadCount,
  markAllRead,
  markNotificationRead,
  type Notification,
} from '@/server/notifications.server';
import { getAdminCourses, type Course } from '@/server/admin/courses.server';
import { Button } from '@repo/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/shadcn/dialog';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/shadcn/popover';
import {
  Bell,
  CheckCheck,
  GraduationCap,
  Megaphone,
  MessageSquare,
  Send,
  Sparkles,
  Trophy,
} from '@repo/shadcn/lucide';
import { cn } from '@repo/shadcn/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/shadcn/select';
import { Textarea } from '@repo/shadcn/textarea';
import { toast } from '@repo/shadcn/sonner';

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

export function NotificationBell({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [pending, startTransition] = useTransition();
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [courseId, setCourseId] = useState('all');

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

  const openBroadcast = () => {
    setOpen(false);
    setBroadcastOpen(true);
    if (courses.length > 0 || coursesLoading) return;
    setCoursesLoading(true);
    getAdminCourses()
      .then(setCourses)
      .finally(() => setCoursesLoading(false));
  };

  const handleBroadcast = () => {
    if (!title.trim()) {
      toast.error('Enter a notification title');
      return;
    }
    startTransition(async () => {
      const result = await broadcastNotification(
        title.trim(),
        body.trim(),
        'announcement',
        courseId === 'all' ? undefined : courseId,
      );
      if (result.error) {
        toast.error(typeof result.error === 'string' ? result.error : 'Failed to send notification');
        return;
      }
      toast.success('Notification broadcast sent');
      setBroadcastOpen(false);
      setTitle('');
      setBody('');
      setCourseId('all');
    });
  };

  return (
    <>
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
          <div className="flex items-center gap-1">
            {isAdmin && (
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={openBroadcast}>
                <Send className="size-3" />
                Broadcast
              </Button>
            )}
            {unread > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkAllRead} disabled={pending}>
                <CheckCheck className="mr-1 size-3" />
                Mark all read
              </Button>
            )}
          </div>
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

      {isAdmin && (
        <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Broadcast notification</DialogTitle>
            <DialogDescription>
              Send an in-app announcement to all active students or students enrolled in one course.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="broadcast-title">Title</Label>
              <Input
                id="broadcast-title"
                maxLength={200}
                placeholder="Important announcement"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="broadcast-body">Message</Label>
              <Textarea
                id="broadcast-body"
                maxLength={2000}
                rows={4}
                placeholder="Write your message..."
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Recipients</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose recipients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All active students</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {coursesLoading && <p className="text-xs text-muted-foreground">Loading courses...</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBroadcastOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleBroadcast} disabled={pending || coursesLoading}>
              <Send className="mr-2 size-4" />
              {pending ? 'Sending...' : 'Send broadcast'}
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
      )}
    </>
  );
}
