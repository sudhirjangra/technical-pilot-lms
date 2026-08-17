'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  sort_order: z.number(),
  is_active: z.boolean(),
});

const CategoriesResponseSchema = z.object({
  data: z.array(CategorySchema),
});

export type Category = z.infer<typeof CategorySchema>;

export async function getCategories(): Promise<Category[]> {
  const [error, data] = await safeFetch(CategoriesResponseSchema, '/categories');
  if (error) return [];
  return data!.data;
}

export async function createCategory(formData: {
  name: string;
  slug: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}) {
  const session = await auth();
  const [error, data] = await safeFetch(z.object({ data: CategorySchema }), '/categories', {
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

export async function deleteCategory(id: string) {
  const session = await auth();
  const [error] = await safeFetch(z.any(), `/categories/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
    cache: 'no-store',
  });
  if (error) return { error };
  return { success: true };
}
