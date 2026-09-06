import { z } from 'zod';

export const NotificationSchema = z.object({
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
