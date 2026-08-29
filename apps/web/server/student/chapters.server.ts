'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ChapterStartSchema = z
  .object({
    id: z.string().optional(),
    student_id: z.string().nullable().optional(),
    chapter_id: z.string().nullable().optional(),
    started_at: z.string().nullable().optional(),
  })
  .passthrough();

const ChapterStartResponseSchema = z
  .object({
    data: ChapterStartSchema.nullable().optional(),
  })
  .passthrough();

export type ChapterStart = z.infer<typeof ChapterStartSchema>;

/**
 * Some API responses are enveloped as `{ data }`, others are bare records.
 * Accept both so a shape change can never blank the page.
 */
const unwrap = (payload: unknown): ChapterStart | null => {
  const enveloped = ChapterStartResponseSchema.safeParse(payload);
  if (enveloped.success && enveloped.data.data) return enveloped.data.data;
  const bare = ChapterStartSchema.safeParse(payload);
  if (bare.success && bare.data.id) return bare.data;
  return null;
};

export async function startChapter(
  chapterId: string,
  revalidateTarget?: string,
): Promise<{ data?: ChapterStart | null; error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Not authenticated' };

  const [error, data] = await safeFetch(
    z.unknown(),
    `/chapters/${chapterId}/start`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.user.tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      cache: 'no-store',
    },
  );

  if (error) {
    console.error('startChapter failed:', error);
    return { error: typeof error === 'string' ? error : 'Could not start chapter' };
  }

  if (revalidateTarget) revalidatePath(revalidateTarget, 'layout');

  return { data: unwrap(data) };
}

export async function getChapterStart(
  chapterId: string,
): Promise<ChapterStart | null> {
  const session = await auth();
  if (!session?.user) return null;

  const [error, data] = await safeFetch(
    z.unknown(),
    `/chapters/${chapterId}/start`,
    {
      headers: { Authorization: `Bearer ${session.user.tokens.access_token}` },
      cache: 'no-store',
    },
  );

  if (error) {
    console.error('getChapterStart failed:', error);
    return null;
  }

  return unwrap(data);
}
