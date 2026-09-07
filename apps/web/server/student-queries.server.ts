'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const QuerySchema = z.object({
  id: z.string(),
  student_id: z.string().nullable().optional(),
  subject: z.string(),
  body: z.string(),
  status: z.string(),
  admin_reply: z.string().nullable().optional(),
  replied_by: z.string().nullable().optional(),
  replied_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  query_number: z.string().nullable().optional(),
  profiles: z.object({
    id: z.string().nullable().optional(),
    full_name: z.string().nullable().optional(),
    email: z.string().optional(),
    phone: z.string().nullable().optional(),
  }).nullable().optional(),
}).passthrough();

export type StudentQuery = z.infer<typeof QuerySchema>;

const ContactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  phone: z
    .string()
    .min(10, 'Mobile number must be at least 10 digits')
    .regex(/^\+?[1-9]\d{9,14}$/, 'Enter a valid mobile number (e.g. +919876543210)'),
  message: z.string().min(5, 'Message must be at least 5 characters'),
  subject: z.string().optional(),
});

export type ContactInput = z.infer<typeof ContactSchema>;


export async function submitContactForm(input: ContactInput) {
  const validation = ContactSchema.safeParse(input);
  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message ?? 'Invalid input';
    return { error: firstError };
  }

  const [error, data] = await safeFetch(z.any(), '/student-queries/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify(validation.data),
  });
  if (error) {
    const msg = typeof error === 'string' ? error : (error as Record<string, unknown>)?.message as string || 'Failed to submit inquiry';
    return { error: msg };
  }
  return {
    success: true,
    message: data?.message || 'Inquiry submitted successfully',
    queryNumber: data?.query_number,
  };
}

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
