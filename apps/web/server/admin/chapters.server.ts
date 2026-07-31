'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const ChapterSchema = z.object({
  id: z.string(),
  course_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  sort_order: z.number(),
  is_published: z.boolean(),
  lessons: z.array(z.object({
    id: z.string(),
    title: z.string(),
    lesson_type: z.string(),
    sort_order: z.number(),
    is_published: z.boolean(),
    duration_seconds: z.number().nullable(),
  })).optional(),
});

export type Chapter = z.infer<typeof ChapterSchema>;

const LessonSchema = z.object({
  id: z.string(),
  chapter_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  lesson_type: z.string(),
  sort_order: z.number(),
  is_published: z.boolean(),
  duration_seconds: z.number().nullable(),
});

export type Lesson = z.infer<typeof LessonSchema>;

async function authHeaders() {
  const session = await auth();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.user?.tokens.access_token}`,
  };
}

export async function getChapters(courseId: string): Promise<Chapter[]> {
  const session = await auth();
  const [error, data] = await safeFetch(
    z.object({ data: z.array(ChapterSchema) }),
    `/chapters/course/${courseId}`,
    { headers: { Authorization: `Bearer ${session?.user?.tokens.access_token}` }, cache: 'no-store' },
  );
  if (error) return [];
  return data.data;
}

export async function createChapter(payload: { course_id: string; title: string; description?: string; is_published?: boolean }) {
  const [error, data] = await safeFetch(
    z.object({ data: ChapterSchema }),
    '/chapters',
    { method: 'POST', headers: await authHeaders(), cache: 'no-store', body: JSON.stringify(payload) },
  );
  if (error) return { error };
  return { data: data.data };
}

export async function updateChapter(id: string, payload: { title?: string; description?: string; is_published?: boolean }) {
  const [error, data] = await safeFetch(
    z.object({ data: ChapterSchema }),
    `/chapters/${id}`,
    { method: 'PATCH', headers: await authHeaders(), cache: 'no-store', body: JSON.stringify(payload) },
  );
  if (error) return { error };
  return { data: data.data };
}

export async function deleteChapter(id: string) {
  const [error] = await safeFetch(z.any(), `/chapters/${id}`, {
    method: 'DELETE', headers: await authHeaders(), cache: 'no-store',
  });
  if (error) return { error };
  return { success: true };
}

export async function createLesson(payload: {
  chapter_id: string; title: string; description?: string;
  lesson_type: string; is_published?: boolean; duration_seconds?: number;
}) {
  const [error, data] = await safeFetch(
    z.object({ data: LessonSchema }),
    '/lessons',
    { method: 'POST', headers: await authHeaders(), cache: 'no-store', body: JSON.stringify(payload) },
  );
  if (error) return { error };
  return { data: data.data };
}

export async function updateLesson(id: string, payload: { title?: string; description?: string; is_published?: boolean }) {
  const [error, data] = await safeFetch(
    z.object({ data: LessonSchema }),
    `/lessons/${id}`,
    { method: 'PATCH', headers: await authHeaders(), cache: 'no-store', body: JSON.stringify(payload) },
  );
  if (error) return { error };
  return { data: data.data };
}

export async function deleteLesson(id: string) {
  const [error] = await safeFetch(z.any(), `/lessons/${id}`, {
    method: 'DELETE', headers: await authHeaders(), cache: 'no-store',
  });
  if (error) return { error };
  return { success: true };
}
