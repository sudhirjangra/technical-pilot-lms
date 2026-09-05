'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import {
  PaymentsResponseSchema,
  type Payment,
} from './payments.types';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function getPayments(): Promise<Payment[]> {
  const session = await auth();
  const [error, data] = await safeFetch(PaymentsResponseSchema, '/payments', {
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
    cache: 'no-store',
  });
  if (error) {
    console.error('getPayments failed:', error);
    return [];
  }
  return data!.data;
}

export async function refundPayment(
  paymentId: string,
  payload: { reason: string; amount?: number },
) {
  const session = await auth();
  if (!session?.user?.tokens.access_token) {
    return { error: 'Unauthorized: Session expired' };
  }

  const [error, data] = await safeFetch(
    z.object({ message: z.string().optional() }).passthrough(),
    `/payments/${paymentId}/refund`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.user.tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    },
  );

  if (error) {
    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as any).message)
        : typeof error === 'string'
          ? error
          : 'Failed to process refund';
    return { error: message };
  }

  revalidatePath('/admin/payments');
  return { success: true, message: data?.message ?? 'Payment refunded successfully' };
}
