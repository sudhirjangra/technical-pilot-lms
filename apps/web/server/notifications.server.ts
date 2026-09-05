'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const NotificationSchema = z.object({
  id: z.string(),
  recipient_id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string().nullable().optional(),
  metadata: z.any().default({}),
  is_read: z.boolean(),
  created_at: z.string(),
}).passthrough();

export type Notification = z.infer<typeof NotificationSchema>;

async function headers() {
  const session = await auth();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.user?.tokens.access_token}`,
  };
}

export async function getMyNotifications(): Promise<Notification[]> {
  const h = await headers();
  const [error, data] = await safeFetch(
    z.array(NotificationSchema),
    '/notifications/my',
    { headers: h, cache: 'no-store' },
  );
  if (error) return [];
  return data!;
}

export async function getUnreadCount(): Promise<number> {
  const h = await headers();
  const [error, data] = await safeFetch(
    z.object({ count: z.number() }),
    '/notifications/unread-count',
    { headers: h, cache: 'no-store' },
  );
  if (error) return 0;
  return data!.count;
}

export async function markNotificationRead(id: string) {
  const h = await headers();
  const [error] = await safeFetch(z.any(), `/notifications/${id}/read`, {
    method: 'PATCH',
    headers: h,
    cache: 'no-store',
    body: '{}',
  });
  return error ? { error } : { success: true };
}

export async function markAllRead() {
  const h = await headers();
  const [error] = await safeFetch(z.any(), '/notifications/mark-all-read', {
    method: 'POST',
    headers: h,
    cache: 'no-store',
    body: '{}',
  });
  return error ? { error } : { success: true };
}

export async function broadcastNotification(
  title: string,
  body: string,
  type = 'announcement',
  courseId?: string,
) {
  const h = await headers();
  const [error] = await safeFetch(z.any(), '/notifications/broadcast', {
    method: 'POST',
    headers: h,
    cache: 'no-store',
    body: JSON.stringify({ title, body, type, course_id: courseId }),
  });
  return error ? { error } : { success: true };
}

export async function sendNotification(
  recipientId: string,
  title: string,
  body: string,
  type = 'announcement',
  metadata: Record<string, any> = {},
) {
  const h = await headers();
  const [error] = await safeFetch(z.any(), '/notifications/send', {
    method: 'POST',
    headers: h,
    cache: 'no-store',
    body: JSON.stringify({ recipient_id: recipientId, title, body, type, metadata }),
  });
  return error ? { error } : { success: true };
}

export const NotificationLogSchema = z.object({
  id: z.string(),
  recipient_id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string().nullable().optional(),
  metadata: z.any().default({}),
  is_read: z.boolean(),
  created_at: z.string(),
  profiles: z.object({
    id: z.string().optional(),
    full_name: z.string().nullable().optional(),
    email: z.string().optional(),
  }).nullable().optional(),
}).passthrough();

export type NotificationLog = z.infer<typeof NotificationLogSchema>;

export async function getAdminNotificationLogs(): Promise<NotificationLog[]> {
  const h = await headers();
  const [error, data] = await safeFetch(
    z.array(NotificationLogSchema),
    '/notifications/admin/logs',
    { headers: h, cache: 'no-store' },
  );
  if (error) return [];
  return data!;
}
