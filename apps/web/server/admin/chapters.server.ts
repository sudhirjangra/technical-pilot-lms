'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const LessonSchema = z
  .object({
    id: z.string(),
    chapter_id: z.string().optional(),
    title: z.string(),
    description: z.string().nullable().optional(),
    lesson_type: z.string(),
    sort_order: z.coerce.number().default(0),
    is_published: z.boolean().default(false),
    duration_seconds: z.coerce.number().nullable().optional(),
  })
  .passthrough();

const ChapterSchema = z
  .object({
    id: z.string(),
    course_id: z.string().optional(),
    title: z.string(),
    description: z.string().nullable().optional(),
    sort_order: z.coerce.number().default(0),
    is_published: z.boolean().default(false),
    lessons: z.array(LessonSchema).nullable().optional(),
  })
  .passthrough();

const ReorderPayloadSchema = z.object({
  id: z.string(),
  sort_order: z.number(),
});

const MessageResponseSchema = z.object({
  message: z.string().optional(),
});

export type Chapter = z.infer<typeof ChapterSchema>;
export type Lesson = z.infer<typeof LessonSchema>;

async function authHeaders(includeContentType = true) {
  const session = await auth();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session?.user.tokens.access_token}`,
  };
  if (includeContentType) headers['Content-Type'] = 'application/json';
  return headers;
}

export async function getChapters(courseId: string): Promise<Chapter[]> {
  const session = await auth();
  const [error, data] = await safeFetch(
    z.object({ data: z.array(ChapterSchema) }),
    `/chapters/course/${courseId}`,
    {
      headers: {
        Authorization: `Bearer ${session?.user.tokens.access_token}`,
      },
      cache: 'no-store',
    },
  );
  if (error) {
    console.error('getChapters failed:', error);
    return [];
  }
  return data!.data
    .map((chapter) => ({
      ...chapter,
      lessons: [...(chapter.lessons ?? [])].sort(
        (left, right) => left.sort_order - right.sort_order,
      ),
    }))
    .sort((left, right) => left.sort_order - right.sort_order);
}

export async function createChapter(payload: {
  course_id: string;
  title: string;
  description?: string;
  is_published?: boolean;
}) {
  const [error, data] = await safeFetch(
    z.object({ data: ChapterSchema }),
    '/chapters',
    {
      method: 'POST',
      headers: await authHeaders(),
      cache: 'no-store',
      body: JSON.stringify(payload),
    },
  );
  if (error) return { error };
  return { data: data!.data };
}

export async function updateChapter(
  id: string,
  payload: {
    title?: string;
    description?: string;
    sort_order?: number;
    is_published?: boolean;
  },
) {
  const [error, data] = await safeFetch(
    z.object({ data: ChapterSchema }),
    `/chapters/${id}`,
    {
      method: 'PATCH',
      headers: await authHeaders(),
      cache: 'no-store',
      body: JSON.stringify(payload),
    },
  );
  if (error) return { error };
  return { data: data!.data };
}

export async function reorderChapters(chapters: { id: string; sort_order: number }[]) {
  const [error] = await safeFetch(
    MessageResponseSchema,
    '/chapters/reorder',
    {
      method: 'PATCH',
      headers: await authHeaders(),
      cache: 'no-store',
      body: JSON.stringify({
        chapters: chapters.map((chapter) => ReorderPayloadSchema.parse(chapter)),
      }),
    },
  );
  if (error) return { error };
  return { success: true };
}

export async function deleteChapter(id: string) {
  const [error] = await safeFetch(MessageResponseSchema, `/chapters/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(false),
    cache: 'no-store',
  });
  if (error) return { error };
  return { success: true };
}

export async function createLesson(payload: {
  chapter_id: string;
  title: string;
  description?: string;
  lesson_type: string;
  is_published?: boolean;
}) {
  const [error, data] = await safeFetch(
    z.object({ data: LessonSchema }),
    '/lessons',
    {
      method: 'POST',
      headers: await authHeaders(),
      cache: 'no-store',
      body: JSON.stringify(payload),
    },
  );
  if (error) return { error };
  return { data: data!.data };
}

export async function uploadPdfLesson(lessonId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const [error, data] = await safeFetch(z.any(), `/lessons/${lessonId}/pdf`, {
    method: 'POST',
    headers: await authHeaders(false),
    cache: 'no-store',
    body: formData,
  });
  if (error) return { error };
  return { data: data?.data ?? null };
}

export async function deletePdfLesson(lessonId: string) {
  const [error] = await safeFetch(MessageResponseSchema, `/lessons/${lessonId}/pdf`, {
    method: 'DELETE',
    headers: await authHeaders(false),
    cache: 'no-store',
  });
  if (error) return { error };
  return { success: true };
}

export async function updateLesson(
  id: string,
  payload: {
    title?: string;
    description?: string;
    lesson_type?: string;
    sort_order?: number;
    is_published?: boolean;
  },
) {
  const [error, data] = await safeFetch(
    z.object({ data: LessonSchema }),
    `/lessons/${id}`,
    {
      method: 'PATCH',
      headers: await authHeaders(),
      cache: 'no-store',
      body: JSON.stringify(payload),
    },
  );
  if (error) return { error };
  return { data: data!.data };
}

export async function reorderLessons(lessons: { id: string; sort_order: number }[]) {
  const [error] = await safeFetch(
    MessageResponseSchema,
    '/lessons/reorder',
    {
      method: 'PATCH',
      headers: await authHeaders(),
      cache: 'no-store',
      body: JSON.stringify({
        lessons: lessons.map((lesson) => ReorderPayloadSchema.parse(lesson)),
      }),
    },
  );
  if (error) return { error };
  return { success: true };
}

export async function deleteLesson(id: string) {
  const [error] = await safeFetch(MessageResponseSchema, `/lessons/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(false),
    cache: 'no-store',
  });
  if (error) return { error };
  return { success: true };
}
