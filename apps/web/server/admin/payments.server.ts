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
