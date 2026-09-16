'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const StudentPaymentSchema = z
  .object({
    id: z.string(),
    student_id: z.string(),
    course_id: z.string(),
    amount: z.coerce.number(),
    currency: z.string().default('INR'),
    status: z.string(),
    razorpay_order_id: z.string().nullable().optional(),
    razorpay_payment_id: z.string().nullable().optional(),
    invoice_number: z.string().nullable().optional(),
    created_at: z.string(),
    courses: z
      .object({
        id: z.string(),
        title: z.string(),
        slug: z.string(),
        thumbnail_url: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

export type StudentPayment = z.infer<typeof StudentPaymentSchema>;

export async function getMyPayments(): Promise<StudentPayment[]> {
  const session = await auth();
  if (!session?.user?.tokens?.access_token) return [];

  const [error, data] = await safeFetch(
    z.array(StudentPaymentSchema),
    '/payments/my',
    {
      headers: {
        Authorization: `Bearer ${session.user.tokens.access_token}`,
      },
      cache: 'no-store',
    },
  );

  if (error) {
    console.error('getMyPayments failed:', error);
    return [];
  }

  return data ?? [];
}
