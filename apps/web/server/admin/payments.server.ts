'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const PaymentSchema = z
  .object({
    id: z.string(),
    student_id: z.string().nullable().optional(),
    course_id: z.string().nullable().optional(),
    amount: z.coerce.number().default(0),
    discount_amount: z.coerce.number().nullable().optional(),
    razorpay_order_id: z.string().nullable().optional(),
    razorpay_payment_id: z.string().nullable().optional(),
    status: z.string(),
    created_at: z.string(),
    profiles: z
      .object({
        id: z.string(),
        full_name: z.string().nullable().optional(),
        email: z.string().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    courses: z
      .object({ id: z.string(), title: z.string().optional() })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

const PaymentsResponseSchema = z
  .object({
    data: z.array(PaymentSchema),
  })
  .passthrough();

export type Payment = z.infer<typeof PaymentSchema>;

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
