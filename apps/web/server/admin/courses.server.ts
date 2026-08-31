'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { revalidatePath } from 'next/cache';
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

const CoursesResponseSchema = z
  .object({
    data: z.array(CourseSchema),
  })
  .passthrough();

const CourseResponseSchema = z
  .object({
    data: CourseSchema,
  })
  .passthrough();

export type Course = z.infer<typeof CourseSchema>;

export async function getAdminCourses(): Promise<Course[]> {
  const session = await auth();
  const [error, data] = await safeFetch(CoursesResponseSchema, '/courses/admin', {
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
    cache: 'no-store',
  });
  if (error) {
    console.error('getAdminCourses failed:', error);
    return [];
  }
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
  const [error, data] = await safeFetch(CourseResponseSchema, '/courses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
    cache: 'no-store',
    body: JSON.stringify(formData),
  });
  if (error) {
    console.error('createCourse failed:', error);
    return { error };
  }
  revalidatePath('/admin/courses');
  return { data: data!.data };
}

export type CourseUpdatePayload = {
  title?: string;
  slug?: string;
  description?: string | null;
  thumbnail_url?: string | null;
  category_id?: string | null;
  price?: number;
  discount_price?: number | null;
  status?: 'draft' | 'published' | 'archived';
};

export async function updateAdminCourse(id: string, payload: CourseUpdatePayload) {
  const session = await auth();
  const [error, data] = await safeFetch(CourseResponseSchema, `/courses/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
    cache: 'no-store',
    body: JSON.stringify(payload),
  });
  if (error) {
    console.error('updateAdminCourse failed:', error);
    return { error };
  }
  revalidatePath('/admin/courses');
  revalidatePath(`/admin/courses/${id}`);
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
  if (error) {
    console.error('deleteCourse failed:', error);
    return { error };
  }
  revalidatePath('/admin/courses');
  return { success: true };
}

export async function uploadCourseThumbnail(id: string, file: File) {
  const session = await auth();
  const formData = new FormData();
  formData.append('file', file);
  const [error, data] = await safeFetch(CourseResponseSchema, `/courses/${id}/thumbnail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
    cache: 'no-store',
    body: formData,
  });
  if (error) {
    console.error('uploadCourseThumbnail failed:', error);
    return { error };
  }
  revalidatePath('/admin/courses');
  revalidatePath(`/admin/courses/${id}`);
  return { data: data!.data };
}
