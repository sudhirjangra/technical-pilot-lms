import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { Logger } from 'nestjs-pino';
import {
  RequestCashConversionDto,
  UpdateConversionStatusDto,
  UpdateReferralSettingsDto,
} from './dto/referral.dto';

export interface ReferralSettings {
  id: number;
  referee_discount_percentage: number;
  referrer_reward_percentage: number;
  points_per_rupee: number;
  min_withdrawal_points: number;
  is_active: boolean;
}

@Injectable()
export class ReferralsService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly logger: Logger,
  ) {}

  /** Helper to extract string userId whether passed as string or user payload object */
  private resolveUserId(userOrId: any): string {
    if (!userOrId) return '';
    if (typeof userOrId === 'string') return userOrId;
    return userOrId.id || userOrId.sub || String(userOrId);
  }

  /**
   * Generate a secure unique referral code with TP prefix.
   * Guaranteed to contain both uppercase letters and numeric numbers (e.g. TP7K9X2B).
   */
  generateReferralCode(): string {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '23456789';

    // Pick 3 random letters and 3 random digits
    const chars: string[] = [];
    const letterBytes = randomBytes(3);
    for (let i = 0; i < 3; i++) {
      chars.push(letters[letterBytes[i] % letters.length]);
    }

    const digitBytes = randomBytes(3);
    for (let i = 0; i < 3; i++) {
      chars.push(digits[digitBytes[i] % digits.length]);
    }

    // Fisher-Yates shuffle using cryptographically secure random bytes
    const shuffleBytes = randomBytes(chars.length);
    for (let i = chars.length - 1; i > 0; i--) {
      const j = shuffleBytes[i] % (i + 1);
      const temp = chars[i];
      chars[i] = chars[j];
      chars[j] = temp;
    }

    return `TP${chars.join('')}`;
  }

  /** Ensure a profile has a unique TP referral code with numeric digits */
  async ensureUserReferralCode(
    userOrId: string | { id?: string; sub?: string },
  ): Promise<string> {
    const userId = this.resolveUserId(userOrId);
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select('id, referral_code')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `Failed to lookup profile for user ${userId}: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to lookup profile: ${error.message}`,
      );
    }

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    // If referral code exists and already contains numeric digits, return it
    const hasNumbers = /\d/.test(profile.referral_code || '');
    if (profile.referral_code && hasNumbers) {
      return profile.referral_code;
    }

    // Generate unique code with numbers and retry on collision
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = this.generateReferralCode();
      const { data: existing } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', code)
        .maybeSingle();

      if (!existing) {
        const { error: updateErr } = await this.supabase
          .from('profiles')
          .update({ referral_code: code })
          .eq('id', userId);

        if (!updateErr) return code;
      }
    }

    // Fallback timestamp-based code with guaranteed numbers
    const fallbackCode = `TP${Date.now().toString().slice(-4)}${randomBytes(2).toString('hex').toUpperCase().slice(0, 2)}`;
    await this.supabase
      .from('profiles')
      .update({ referral_code: fallbackCode })
      .eq('id', userId);
    return fallbackCode;
  }

  /** Get or initialize credit wallet for user */
  async getOrCreateWallet(userOrId: string | { id?: string; sub?: string }) {
    const userId = this.resolveUserId(userOrId);
    const { data: wallet } = await this.supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (wallet) return wallet;

    const { data: newWallet, error: createErr } = await this.supabase
      .from('user_wallets')
      .insert({
        user_id: userId,
        current_balance: 0,
        total_earned: 0,
        total_redeemed: 0,
      })
      .select('*')
      .single();

    if (createErr) {
      // Could be concurrent insertion, fetch again
      const { data: retryWallet } = await this.supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (retryWallet) return retryWallet;
      throw new BadRequestException('Failed to initialize user wallet');
    }

    return newWallet;
  }

  /** Get active referral settings */
  async getSettings(): Promise<ReferralSettings> {
    const { data, error } = await this.supabase
      .from('referral_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) {
      return {
        id: 1,
        referee_discount_percentage: 20,
        referrer_reward_percentage: 10,
        points_per_rupee: 5,
        min_withdrawal_points: 500,
        is_active: true,
      };
    }

    return {
      id: 1,
      referee_discount_percentage:
        Number(data.referee_discount_percentage) || 20,
      referrer_reward_percentage: Number(data.referrer_reward_percentage) || 10,
      points_per_rupee: Number(data.points_per_rupee) || 5,
      min_withdrawal_points: Number(data.min_withdrawal_points) || 500,
      is_active: data.is_active ?? true,
    };
  }

  /** Update referral settings (Admin only) */
  async updateSettings(dto: UpdateReferralSettingsDto, adminId: string) {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    };

    if (dto.referee_discount_percentage !== undefined)
      updates.referee_discount_percentage = dto.referee_discount_percentage;
    if (dto.referrer_reward_percentage !== undefined)
      updates.referrer_reward_percentage = dto.referrer_reward_percentage;
    if (dto.points_per_rupee !== undefined)
      updates.points_per_rupee = dto.points_per_rupee;
    if (dto.min_withdrawal_points !== undefined)
      updates.min_withdrawal_points = dto.min_withdrawal_points;
    if (dto.is_active !== undefined) updates.is_active = dto.is_active;

    const { data, error } = await this.supabase
      .from('referral_settings')
      .upsert({ id: 1, ...updates })
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /**
   * Process signup referral: links referee with referrer, stores referral record,
   * creates an exclusive personal coupon for referee, and notifies referrer.
   */
  async processSignupReferral(
    newUserIdOrObj: string | { id?: string; sub?: string },
    referralCode?: string,
  ) {
    const newUserId = this.resolveUserId(newUserIdOrObj);
    if (!referralCode || !referralCode.trim()) return null;

    const cleanCode = referralCode.trim().toUpperCase();

    // Find referrer profile
    const { data: referrer, error: referrerErr } = await this.supabase
      .from('profiles')
      .select('id, full_name, email, referral_code, is_active')
      .eq('referral_code', cleanCode)
      .maybeSingle();

    if (referrerErr || !referrer) {
      throw new BadRequestException('Invalid referral code');
    }

    if (referrer.id === newUserId) {
      throw new BadRequestException('You cannot refer yourself');
    }

    if (!referrer.is_active) {
      throw new BadRequestException(
        'Referral code belongs to an inactive user',
      );
    }

    // Check if referral relationship already recorded
    const { data: existingReferral } = await this.supabase
      .from('referrals')
      .select('id')
      .eq('referee_id', newUserId)
      .maybeSingle();

    if (existingReferral) {
      return existingReferral;
    }

    // Record referral relationship
    const { data: referral, error: refInsertErr } = await this.supabase
      .from('referrals')
      .insert({
        referrer_id: referrer.id,
        referee_id: newUserId,
        referral_code: cleanCode,
        status: 'registered',
        total_purchases_count: 0,
        total_purchased_amount: 0,
        total_points_awarded: 0,
      })
      .select('*')
      .single();

    if (refInsertErr) {
      this.logger.error({ refInsertErr }, 'Failed to insert referral');
      return null;
    }

    // Link in profiles
    await this.supabase
      .from('profiles')
      .update({ referred_by: referrer.id })
      .eq('id', newUserId);

    // Fetch settings for coupon discount percentage
    const settings = await this.getSettings();

    // Create exclusive welcome coupon for the referee
    // Coupon code is tied to referee's account
    const couponCode = `WELCOME-${cleanCode}-${newUserId.slice(0, 4).toUpperCase()}`;
    await this.supabase.from('coupons').insert({
      code: couponCode,
      discount_percentage: settings.referee_discount_percentage,
      applicable_user_id: newUserId,
      max_uses: 1,
      times_used: 0,
      is_active: true,
    });

    // Notify referrer
    const { data: refereeProfile } = await this.supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', newUserId)
      .single();

    const refereeName = refereeProfile?.full_name || 'A friend';
    await this.supabase.from('notifications').insert({
      recipient_id: referrer.id,
      title: 'New Referral Sign Up! 🎉',
      body: `${refereeName} joined Technical Pilot using your referral code (${cleanCode}). When they enroll in a course, you will earn reward points!`,
      type: 'referral_joined',
      metadata: { referee_id: newUserId, referral_code: cleanCode },
    });

    return referral;
  }

  /**
   * Validate coupon code for a student and course.
   * Supports:
   * 1. Personal / referee coupon in `coupons` table.
   * 2. Direct referral code of the referrer if the student was referred by that code.
   * Rejects other students from using a referral discount coupon that does not belong to them.
   */
  async validateCoupon(
    code: string,
    studentOrId: string | { id?: string; sub?: string },
    courseId: string,
  ) {
    const studentId = this.resolveUserId(studentOrId);
    if (!code || !code.trim()) {
      throw new BadRequestException('Coupon code is required');
    }

    const cleanCode = code.trim().toUpperCase();
    const settings = await this.getSettings();

    // Fetch course details
    const { data: course, error: courseErr } = await this.supabase
      .from('courses')
      .select('id, title, price, discount_price')
      .eq('id', courseId)
      .single();

    if (courseErr || !course) {
      throw new NotFoundException('Course not found');
    }

    const basePrice = course.discount_price ?? course.price;

    // 1. Check coupons table
    const { data: couponRecord } = await this.supabase
      .from('coupons')
      .select('*')
      .eq('code', cleanCode)
      .eq('is_active', true)
      .maybeSingle();

    if (couponRecord) {
      // Verify applicable user
      if (
        couponRecord.applicable_user_id &&
        couponRecord.applicable_user_id !== studentId
      ) {
        throw new BadRequestException(
          'Invalid coupon code: This referral coupon is exclusive to the referred student.',
        );
      }

      // Check both times_used on coupon record as well as completed payments count
      const { count: completedCount } = await this.supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_code', cleanCode)
        .eq('status', 'completed');

      const effectiveUses = Math.max(
        couponRecord.times_used || 0,
        completedCount ?? 0,
      );

      if (effectiveUses >= couponRecord.max_uses) {
        if (couponRecord.times_used !== effectiveUses) {
          await this.supabase
            .from('coupons')
            .update({ times_used: effectiveUses })
            .eq('id', couponRecord.id);
        }
        throw new BadRequestException(
          'This coupon code has already been used.',
        );
      }

      if (
        couponRecord.valid_until &&
        new Date(couponRecord.valid_until) < new Date()
      ) {
        throw new BadRequestException('This coupon has expired.');
      }

      const discountPercent = Number(couponRecord.discount_percentage);
      const discountAmount = Math.round((basePrice * discountPercent) / 100);
      const finalPrice = Math.max(0, basePrice - discountAmount);

      return {
        valid: true,
        code: cleanCode,
        discount_percentage: discountPercent,
        discount_amount: discountAmount,
        original_price: basePrice,
        final_price: finalPrice,
      };
    }

    // 2. Check if student entered their referrer's referral code directly (e.g. TP8K9X)
    const { data: referralRel } = await this.supabase
      .from('referrals')
      .select('id, referrer_id, referral_code')
      .eq('referee_id', studentId)
      .eq('referral_code', cleanCode)
      .maybeSingle();

    if (referralRel) {
      // Check if student already completed a purchase with this referral discount
      const { data: usedPayment } = await this.supabase
        .from('payments')
        .select('id')
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .eq('coupon_code', cleanCode)
        .maybeSingle();

      if (usedPayment) {
        throw new BadRequestException(
          'You have already applied this referral discount on a previous purchase.',
        );
      }

      const discountPercent = settings.referee_discount_percentage;
      const discountAmount = Math.round((basePrice * discountPercent) / 100);
      const finalPrice = Math.max(0, basePrice - discountAmount);

      return {
        valid: true,
        code: cleanCode,
        discount_percentage: discountPercent,
        discount_amount: discountAmount,
        original_price: basePrice,
        final_price: finalPrice,
      };
    }

    // Any other case is invalid
    throw new BadRequestException('Invalid coupon code');
  }

  /**
   * Record coupon usage upon completed course purchase.
   * Atomically and idempotently updates `times_used` in the `coupons` table
   * based on the count of completed payments associated with the coupon.
   */
  async recordCouponUsage(
    couponCode?: string | null,
    studentId?: string,
    paymentId?: string,
  ): Promise<void> {
    if (!couponCode || !couponCode.trim()) return;

    const cleanCode = couponCode.trim().toUpperCase();

    try {
      const { data: coupon } = await this.supabase
        .from('coupons')
        .select('id, times_used, max_uses')
        .eq('code', cleanCode)
        .maybeSingle();

      if (!coupon) return;

      // Count total completed payments for this coupon code
      const { count: completedCount } = await this.supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_code', cleanCode)
        .eq('status', 'completed');

      const actualUses = Math.max(
        (coupon.times_used || 0) + 1,
        completedCount ?? 1,
      );

      await this.supabase
        .from('coupons')
        .update({
          times_used: actualUses,
        })
        .eq('id', coupon.id);

      this.logger.log(
        `Recorded coupon usage for ${cleanCode}: times_used updated to ${actualUses}`,
      );
    } catch (err) {
      this.logger.error(
        { err, couponCode, studentId, paymentId },
        `Failed to record coupon usage for ${cleanCode}`,
      );
    }
  }

  /**
   * Award referral reward to referrer when referee completes a course purchase.
   * Completely idempotent: unique (reference_id, type) ensures duplicate calls cannot double-credit.
   */
  async awardReferralReward(
    paymentId: string,
    studentId: string,
    amountPaid: number,
    courseId: string,
  ) {
    try {
      // Check if student was referred
      const { data: referral, error: refErr } = await this.supabase
        .from('referrals')
        .select('*')
        .eq('referee_id', studentId)
        .maybeSingle();

      if (refErr || !referral) {
        return { rewarded: false, reason: 'No referral relationship found' };
      }

      // Check idempotency in immutable ledger
      const { data: existingTx } = await this.supabase
        .from('wallet_transactions')
        .select('id')
        .eq('reference_id', paymentId)
        .eq('type', 'credit_purchase')
        .maybeSingle();

      if (existingTx) {
        return {
          rewarded: false,
          reason: 'Reward already granted for this payment',
        };
      }

      const settings = await this.getSettings();
      if (!settings.is_active) {
        return {
          rewarded: false,
          reason: 'Referral program currently inactive',
        };
      }

      // Calculate reward
      const inrReward =
        amountPaid * (settings.referrer_reward_percentage / 100);
      const pointsToAward = Math.floor(inrReward * settings.points_per_rupee);

      if (pointsToAward <= 0) {
        return {
          rewarded: false,
          reason: 'Purchase amount too low for points',
        };
      }

      // Get or create referrer wallet
      const wallet = await this.getOrCreateWallet(referral.referrer_id);
      const newBalance = wallet.current_balance + pointsToAward;
      const newTotalEarned = wallet.total_earned + pointsToAward;

      // Update wallet balance
      const { error: walletErr } = await this.supabase
        .from('user_wallets')
        .update({
          current_balance: newBalance,
          total_earned: newTotalEarned,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wallet.id);

      if (walletErr) {
        this.logger.error(
          { walletErr },
          'Failed to update referrer wallet balance',
        );
        throw new BadRequestException('Failed to credit referral points');
      }

      // Record immutable ledger entry
      await this.supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        user_id: referral.referrer_id,
        type: 'credit_purchase',
        points: pointsToAward,
        balance_after: newBalance,
        reference_id: paymentId,
        source_user_id: studentId,
        description: `Referral reward for friend course enrollment`,
        metadata: {
          payment_id: paymentId,
          course_id: courseId,
          amount_paid: amountPaid,
          reward_percentage: settings.referrer_reward_percentage,
          points_per_rupee: settings.points_per_rupee,
        },
      });

      // Update referral record
      await this.supabase
        .from('referrals')
        .update({
          status: 'purchased',
          total_purchases_count: (referral.total_purchases_count || 0) + 1,
          total_purchased_amount:
            Number(referral.total_purchased_amount || 0) + Number(amountPaid),
          total_points_awarded:
            (referral.total_points_awarded || 0) + pointsToAward,
          updated_at: new Date().toISOString(),
        })
        .eq('id', referral.id);

      // Fetch student and course info for notification
      const { data: studentProfile } = await this.supabase
        .from('profiles')
        .select('full_name')
        .eq('id', studentId)
        .single();
      const studentName = studentProfile?.full_name || 'Your referred friend';

      // Send in-app notification to referrer
      await this.supabase.from('notifications').insert({
        recipient_id: referral.referrer_id,
        title: 'Referral Reward Earned! 🎁',
        body: `You received ${pointsToAward.toLocaleString()} points (~₹${(pointsToAward / settings.points_per_rupee).toFixed(0)})! ${studentName} just purchased a course.`,
        type: 'referral_reward',
        metadata: {
          points: pointsToAward,
          payment_id: paymentId,
          source_student_id: studentId,
        },
      });

      return {
        rewarded: true,
        points: pointsToAward,
        referrer_id: referral.referrer_id,
      };
    } catch (err) {
      this.logger.error(
        { err, paymentId, studentId },
        'Error in awardReferralReward',
      );
      return {
        rewarded: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /** Get student referral summary (wallet, referral code, referred friends, conversion requests) */
  async getMyReferralSummary(userOrId: string | { id?: string; sub?: string }) {
    const userId = this.resolveUserId(userOrId);
    const referralCode = await this.ensureUserReferralCode(userId);
    const wallet = await this.getOrCreateWallet(userId);
    const settings = await this.getSettings();

    // Fetch referred users list
    const { data: referrals, error: refErr } = await this.supabase
      .from('referrals')
      .select('*, referee:referee_id(id, full_name, email, created_at)')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (refErr) throw new BadRequestException(refErr.message);

    const referredUsers = (referrals || []).map((r: any) => ({
      id: r.referee?.id || r.referee_id,
      name: r.referee?.full_name || 'Student',
      email: r.referee?.email
        ? r.referee.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
        : '***',
      joined_at: r.created_at,
      status: r.status,
      has_purchased:
        r.status === 'purchased' || (r.total_purchases_count || 0) > 0,
      total_purchases_count: r.total_purchases_count || 0,
      total_purchased_amount: Number(r.total_purchased_amount || 0),
      points_earned: r.total_points_awarded || 0,
    }));

    // Fetch conversion requests
    const { data: conversionRequests } = await this.supabase
      .from('cash_conversion_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Fetch recent ledger transactions
    const { data: transactions } = await this.supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    // Check if current user has an unused referral discount coupon
    const { data: myCoupon } = await this.supabase
      .from('coupons')
      .select('id, code, discount_percentage, times_used, max_uses')
      .eq('applicable_user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    let unusedCoupon: { code: string; discount_percentage: number } | null =
      null;
    if (myCoupon) {
      const { count: completedCount } = await this.supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_code', myCoupon.code)
        .eq('status', 'completed');

      const effectiveUses = Math.max(
        myCoupon.times_used || 0,
        completedCount ?? 0,
      );

      if (effectiveUses < myCoupon.max_uses) {
        unusedCoupon = {
          code: myCoupon.code,
          discount_percentage: Number(myCoupon.discount_percentage),
        };
      } else if (myCoupon.times_used !== effectiveUses) {
        await this.supabase
          .from('coupons')
          .update({ times_used: effectiveUses })
          .eq('id', myCoupon.id);
      }
    }

    const inrValue = Number(
      (wallet.current_balance / settings.points_per_rupee).toFixed(2),
    );

    return {
      referral_code: referralCode,
      wallet: {
        current_balance: wallet.current_balance,
        total_earned: wallet.total_earned,
        total_redeemed: wallet.total_redeemed,
        inr_value: inrValue,
        points_per_rupee: settings.points_per_rupee,
        min_withdrawal_points: settings.min_withdrawal_points,
      },
      settings: {
        referee_discount_percentage: settings.referee_discount_percentage,
        referrer_reward_percentage: settings.referrer_reward_percentage,
        points_per_rupee: settings.points_per_rupee,
        min_withdrawal_points: settings.min_withdrawal_points,
      },
      referred_users: referredUsers,
      conversion_requests: conversionRequests || [],
      transactions: transactions || [],
      available_coupon: unusedCoupon,
    };
  }

  /**
   * Request cash conversion.
   * Atomically checks balance and debits wallet, creates pending request,
   * records immutable ledger debit, and notifies Technical Pilot admin team.
   */
  async requestCashConversion(
    userOrId: string | { id?: string; sub?: string },
    dto: RequestCashConversionDto,
  ) {
    const userId = this.resolveUserId(userOrId);
    const settings = await this.getSettings();

    if (dto.points < settings.min_withdrawal_points) {
      throw new BadRequestException(
        `Minimum conversion is ${settings.min_withdrawal_points} points.`,
      );
    }

    const wallet = await this.getOrCreateWallet(userId);

    if (dto.points > wallet.current_balance) {
      throw new BadRequestException(
        `Insufficient points balance. You have ${wallet.current_balance} points available.`,
      );
    }

    const newBalance = wallet.current_balance - dto.points;
    const newTotalRedeemed = wallet.total_redeemed + dto.points;

    // Atomic update guarded by current_balance >= points
    const { data: updatedWallet, error: debitErr } = await this.supabase
      .from('user_wallets')
      .update({
        current_balance: newBalance,
        total_redeemed: newTotalRedeemed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)
      .gte('current_balance', dto.points)
      .select('*')
      .single();

    if (debitErr || !updatedWallet) {
      throw new BadRequestException(
        'Unable to process conversion request. Balance may have changed.',
      );
    }

    const inrAmount = Number(
      (dto.points / settings.points_per_rupee).toFixed(2),
    );

    // Create conversion request in pending state
    const { data: request, error: reqErr } = await this.supabase
      .from('cash_conversion_requests')
      .insert({
        user_id: userId,
        points_requested: dto.points,
        inr_amount: inrAmount,
        points_per_rupee: settings.points_per_rupee,
        status: 'pending',
        student_notes: dto.notes || null,
      })
      .select('*')
      .single();

    if (reqErr) {
      // Rollback wallet balance if request creation failed
      await this.supabase
        .from('user_wallets')
        .update({
          current_balance: wallet.current_balance,
          total_redeemed: wallet.total_redeemed,
        })
        .eq('id', wallet.id);
      throw new BadRequestException('Failed to create conversion request');
    }

    // Record immutable ledger entry
    await this.supabase.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      user_id: userId,
      type: 'debit_conversion',
      points: -dto.points,
      balance_after: newBalance,
      reference_id: request.id,
      description: `Cash conversion request for ₹${inrAmount}`,
      metadata: {
        points_requested: dto.points,
        inr_amount: inrAmount,
        points_per_rupee: settings.points_per_rupee,
      },
    });

    // Notify student confirmation
    await this.supabase.from('notifications').insert({
      recipient_id: userId,
      title: 'Cash Conversion Requested ⏳',
      body: `Your request to convert ${dto.points.toLocaleString()} points (~₹${inrAmount}) has been received. Our team will review your request and reach out to your registered email for manual bank transfer.`,
      type: 'conversion_requested',
      metadata: { request_id: request.id, points: dto.points, inr: inrAmount },
    });

    // Notify Admins
    const { data: admins } = await this.supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'sub_admin']);

    if (admins && admins.length > 0) {
      const adminNotifications = admins.map((a) => ({
        recipient_id: a.id,
        title: 'New Cash Conversion Request 💰',
        body: `Student requested cash conversion of ${dto.points.toLocaleString()} points (₹${inrAmount}). Examine credits and email student for payout.`,
        type: 'admin_conversion_alert',
        metadata: {
          request_id: request.id,
          student_id: userId,
          inr: inrAmount,
        },
      }));
      await this.supabase.from('notifications').insert(adminNotifications);
    }

    return {
      success: true,
      message:
        'Conversion request submitted. Technical Pilot team will examine your credits and email you for bank details.',
      request,
    };
  }

  /** Admin: Overview analytics */
  async getAdminOverview() {
    const { count: totalReferrals } = await this.supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true });

    const { count: totalPurchasedReferrals } = await this.supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'purchased');

    const { data: referralsData } = await this.supabase
      .from('referrals')
      .select('total_purchased_amount, total_points_awarded');

    let totalRevenue = 0;
    let totalPointsAwarded = 0;
    (referralsData || []).forEach((r) => {
      totalRevenue += Number(r.total_purchased_amount || 0);
      totalPointsAwarded += Number(r.total_points_awarded || 0);
    });

    const { count: pendingRequestsCount } = await this.supabase
      .from('cash_conversion_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { data: pendingRequests } = await this.supabase
      .from('cash_conversion_requests')
      .select('inr_amount')
      .eq('status', 'pending');

    let totalPendingInr = 0;
    (pendingRequests || []).forEach((req) => {
      totalPendingInr += Number(req.inr_amount || 0);
    });

    return {
      total_referrals: totalReferrals ?? 0,
      total_purchased_referrals: totalPurchasedReferrals ?? 0,
      total_referral_revenue: totalRevenue,
      total_points_awarded: totalPointsAwarded,
      pending_requests_count: pendingRequestsCount ?? 0,
      total_pending_inr: totalPendingInr,
    };
  }

  /** Admin: List all referrals */
  async getAdminReferrals(page = 1, limit = 50) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await this.supabase
      .from('referrals')
      .select(
        `
        *,
        referrer:referrer_id(id, full_name, email, phone),
        referee:referee_id(id, full_name, email, phone)
      `,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new BadRequestException(error.message);

    return {
      referrals: data || [],
      total: count ?? 0,
      page,
      limit,
    };
  }

  /** Admin: List cash conversion requests */
  async getAdminConversionRequests(status?: string) {
    let query = this.supabase
      .from('cash_conversion_requests')
      .select(
        `
        *,
        student:user_id(id, full_name, email, phone),
        processor:processed_by(id, full_name, email)
      `,
      )
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  /**
   * Admin: Update conversion request status (paid or rejected).
   * - If 'paid': marks request as paid, records audit trail, sends notification.
   * - If 'rejected': marks request rejected, refunds points to student's wallet with ledger entry, sends notification.
   */
  async updateConversionRequestStatus(
    requestId: string,
    dto: UpdateConversionStatusDto,
    adminOrId?: any,
  ) {
    const adminId = this.resolveUserId(adminOrId);
    const { data: request, error } = await this.supabase
      .from('cash_conversion_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error || !request) {
      throw new NotFoundException('Conversion request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(
        `Request already resolved with status "${request.status}"`,
      );
    }

    const processedAt = new Date().toISOString();

    if (dto.status === 'paid') {
      // Mark request as paid
      const { data: updated, error: updateErr } = await this.supabase
        .from('cash_conversion_requests')
        .update({
          status: 'paid',
          processed_at: processedAt,
          processed_by: adminId,
          admin_notes: dto.admin_notes || null,
          updated_at: processedAt,
        })
        .eq('id', requestId)
        .select('*')
        .single();

      if (updateErr) throw new BadRequestException(updateErr.message);

      // Notify student
      await this.supabase.from('notifications').insert({
        recipient_id: request.user_id,
        title: 'Payout Processed! 💵',
        body: `Your cash conversion request for ${request.points_requested.toLocaleString()} points (₹${request.inr_amount}) has been marked as PAID by Technical Pilot. ${dto.admin_notes ? `Note: ${dto.admin_notes}` : ''}`,
        type: 'conversion_paid',
        metadata: { request_id: requestId, inr: request.inr_amount },
      });

      return updated;
    } else if (dto.status === 'rejected') {
      // Mark request as rejected
      const { data: updated, error: updateErr } = await this.supabase
        .from('cash_conversion_requests')
        .update({
          status: 'rejected',
          processed_at: processedAt,
          processed_by: adminId,
          admin_notes:
            dto.admin_notes || 'Conversion request rejected by administrator.',
          updated_at: processedAt,
        })
        .eq('id', requestId)
        .select('*')
        .single();

      if (updateErr) throw new BadRequestException(updateErr.message);

      // Refund points to student wallet
      const wallet = await this.getOrCreateWallet(request.user_id);
      const refundedBalance = wallet.current_balance + request.points_requested;
      const refundedTotalRedeemed = Math.max(
        0,
        wallet.total_redeemed - request.points_requested,
      );

      await this.supabase
        .from('user_wallets')
        .update({
          current_balance: refundedBalance,
          total_redeemed: refundedTotalRedeemed,
          updated_at: processedAt,
        })
        .eq('id', wallet.id);

      // Record refund in immutable ledger
      await this.supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        user_id: request.user_id,
        type: 'refund_conversion_rejected',
        points: request.points_requested,
        balance_after: refundedBalance,
        reference_id: requestId,
        description: `Refund for rejected cash conversion request: ${dto.admin_notes || 'No reason provided'}`,
        metadata: {
          request_id: requestId,
          rejected_by: adminId,
          admin_notes: dto.admin_notes,
        },
      });

      // Notify student
      await this.supabase.from('notifications').insert({
        recipient_id: request.user_id,
        title: 'Conversion Request Rejected',
        body: `Your cash conversion request for ${request.points_requested.toLocaleString()} points was rejected (${dto.admin_notes || 'No reason provided'}). Your points have been refunded to your wallet.`,
        type: 'conversion_rejected',
        metadata: { request_id: requestId, points: request.points_requested },
      });

      return updated;
    }
  }
}
