import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import { MailService } from '@/features/mail/mail.service';
import { ReferralsService } from '@/features/referrals/referrals.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'crypto';
import { Logger } from 'nestjs-pino';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let supabaseMock: any;
  let configMock: any;
  let mailServiceMock: any;
  let referralsServiceMock: any;
  let loggerMock: any;

  const mockKeyId = 'rzp_test_mock_key';
  const mockKeySecret = 'rzp_test_mock_secret';
  const mockWebhookSecret = 'rzp_test_webhook_secret';

  beforeEach(async () => {
    loggerMock = {
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };

    configMock = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'RAZORPAY_KEY_ID') return mockKeyId;
        if (key === 'RAZORPAY_KEY_SECRET') return mockKeySecret;
        if (key === 'RAZORPAY_WEBHOOK_SECRET') return mockWebhookSecret;
        throw new Error(`Unexpected config key: ${key}`);
      }),
    };

    mailServiceMock = {
      sendEmail: jest.fn().mockResolvedValue(true),
    };

    referralsServiceMock = {
      validateCoupon: jest.fn(),
      awardReferralReward: jest.fn().mockResolvedValue(true),
      recordCouponUsage: jest.fn().mockResolvedValue(true),
    };

    supabaseMock = {
      from: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: SUPABASE_ADMIN, useValue: supabaseMock },
        { provide: ConfigService, useValue: configMock },
        { provide: MailService, useValue: mailServiceMock },
        { provide: ReferralsService, useValue: referralsServiceMock },
        { provide: Logger, useValue: loggerMock },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('recordPaymentFailure', () => {
    it('should mark a pending payment as failed and store razorpay_payment_id', async () => {
      const existing = { id: 'pmt-1', status: 'pending', razorpay_payment_id: null };
      const updated = { ...existing, status: 'failed', razorpay_payment_id: 'pay_fail123' };

      const singleSelectMock = jest.fn().mockResolvedValue({ data: existing, error: null });
      const eqStudentMock = jest.fn().mockReturnValue({ maybeSingle: singleSelectMock });
      const eqOrderMock = jest.fn().mockReturnValue({ eq: eqStudentMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqOrderMock });

      const singleUpdateMock = jest.fn().mockResolvedValue({ data: updated, error: null });
      const selectAfterUpdate = jest.fn().mockReturnValue({ single: singleUpdateMock });
      const eqIdUpdateMock = jest.fn().mockReturnValue({ select: selectAfterUpdate });
      const updateMock = jest.fn().mockReturnValue({ eq: eqIdUpdateMock });

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: selectMock,
            update: updateMock,
          };
        }
        return {};
      });

      const result = await service.recordPaymentFailure(
        {
          razorpay_order_id: 'order_123',
          razorpay_payment_id: 'pay_fail123',
          error_description: 'Declined by bank',
          error_code: 'BAD_REQUEST_ERROR',
        },
        'student-1',
      );

      expect(result.status).toBe('failed');
      expect(result.payment.status).toBe('failed');
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          razorpay_payment_id: 'pay_fail123',
        }),
      );
    });

    it('should not overwrite an already completed payment', async () => {
      const existing = { id: 'pmt-1', status: 'completed', razorpay_payment_id: 'pay_succ123' };

      supabaseMock.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: existing, error: null }),
            }),
          }),
        }),
      });

      const result = await service.recordPaymentFailure(
        {
          razorpay_order_id: 'order_123',
          razorpay_payment_id: 'pay_late_fail',
        },
        'student-1',
      );

      expect(result.status).toBe('completed');
      expect(result.message).toContain('already completed');
    });

    it('should throw NotFoundException if payment not found', async () => {
      supabaseMock.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      await expect(
        service.recordPaymentFailure(
          { razorpay_order_id: 'order_nonexistent' },
          'student-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyPayment', () => {
    it('should throw ForbiddenException if signature does not match', async () => {
      await expect(
        service.verifyPayment(
          {
            razorpay_order_id: 'order_123',
            razorpay_payment_id: 'pay_123',
            razorpay_signature: 'invalid_sig',
          },
          'student-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should verify signature, update status to completed, and activate enrollment', async () => {
      const orderId = 'order_123';
      const paymentId = 'pay_123';
      const validSig = createHmac('sha256', mockKeySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const pendingPayment = {
        id: 'pmt-1',
        student_id: 'student-1',
        course_id: 'course-1',
        amount: 2999,
        invoice_number: 'INV-123',
        razorpay_order_id: orderId,
        status: 'pending',
      };

      const completedPayment = { ...pendingPayment, status: 'completed', razorpay_payment_id: paymentId };

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: pendingPayment, error: null }),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  in: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({ data: completedPayment, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'enrollments') {
          return {
            upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === 'profiles' || table === 'courses') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: { title: 'Test Course', email: 'test@example.com' }, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await service.verifyPayment(
        {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSig,
        },
        'student-1',
      );

      expect(result.message).toContain('Payment verified');
      expect(result.payment.status).toBe('completed');
    });
  });

  describe('handleWebhook', () => {
    it('should throw ForbiddenException if webhook signature is invalid', async () => {
      await expect(
        service.handleWebhook({ event: 'payment.captured' }, 'bad_sig'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should mark payment failed when event is payment.failed', async () => {
      const body = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_fail_webhook',
              order_id: 'order_webhook_fail',
            },
          },
        },
      };

      const validSig = createHmac('sha256', mockWebhookSecret)
        .update(JSON.stringify(body))
        .digest('hex');

      const inMock = jest.fn().mockResolvedValue({ data: null, error: null });
      const eqOrderMock = jest.fn().mockReturnValue({ in: inMock });
      const updateMock = jest.fn().mockReturnValue({ eq: eqOrderMock });

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'payments') {
          return { update: updateMock };
        }
        return {};
      });

      const res = await service.handleWebhook(body, validSig);
      expect(res.received).toBe(true);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          razorpay_payment_id: 'pay_fail_webhook',
        }),
      );
    });
  });
});
