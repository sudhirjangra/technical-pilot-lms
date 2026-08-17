'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const CourseDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  price: z.coerce.number(),
  discount_price: z.coerce.number().nullable(),
  status: z.string(),
  category_id: z.string().nullable(),
  created_by: z.string().nullable(),
  published_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  categories: z.object({ id: z.string(), name: z.string(), slug: z.string() }).nullable(),
});

export type CourseDetail = z.infer<typeof CourseDetailSchema>;

export async function getCourseById(id: string): Promise<CourseDetail | null> {
  const session = await auth();
  const [error, data] = await safeFetch(
    z.object({ data: CourseDetailSchema }),
    `/courses/${id}`,
    { headers: { Authorization: `Bearer ${session?.user?.tokens.access_token}` }, cache: 'no-store' },
  );
  if (error) return null;
  return data!.data;
}

export async function updateCourse(id: string, payload: Record<string, unknown>) {
  const session = await auth();
  const [error, data] = await safeFetch(
    z.object({ data: CourseDetailSchema }),
    `/courses/${id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.user?.tokens.access_token}` },
      cache: 'no-store',
      body: JSON.stringify(payload),
    },
  );
  if (error) return { error };
  return { data: data!.data };
}
