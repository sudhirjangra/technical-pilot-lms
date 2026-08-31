'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const CategorySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable().optional(),
    thumbnail_url: z.string().nullable().optional(),
    sort_order: z.coerce.number().default(0),
    is_active: z.boolean().default(true),
  })
  .passthrough();

const CategoriesResponseSchema = z
  .object({
    data: z.array(CategorySchema),
  })
  .passthrough();

const CategoryResponseSchema = z
  .object({
    data: CategorySchema,
  })
  .passthrough();

export type CategoryUpdatePayload = {
  name?: string;
  slug?: string;
  description?: string | null;
  thumbnail_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

export type Category = z.infer<typeof CategorySchema>;

export async function getCategories(includeInactive = false): Promise<Category[]> {
  const session = await auth();
  const [error, data] = await safeFetch(
    CategoriesResponseSchema,
    `/categories${includeInactive ? '?includeInactive=true' : ''}`,
    {
      headers: {
        Authorization: `Bearer ${session?.user.tokens.access_token}`,
      },
      cache: 'no-store',
    },
  );
  if (error) {
    console.error('getCategories failed:', error);
    return [];
  }
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
  const [error, data] = await safeFetch(CategoryResponseSchema, '/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
    cache: 'no-store',
    body: JSON.stringify(formData),
  });
  if (error) {
    console.error('createCategory failed:', error);
    return { error };
  }
  revalidatePath('/admin/categories');
  return { data: data!.data };
}

export async function updateCategory(id: string, payload: CategoryUpdatePayload) {
  const session = await auth();
  const [error, data] = await safeFetch(CategoryResponseSchema, `/categories/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
    cache: 'no-store',
    body: JSON.stringify(payload),
  });
  if (error) {
    console.error('updateCategory failed:', error);
    return { error };
  }
  revalidatePath('/admin/categories');
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
  if (error) {
    console.error('deleteCategory failed:', error);
    return { error };
  }
  revalidatePath('/admin/categories');
  return { success: true };
}

export async function uploadCategoryThumbnail(id: string, file: File) {
  const session = await auth();
  const formData = new FormData();
  formData.append('file', file);
  const [error, data] = await safeFetch(CategoryResponseSchema, `/categories/${id}/thumbnail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
    cache: 'no-store',
    body: formData,
  });
  if (error) {
    console.error('uploadCategoryThumbnail failed:', error);
    return { error };
  }
  revalidatePath('/admin/categories');
  return { data: data!.data };
}
