'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const UserSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    role: z.string(),
    full_name: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
    is_active: z.boolean().nullable().optional(),
    created_at: z.coerce.string(),
    updated_at: z.coerce.string().optional(),
  })
  .passthrough();

export type AdminUser = z.infer<typeof UserSchema>;

export async function getUsers(): Promise<AdminUser[]> {
  const session = await auth();
  const [error, data] = await safeFetch(
    z.object({ data: z.array(UserSchema) }).passthrough(),
    '/users',
    { headers: { Authorization: `Bearer ${session?.user?.tokens.access_token}` }, cache: 'no-store' },
  );
  if (error) {
    console.error('getUsers failed:', error);
    return [];
  }
  return data!.data;
}
