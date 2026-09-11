'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ReferralWalletSchema = z.object({
  current_balance: z.number(),
  total_earned: z.number(),
  total_redeemed: z.number(),
  inr_value: z.number(),
  points_per_rupee: z.number(),
  min_withdrawal_points: z.number(),
});

const ReferralSettingsSchema = z.object({
  referee_discount_percentage: z.number(),
  referrer_reward_percentage: z.number(),
  points_per_rupee: z.number(),
  min_withdrawal_points: z.number(),
});

const ReferredUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  joined_at: z.string(),
  status: z.string(),
  has_purchased: z.boolean(),
  total_purchases_count: z.number(),
  total_purchased_amount: z.number(),
  points_earned: z.number(),
});

const CashConversionRequestSchema = z.object({
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
  updated_at: z.string(),
});

const WalletTransactionSchema = z.object({
  id: z.string(),
  wallet_id: z.string(),
  user_id: z.string(),
  type: z.enum(['credit_purchase', 'debit_conversion', 'refund_conversion_rejected', 'admin_adjustment']),
  points: z.number(),
  balance_after: z.number(),
  reference_id: z.string().nullable(),
  source_user_id: z.string().nullable(),
  description: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string(),
});

const AvailableCouponSchema = z
  .object({
    code: z.string(),
    discount_percentage: z.number(),
  })
  .nullable();

const ReferralSummarySchema = z.object({
  referral_code: z.string(),
  wallet: ReferralWalletSchema,
  settings: ReferralSettingsSchema,
  referred_users: z.array(ReferredUserSchema),
  conversion_requests: z.array(CashConversionRequestSchema),
  transactions: z.array(WalletTransactionSchema),
  available_coupon: AvailableCouponSchema,
});

export type ReferralSummary = z.infer<typeof ReferralSummarySchema>;
export type CashConversionRequest = z.infer<typeof CashConversionRequestSchema>;
export type WalletTransaction = z.infer<typeof WalletTransactionSchema>;
export type ReferredUser = z.infer<typeof ReferredUserSchema>;

/** Fetch the current student's referral code, wallet balance, referred students, and cash requests */
export async function getMyReferralSummary(): Promise<{
  data?: ReferralSummary;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user) return { error: 'Not authenticated' };

  const [error, data] = await safeFetch(
    ReferralSummarySchema,
    '/referrals/my-summary',
    {
      headers: {
        Authorization: `Bearer ${session.user.tokens.access_token}`,
      },
      cache: 'no-store',
    },
  );

  if (error) {
    return {
      error: typeof error === 'string' ? error : 'Failed to load referral summary',
    };
  }

  return { data: data! };
}

/** Request cash conversion of earned points */
export async function requestCashConversion(input: {
  points: number;
  notes?: string;
}): Promise<{ error?: string; success?: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Not authenticated' };

  const [error, data] = await safeFetch(
    z.object({
      success: z.boolean(),
      message: z.string(),
    }).passthrough(),
    '/referrals/request-conversion',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.user.tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
      cache: 'no-store',
    },
  );

  if (error) {
    return {
      error: typeof error === 'string' ? error : 'Failed to submit conversion request',
    };
  }

  revalidatePath('/dashboard/referrals');
  return { success: true, message: data?.message };
}
