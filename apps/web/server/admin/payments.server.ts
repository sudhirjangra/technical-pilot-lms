'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const PaymentSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  course_id: z.string(),
  amount: z.coerce.number(),
  discount_amount: z.coerce.number(),
  razorpay_order_id: z.string().nullable(),
  razorpay_payment_id: z.string().nullable(),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']),
  created_at: z.string(),
  profiles: z.object({ id: z.string(), full_name: z.string().nullable(), email: z.string() }).nullable(),
  courses: z.object({ id: z.string(), title: z.string() }).nullable(),
});

const PaymentsResponseSchema = z.object({
  data: z.array(PaymentSchema),
});

export type Payment = z.infer<typeof PaymentSchema>;

export async function getPayments(): Promise<Payment[]> {
  const session = await auth();
  const [error, data] = await safeFetch(PaymentsResponseSchema, '/payments', {
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
    cache: 'no-store',
  });
  if (error) return [];
  return data!.data;
}
