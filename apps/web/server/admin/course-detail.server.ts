'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const CourseDetailSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    description: z.string().nullable().optional(),
    thumbnail_url: z.string().nullable().optional(),
    price: z.coerce.number(),
    discount_price: z.coerce.number().nullable().optional(),
    status: z.string(),
    category_id: z.string().nullable().optional(),
    created_by: z.string().nullable().optional(),
    published_at: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    categories: z
      .object({ id: z.string(), name: z.string(), slug: z.string() })
      .nullable()
      .optional(),
  })
  .passthrough();

export type CourseDetail = z.infer<typeof CourseDetailSchema>;

export async function getCourseById(id: string): Promise<CourseDetail | null> {
  const session = await auth();
  const [error, data] = await safeFetch(
    z.object({ data: CourseDetailSchema }).passthrough(),
    `/courses/${id}`,
    { headers: { Authorization: `Bearer ${session?.user?.tokens.access_token}` }, cache: 'no-store' },
  );
  if (error) {
    console.error('getCourseById failed:', error);
    return null;
  }
  return data!.data;
}

export type CourseDetailUpdatePayload = {
  title?: string;
  slug?: string;
  description?: string | null;
  thumbnail_url?: string | null;
  category_id?: string | null;
  price?: number;
  discount_price?: number | null;
  status?: string;
};

export async function updateCourse(id: string, payload: CourseDetailUpdatePayload) {
  const session = await auth();
  const [error, data] = await safeFetch(
    z.object({ data: CourseDetailSchema }).passthrough(),
    `/courses/${id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.user?.tokens.access_token}` },
      cache: 'no-store',
      body: JSON.stringify(payload),
    },
  );
  if (error) {
    console.error('updateCourse failed:', error);
    return { error };
  }
  revalidatePath('/admin/courses');
  revalidatePath(`/admin/courses/${id}`);
  return { data: data!.data };
}
