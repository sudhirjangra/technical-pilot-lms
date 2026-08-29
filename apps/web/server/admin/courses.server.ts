'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const CourseSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    description: z.string().nullable().optional(),
    thumbnail_url: z.string().nullable().optional(),
    price: z.coerce.number(),
    discount_price: z.coerce.number().nullable().optional(),
    status: z.enum(['draft', 'published', 'archived']),
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

const CoursesResponseSchema = z.object({
  data: z.array(CourseSchema),
});

export type Course = z.infer<typeof CourseSchema>;

export async function getAdminCourses(): Promise<Course[]> {
  const session = await auth();
  const [error, data] = await safeFetch(CoursesResponseSchema, '/courses/admin', {
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
    cache: 'no-store',
  });
  if (error) return [];
  return data!.data;
}

export async function createCourse(formData: {
  title: string;
  slug: string;
  description?: string;
  category_id?: string;
  price: number;
  discount_price?: number;
  status: string;
}) {
  const session = await auth();
  const [error, data] = await safeFetch(z.object({ data: CourseSchema }), '/courses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
    cache: 'no-store',
    body: JSON.stringify(formData),
  });
  if (error) return { error };
  return { data: data!.data };
}

export async function deleteCourse(id: string) {
  const session = await auth();
  const [error] = await safeFetch(z.any(), `/courses/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
    cache: 'no-store',
  });
  if (error) return { error };
  return { success: true };
}
