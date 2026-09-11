import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { ReferralsService } from './referrals.service';

describe('ReferralsService', () => {
  let service: ReferralsService;
  let supabaseMock: any;
  let loggerMock: any;

  beforeEach(async () => {
    loggerMock = {
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };

    supabaseMock = {
      from: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralsService,
        { provide: SUPABASE_ADMIN, useValue: supabaseMock },
        { provide: Logger, useValue: loggerMock },
      ],
    }).compile();

    service = module.get<ReferralsService>(ReferralsService);
  });

  describe('generateReferralCode', () => {
    it('should generate a code starting with TP containing both letters and digits', () => {
      for (let i = 0; i < 20; i++) {
        const code = service.generateReferralCode();
        expect(code.startsWith('TP')).toBe(true);
        expect(code.length).toBe(8);
        expect(/\d/.test(code)).toBe(true);
        expect(/[A-Z]/.test(code.slice(2))).toBe(true);
      }
    });
  });

  describe('ensureUserReferralCode', () => {
    it('should return existing referral code if present and has digits', async () => {
      supabaseMock.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'user-1', referral_code: 'TPABC123' },
              error: null,
            }),
          }),
        }),
      });

      const code = await service.ensureUserReferralCode('user-1');
      expect(code).toBe('TPABC123');
    });

    it('should regenerate referral code if existing code has no numeric digits', async () => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      supabaseMock.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValueOnce({
                data: { id: 'user-1', referral_code: 'TPAKXMAE' }, // No digits
                error: null,
              })
              .mockResolvedValueOnce({
                data: null, // collision check
                error: null,
              }),
          }),
        }),
        update: updateMock,
      });

      const code = await service.ensureUserReferralCode('user-1');
      expect(code.startsWith('TP')).toBe(true);
      expect(/\d/.test(code)).toBe(true);
      expect(updateMock).toHaveBeenCalled();
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      supabaseMock.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      await expect(
        service.ensureUserReferralCode('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('processSignupReferral', () => {
    it('should reject self-referral', async () => {
      supabaseMock.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'user-1',
                is_active: true,
                referral_code: 'TPSELF01',
              },
              error: null,
            }),
          }),
        }),
      });

      await expect(
        service.processSignupReferral('user-1', 'TPSELF01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid or non-existent referral code', async () => {
      supabaseMock.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      await expect(
        service.processSignupReferral('user-2', 'TPINVALID'),
      ).rejects.toThrow('Invalid referral code');
    });
  });

  describe('awardReferralReward', () => {
    it('should safely do nothing if no referral exists for student', async () => {
      supabaseMock.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const result = await service.awardReferralReward(
        'pay-1',
        'student-1',
        1000,
        'course-1',
      );
      expect(result.rewarded).toBe(false);
    });

    it('should be idempotent and skip if reward was already granted', async () => {
      // 1st call for referrals: found
      // 2nd call for wallet_transactions: found existing
      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'referrals') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { referrer_id: 'ref-1', referee_id: 'student-1' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'wallet_transactions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { id: 'tx-1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await service.awardReferralReward(
        'pay-1',
        'student-1',
        1000,
        'course-1',
      );
      expect(result.rewarded).toBe(false);
      expect(result.reason).toContain('Reward already granted');
    });
  });

  describe('requestCashConversion', () => {
    it('should reject conversion request if points are below minimum', async () => {
      supabaseMock.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                min_withdrawal_points: 500,
                points_per_rupee: 5,
                is_active: true,
              },
              error: null,
            }),
          }),
        }),
      });

      await expect(
        service.requestCashConversion('user-1', { points: 100 }),
      ).rejects.toThrow('Minimum conversion is 500 points');
    });

    it('should reject conversion request if wallet balance is insufficient', async () => {
      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'referral_settings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    min_withdrawal_points: 500,
                    points_per_rupee: 5,
                    is_active: true,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'user_wallets') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'wallet-1',
                    current_balance: 300,
                    total_earned: 300,
                    total_redeemed: 0,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      await expect(
        service.requestCashConversion('user-1', { points: 600 }),
      ).rejects.toThrow('Insufficient points balance');
    });
  });

  describe('recordCouponUsage', () => {
    it('should increment times_used when a coupon is used on purchase', async () => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'coupons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'coupon-1',
                    code: 'WELCOME-123',
                    times_used: 0,
                    max_uses: 1,
                  },
                  error: null,
                }),
              }),
            }),
            update: updateMock,
          };
        }
        if (table === 'payments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  count: 1,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      await service.recordCouponUsage('WELCOME-123', 'student-1', 'pay-1');
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ times_used: 1 }),
      );
    });
  });
});
