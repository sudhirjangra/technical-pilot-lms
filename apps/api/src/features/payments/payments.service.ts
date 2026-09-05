import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import { CreateOrderDto, RefundPaymentDto, VerifyPaymentDto } from './dto';

@Injectable()
export class PaymentsService {
  private readonly razorpayKeyId: string;
  private readonly razorpayKeySecret: string;

  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly config: ConfigService,
  ) {
    this.razorpayKeyId = this.config.getOrThrow<string>('RAZORPAY_KEY_ID');
    this.razorpayKeySecret = this.config.getOrThrow<string>(
      'RAZORPAY_KEY_SECRET',
    );
  }

  /** Create a Razorpay order and store pending payment record */
  async createOrder(dto: CreateOrderDto, studentId: string) {
    // Check course exists and is published
    const { data: course, error: courseErr } = await this.supabase
      .from('courses')
      .select('id, title, price, discount_price, status')
      .eq('id', dto.course_id)
      .single();
    if (courseErr || !course) throw new NotFoundException('Course not found');
    if (course.status !== 'published')
      throw new BadRequestException('Course is not available for purchase');

    // Check not already actively enrolled
    const { data: existing } = await this.supabase
      .from('enrollments')
      .select('id, status')
      .eq('student_id', studentId)
      .eq('course_id', dto.course_id)
      .in('status', ['active', 'completed'])
      .maybeSingle();
    if (existing)
      throw new BadRequestException('Already enrolled in this course');

    const amount = course.discount_price ?? course.price;
    const discountAmount = course.discount_price
      ? course.price - course.discount_price
      : 0;

    // Create Razorpay order via API
    const orderPayload = {
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { course_id: dto.course_id, student_id: studentId },
    };

    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.razorpayKeyId}:${this.razorpayKeySecret}`).toString('base64')}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!razorpayRes.ok) {
      const err = await razorpayRes.json();
      throw new BadRequestException(
        err.error?.description ?? 'Failed to create payment order',
      );
    }

    const order = await razorpayRes.json();

    // Store pending payment
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { data: payment, error } = await this.supabase
      .from('payments')
      .insert({
        student_id: studentId,
        course_id: dto.course_id,
        amount,
        discount_amount: discountAmount,
        razorpay_order_id: order.id,
        invoice_number: invoiceNumber,
        status: 'pending',
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);

    return {
      payment_id: payment.id,
      razorpay_order_id: order.id,
      razorpay_key_id: this.razorpayKeyId,
      amount: order.amount,
      currency: order.currency,
      course_title: course.title,
    };
  }

  /** Verify Razorpay payment signature and activate enrollment */
  async verifyPayment(dto: VerifyPaymentDto, studentId: string) {
    // Verify signature
    const expectedSignature = createHmac('sha256', this.razorpayKeySecret)
      .update(`${dto.razorpay_order_id}|${dto.razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== dto.razorpay_signature) {
      throw new ForbiddenException('Invalid payment signature');
    }

    // Webhooks can complete the payment before the browser reaches this endpoint.
    const { data: existingPayment, error: lookupError } = await this.supabase
      .from('payments')
      .select('*')
      .eq('razorpay_order_id', dto.razorpay_order_id)
      .eq('student_id', studentId)
      .single();

    if (lookupError || !existingPayment)
      throw new BadRequestException('Payment record not found');
    if (
      existingPayment.razorpay_payment_id &&
      existingPayment.razorpay_payment_id !== dto.razorpay_payment_id
    ) {
      throw new BadRequestException('Payment ID does not match the order');
    }

    if (existingPayment.status === 'completed') {
      await this.supabase
        .from('enrollments')
        .upsert(
          {
            student_id: studentId,
            course_id: existingPayment.course_id,
            status: 'active',
            enrolled_at: new Date().toISOString(),
          },
          { onConflict: 'student_id,course_id' },
        );
      return { message: 'Payment already verified, enrollment activated', payment: existingPayment };
    }

    if (existingPayment.status !== 'pending')
      throw new BadRequestException('Payment is not awaiting verification');

    // Update payment record
    const { data: payment, error } = await this.supabase
      .from('payments')
      .update({
        razorpay_payment_id: dto.razorpay_payment_id,
        razorpay_signature: dto.razorpay_signature,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_order_id', dto.razorpay_order_id)
      .eq('student_id', studentId)
      .eq('status', 'pending')
      .select('*')
      .single();
    if (error || !payment)
      throw new BadRequestException(
        'Payment record not found or already processed',
      );

    // Create enrollment
    await this.supabase
      .from('enrollments')
      .upsert(
        {
          student_id: studentId,
          course_id: payment.course_id,
          status: 'active',
          enrolled_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,course_id' },
      );

    return { message: 'Payment verified, enrollment activated', payment };
  }

  /** Razorpay webhook handler — server-to-server signature verification */
  async handleWebhook(body: Record<string, unknown>, signature: string) {
    const webhookSecret = this.config.getOrThrow<string>(
      'RAZORPAY_WEBHOOK_SECRET',
    );
    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    const event = body['event'] as string;
    const payload = body['payload'] as Record<string, unknown>;

    if (event === 'payment.captured') {
      const paymentEntity = (payload['payment'] as Record<string, unknown>)[
        'entity'
      ] as Record<string, unknown>;
      const orderId = paymentEntity['order_id'] as string;
      const paymentId = paymentEntity['id'] as string;

      // Mark payment completed if still pending
      const { data: payment } = await this.supabase
        .from('payments')
        .update({
          razorpay_payment_id: paymentId,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('razorpay_order_id', orderId)
        .eq('status', 'pending')
        .select('student_id, course_id')
        .single();

      if (payment) {
        // Ensure enrollment exists
        await this.supabase
          .from('enrollments')
          .upsert(
            {
              student_id: payment.student_id,
              course_id: payment.course_id,
              status: 'active',
              enrolled_at: new Date().toISOString(),
            },
            { onConflict: 'student_id,course_id' },
          );
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = (payload['payment'] as Record<string, unknown>)[
        'entity'
      ] as Record<string, unknown>;
      const orderId = paymentEntity['order_id'] as string;
      const paymentId = paymentEntity['id'] as string;

      await this.supabase
        .from('payments')
        .update({ razorpay_payment_id: paymentId, status: 'failed' })
        .eq('razorpay_order_id', orderId)
        .eq('status', 'pending');
    }

    return { received: true };
  }

  /** Admin: list all payments with filters */
  async findAll(filters?: {
    status?: string;
    course_id?: string;
    student_id?: string;
  }) {
    let query = this.supabase
      .from('payments')
      .select(
        '*, profiles(id, full_name, email, phone, avatar_url), courses(id, title, slug, price, discount_price, thumbnail_url)',
      )
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.course_id && filters.course_id !== 'all') {
      query = query.eq('course_id', filters.course_id);
    }
    if (filters?.student_id) query = query.eq('student_id', filters.student_id);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /** Student: get own payment history */
  async findByStudent(studentId: string) {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*, courses(id, title, slug, thumbnail_url)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /** Admin: refund a payment */
  async refund(paymentId: string, dto: RefundPaymentDto) {
    const { data: payment, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('status', 'completed')
      .single();
    if (error || !payment)
      throw new NotFoundException('Completed payment not found');

    const refundAmount = dto.amount ?? payment.amount;

    // Call Razorpay refund API if credentials and payment id are valid
    if (
      this.razorpayKeyId &&
      this.razorpayKeySecret &&
      payment.razorpay_payment_id &&
      !payment.razorpay_payment_id.startsWith('mock_')
    ) {
      try {
        const res = await fetch(
          `https://api.razorpay.com/v1/payments/${payment.razorpay_payment_id}/refund`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Basic ${Buffer.from(`${this.razorpayKeyId}:${this.razorpayKeySecret}`).toString('base64')}`,
            },
            body: JSON.stringify({
              amount: Math.round(refundAmount * 100),
              notes: { reason: dto.reason },
            }),
          },
        );

        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as Record<string, any>;
          const desc = err?.error?.description;
          if (this.config.get('NODE_ENV') === 'production') {
            throw new BadRequestException(desc ?? 'Refund failed with payment gateway');
          } else {
            console.warn('Razorpay refund failed in non-production:', desc ?? err);
          }
        }
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        if (this.config.get('NODE_ENV') === 'production') {
          throw new BadRequestException('Failed to communicate with payment gateway');
        } else {
          console.warn('Razorpay gateway refund error in non-production:', err);
        }
      }
    }

    // Update payment status
    const { error: updateError } = await this.supabase
      .from('payments')
      .update({
        status: 'refunded',
        refund_reason: dto.reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (updateError) {
      throw new BadRequestException(updateError.message);
    }

    // Expire enrollment
    await this.supabase
      .from('enrollments')
      .update({ status: 'expired' })
      .eq('student_id', payment.student_id)
      .eq('course_id', payment.course_id);

    return { message: 'Payment refunded, enrollment expired' };
  }
}
