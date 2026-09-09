'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const SubAdminSchema = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string().nullable(),
  role: z.string(),
  is_active: z.boolean(),
  permissions: z.object({
    id: z.string(),
    permissions: z.array(z.string()),
    granted_by: z.string(),
  }).nullable(),
});

export type SubAdmin = z.infer<typeof SubAdminSchema>;

async function headers() {
  const session = await auth();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.user?.tokens.access_token}`,
  };
}

export async function getSubAdmins(): Promise<SubAdmin[]> {
  const h = await headers();
  const [error, data] = await safeFetch(z.array(SubAdminSchema), '/permissions/sub-admins', {
    headers: h, cache: 'no-store',
  });
  if (error) return [];
  return data!;
}

export async function getAvailablePermissions(): Promise<string[]> {
  const h = await headers();
  const [error, data] = await safeFetch(z.object({ data: z.array(z.string()) }), '/permissions/available', {
    headers: h, cache: 'no-store',
  });
  if (error) return [];
  return data!.data;
}

import { redirect } from 'next/navigation';

export async function getMyPermissions(): Promise<string[]> {
  const session = await auth();
  if (!session?.user) return [];
  if (session.user.role === 'admin') {
    return getAvailablePermissions();
  }
  const h = await headers();
  const [error, data] = await safeFetch(
    z.object({ permissions: z.array(z.string()) }),
    '/permissions/my',
    { headers: h, cache: 'no-store' },
  );
  if (error || !data) return [];
  return data.permissions;
}

export async function requireAdminPermission(...required: string[]) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'sub_admin')) {
    redirect('/');
  }
  if (session.user.role === 'admin') return;
  const userPerms = await getMyPermissions();
  const hasAccess = required.some((p) => userPerms.includes(p));
  if (!hasAccess) {
    redirect('/admin');
  }
}

export async function setPermissions(userId: string, permissions: string[]) {
  const h = await headers();
  const [error] = await safeFetch(z.any(), '/permissions', {
    method: 'POST', headers: h, cache: 'no-store',
    body: JSON.stringify({ user_id: userId, permissions }),
  });
  if (error) return { error };
  return { success: true };
}

export async function promoteUser(userId: string, role: 'sub_admin' | 'admin' = 'sub_admin') {
  const h = await headers();
  const [error] = await safeFetch(z.any(), `/permissions/${userId}/promote`, {
    method: 'POST', headers: h, cache: 'no-store',
    body: JSON.stringify({ role }),
  });
  if (error) return { error };
  return { success: true };
}

export async function demoteUser(userId: string) {
  const h = await headers();
  const [error] = await safeFetch(z.any(), `/permissions/${userId}/demote`, {
    method: 'POST', headers: h, cache: 'no-store',
    body: '{}',
  });
  if (error) return { error };
  return { success: true };
}

export async function revokePermissions(userId: string) {
  const h = await headers();
  const [error] = await safeFetch(z.any(), `/permissions/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: h.Authorization },
    cache: 'no-store',
  });
  if (error) return { error };
  return { success: true };
}
