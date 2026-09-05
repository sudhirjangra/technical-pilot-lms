import { z } from 'zod';

export const PaymentProfileSchema = z
  .object({
    id: z.string(),
    full_name: z.string().nullable().optional(),
    email: z.string().optional(),
    phone: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
  })
  .passthrough();

export const PaymentCourseSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    slug: z.string().nullable().optional(),
    price: z.coerce.number().nullable().optional(),
    discount_price: z.coerce.number().nullable().optional(),
    thumbnail_url: z.string().nullable().optional(),
  })
  .passthrough();

export const PaymentSchema = z
  .object({
    id: z.string(),
    student_id: z.string().nullable().optional(),
    course_id: z.string().nullable().optional(),
    amount: z.coerce.number().default(0),
    discount_amount: z.coerce.number().nullable().optional(),
    razorpay_order_id: z.string().nullable().optional(),
    razorpay_payment_id: z.string().nullable().optional(),
    razorpay_signature: z.string().nullable().optional(),
    status: z.string(),
    refund_reason: z.string().nullable().optional(),
    invoice_number: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string().nullable().optional(),
    profiles: PaymentProfileSchema.nullable().optional(),
    courses: PaymentCourseSchema.nullable().optional(),
  })
  .passthrough();

export const PaymentsResponseSchema = z
  .object({
    data: z.array(PaymentSchema),
  })
  .passthrough();

export type Payment = z.infer<typeof PaymentSchema>;
