'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const VideoLessonSchema = z
  .object({
    id: z.string(),
    lesson_id: z.string(),
    vdocipher_video_id: z.string(),
    duration_seconds: z.coerce.number().nullable().optional(),
    thumbnail_url: z.string().nullable().optional(),
  })
  .passthrough();

const MessageResponseSchema = z.object({
  message: z.string().optional(),
});

export type VideoLesson = z.infer<typeof VideoLessonSchema>;

async function authHeaders(includeContentType = true) {
  const session = await auth();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session?.user.tokens.access_token}`,
  };
  if (includeContentType) headers['Content-Type'] = 'application/json';
  return headers;
}

export async function getVideoLesson(lessonId: string): Promise<VideoLesson | null> {
  const [error, data] = await safeFetch(
    z.object({ data: VideoLessonSchema }),
    `/videos/lesson/${lessonId}`,
    { headers: await authHeaders(), cache: 'no-store' },
  );
  if (error) return null;
  return data!.data;
}

export async function createVideoLesson(payload: {
  lesson_id: string;
  vdocipher_video_id: string;
}) {
  const [error, data] = await safeFetch(
    z.object({ data: VideoLessonSchema }),
    '/videos/lesson',
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

export async function uploadVideoLesson(lessonId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const [error, data] = await safeFetch(
    z.object({ data: VideoLessonSchema }),
    `/videos/lesson/${lessonId}/upload`,
    {
      method: 'POST',
      headers: await authHeaders(false),
      cache: 'no-store',
      body: formData,
    },
  );
  if (error) return { error };
  return { data: data!.data };
}

export async function updateVideoLesson(
  lessonId: string,
  payload: {
    vdocipher_video_id?: string;
  },
) {
  const [error, data] = await safeFetch(
    z.object({ data: VideoLessonSchema }),
    `/videos/lesson/${lessonId}`,
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

export async function deleteVideoLesson(lessonId: string) {
  const [error] = await safeFetch(MessageResponseSchema, `/videos/lesson/${lessonId}`, {
    method: 'DELETE',
    headers: await authHeaders(false),
    cache: 'no-store',
  });
  if (error) return { error };
  return { success: true };
}

export async function getVideoLessonsForCourse(courseId: string): Promise<VideoLesson[]> {
  const [error, data] = await safeFetch(
    z.object({ data: z.array(VideoLessonSchema) }),
    `/videos/course/${courseId}`,
    { headers: await authHeaders(), cache: 'no-store' },
  );
  if (error) return [];
  return data!.data;
}
