'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const AdminReferralOverviewSchema = z.object({
  total_referrals: z.number(),
  total_purchased_referrals: z.number(),
  total_referral_revenue: z.number(),
  total_points_awarded: z.number(),
  pending_requests_count: z.number(),
  total_pending_inr: z.number(),
});

const AdminReferralItemSchema = z.object({
  id: z.string(),
  referrer_id: z.string(),
  referee_id: z.string(),
  referral_code: z.string(),
  status: z.string(),
  total_purchases_count: z.number(),
  total_purchased_amount: z.number(),
  total_points_awarded: z.number(),
  created_at: z.string(),
  referrer: z
    .object({
      id: z.string(),
      full_name: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
    })
    .nullable(),
  referee: z
    .object({
      id: z.string(),
      full_name: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
    })
    .nullable(),
});

const AdminReferralsListSchema = z.object({
  referrals: z.array(AdminReferralItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

const AdminConversionRequestItemSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  points_requested: z.number(),
  inr_amount: z.number(),
  points_per_rupee: z.number(),
  status: z.enum(['pending', 'approved', 'rejected', 'paid']),
  student_notes: z.string().nullable(),
  admin_notes: z.string().nullable(),
  processed_at: z.string().nullable(),
  processed_by: z.string().nullable(),
  created_at: z.string(),
  student: z
    .object({
      id: z.string(),
      full_name: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
    })
    .nullable(),
  processor: z
    .object({
      id: z.string(),
      full_name: z.string().nullable(),
      email: z.string().nullable(),
    })
    .nullable(),
});

const AdminSettingsSchema = z.object({
  id: z.number(),
  referee_discount_percentage: z.number(),
  referrer_reward_percentage: z.number(),
  points_per_rupee: z.number(),
  min_withdrawal_points: z.number(),
  is_active: z.boolean(),
});

export type AdminReferralOverview = z.infer<typeof AdminReferralOverviewSchema>;
export type AdminReferralItem = z.infer<typeof AdminReferralItemSchema>;
export type AdminConversionRequestItem = z.infer<typeof AdminConversionRequestItemSchema>;
export type AdminReferralSettings = z.infer<typeof AdminSettingsSchema>;

export async function getAdminReferralOverview(): Promise<{
  data?: AdminReferralOverview;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user) return { error: 'Not authenticated' };

  const [error, data] = await safeFetch(
    AdminReferralOverviewSchema,
    '/referrals/admin/overview',
    {
      headers: {
        Authorization: `Bearer ${session.user.tokens.access_token}`,
      },
      cache: 'no-store',
    },
  );

  if (error) return { error: typeof error === 'string' ? error : 'Failed to load overview' };
  return { data: data! };
}

export async function getAdminReferrals(
  page = 1,
  limit = 50,
): Promise<{ data?: z.infer<typeof AdminReferralsListSchema>; error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Not authenticated' };

  const [error, data] = await safeFetch(
    AdminReferralsListSchema,
    `/referrals/admin/list?page=${page}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${session.user.tokens.access_token}`,
      },
      cache: 'no-store',
    },
  );

  if (error) return { error: typeof error === 'string' ? error : 'Failed to load referrals' };
  return { data: data! };
}

export async function getAdminConversionRequests(
  status?: string,
): Promise<{ data?: AdminConversionRequestItem[]; error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Not authenticated' };

  const url = status
    ? `/referrals/admin/conversion-requests?status=${status}`
    : '/referrals/admin/conversion-requests';

  const [error, data] = await safeFetch(
    z.array(AdminConversionRequestItemSchema),
    url,
    {
      headers: {
        Authorization: `Bearer ${session.user.tokens.access_token}`,
      },
      cache: 'no-store',
    },
  );

  if (error) return { error: typeof error === 'string' ? error : 'Failed to load requests' };
  return { data: data! };
}

export async function updateConversionRequestStatus(
  requestId: string,
  input: { status: 'paid' | 'rejected'; admin_notes?: string },
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user) return { error: 'Not authenticated' };

  const [error] = await safeFetch(
    z.object({ id: z.string() }).passthrough(),
    `/referrals/admin/conversion-requests/${requestId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.user.tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
      cache: 'no-store',
    },
  );

  if (error) return { error: typeof error === 'string' ? error : 'Failed to update request' };

  revalidatePath('/admin/referrals');
  return { success: true };
}

export async function getAdminReferralSettings(): Promise<{
  data?: AdminReferralSettings;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user) return { error: 'Not authenticated' };

  const [error, data] = await safeFetch(
    AdminSettingsSchema,
    '/referrals/admin/settings',
    {
      headers: {
        Authorization: `Bearer ${session.user.tokens.access_token}`,
      },
      cache: 'no-store',
    },
  );

  if (error) return { error: typeof error === 'string' ? error : 'Failed to load settings' };
  return { data: data! };
}

export async function updateAdminReferralSettings(input: {
  referee_discount_percentage?: number;
  referrer_reward_percentage?: number;
  points_per_rupee?: number;
  min_withdrawal_points?: number;
  is_active?: boolean;
}): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user) return { error: 'Not authenticated' };

  const [error] = await safeFetch(
    AdminSettingsSchema,
    '/referrals/admin/settings',
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.user.tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
      cache: 'no-store',
    },
  );

  if (error) return { error: typeof error === 'string' ? error : 'Failed to update settings' };

  revalidatePath('/admin/referrals');
  return { success: true };
}
