'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const QuerySchema = z.object({
  id: z.string(),
  student_id: z.string(),
  subject: z.string(),
  body: z.string(),
  status: z.string(),
  admin_reply: z.string().nullable().optional(),
  replied_by: z.string().nullable().optional(),
  replied_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  profiles: z.object({
    id: z.string(),
    full_name: z.string().nullable().optional(),
    email: z.string().optional(),
  }).nullable().optional(),
}).passthrough();

export type StudentQuery = z.infer<typeof QuerySchema>;

async function headers() {
  const session = await auth();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.user?.tokens.access_token}`,
  };
}

export async function submitQuery(subject: string, body: string) {
  const h = await headers();
  const [error] = await safeFetch(z.any(), '/student-queries', {
    method: 'POST',
    headers: h,
    cache: 'no-store',
    body: JSON.stringify({ subject, body }),
  });
  return error ? { error } : { success: true };
}

export async function getMyQueries(): Promise<StudentQuery[]> {
  const h = await headers();
  const [error, data] = await safeFetch(
    z.array(QuerySchema),
    '/student-queries/my',
    { headers: h, cache: 'no-store' },
  );
  if (error) return [];
  return data!;
}

export async function getAllQueries(status?: string): Promise<StudentQuery[]> {
  const h = await headers();
  const url = status && status !== 'all' ? `/student-queries?status=${status}` : '/student-queries';
  const [error, data] = await safeFetch(
    z.array(QuerySchema),
    url,
    { headers: h, cache: 'no-store' },
  );
  if (error) return [];
  return data!;
}

export async function requestExtraAttempt(
  assessmentType: 'assignment' | 'test',
  assessmentId: string,
  reason?: string,
) {
  const h = await headers();
  const [error] = await safeFetch(z.any(), '/student-queries/extra-attempt', {
    method: 'POST',
    headers: h,
    cache: 'no-store',
    body: JSON.stringify({ assessment_type: assessmentType, assessment_id: assessmentId, reason }),
  });
  return error ? { error } : { success: true };
}

export async function grantExtraAttempt(queryId: string, adminReply?: string) {
  const h = await headers();
  const [error] = await safeFetch(z.any(), `/student-queries/${queryId}/grant-attempt`, {
    method: 'POST',
    headers: h,
    cache: 'no-store',
    body: JSON.stringify({ extra_attempts: 1, admin_reply: adminReply }),
  });
  return error ? { error } : { success: true };
}

export async function replyToQuery(queryId: string, adminReply: string) {
  const h = await headers();
  const [error] = await safeFetch(z.any(), `/student-queries/${queryId}/reply`, {
    method: 'PATCH',
    headers: h,
    cache: 'no-store',
    body: JSON.stringify({ admin_reply: adminReply }),
  });
  return error ? { error } : { success: true };
}
