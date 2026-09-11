-- Migration: 018_referral_system.sql
-- Description: Implement referral codes, referral relationships, reward configuration,
-- immutable wallet transaction ledger, manual cash conversion requests, and referral coupons.

-- 1. Add referral columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(16) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles (referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles (referred_by);

-- Helper function to generate unique referral code with TP prefix containing guaranteed numbers and letters
CREATE OR REPLACE FUNCTION public.generate_unique_tp_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  letters TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  digits TEXT := '23456789';
  char_arr TEXT[];
  i INTEGER;
  j INTEGER;
  temp TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    char_arr := ARRAY[]::TEXT[];
    -- Pick 3 uppercase letters
    FOR i IN 1..3 LOOP
      char_arr := array_append(char_arr, SUBSTR(letters, FLOOR(RANDOM() * LENGTH(letters) + 1)::INTEGER, 1));
    END LOOP;
    -- Pick 3 numeric digits
    FOR i IN 1..3 LOOP
      char_arr := array_append(char_arr, SUBSTR(digits, FLOOR(RANDOM() * LENGTH(digits) + 1)::INTEGER, 1));
    END LOOP;
    -- Fisher-Yates shuffle
    FOR i REVERSE 6..2 LOOP
      j := FLOOR(RANDOM() * i + 1)::INTEGER;
      temp := char_arr[i];
      char_arr[i] := char_arr[j];
      char_arr[j] := temp;
    END LOOP;

    new_code := 'TP' || array_to_string(char_arr, '');

    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$;

-- Populate existing profiles that do not have a referral code or lack numeric digits
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE referral_code IS NULL OR referral_code !~ '[0-9]' LOOP
    UPDATE public.profiles
    SET referral_code = public.generate_unique_tp_referral_code()
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- Trigger to auto-assign referral code to new profiles if missing
CREATE OR REPLACE FUNCTION public.set_profile_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_unique_tp_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_profile_referral_code ON public.profiles;
CREATE TRIGGER trg_set_profile_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profile_referral_code();

-- 2. Referral configuration table (singleton)
CREATE TABLE IF NOT EXISTS public.referral_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  referee_discount_percentage NUMERIC(5,2) DEFAULT 20.00 NOT NULL CHECK (referee_discount_percentage >= 0 AND referee_discount_percentage <= 100),
  referrer_reward_percentage NUMERIC(5,2) DEFAULT 10.00 NOT NULL CHECK (referrer_reward_percentage >= 0 AND referrer_reward_percentage <= 100),
  points_per_rupee NUMERIC(10,2) DEFAULT 5.00 NOT NULL CHECK (points_per_rupee > 0),
  min_withdrawal_points INTEGER DEFAULT 500 NOT NULL CHECK (min_withdrawal_points >= 0),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_by UUID REFERENCES public.profiles(id)
);

INSERT INTO public.referral_settings (id, referee_discount_percentage, referrer_reward_percentage, points_per_rupee, min_withdrawal_points, is_active)
VALUES (1, 20.00, 10.00, 5.00, 500, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Referrals relationship table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  referral_code VARCHAR(32) NOT NULL,
  status VARCHAR(32) DEFAULT 'registered' NOT NULL CHECK (status IN ('registered', 'purchased')),
  total_purchases_count INTEGER DEFAULT 0 NOT NULL CHECK (total_purchases_count >= 0),
  total_purchased_amount NUMERIC(10,2) DEFAULT 0 NOT NULL CHECK (total_purchased_amount >= 0),
  total_points_awarded INTEGER DEFAULT 0 NOT NULL CHECK (total_points_awarded >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT no_self_referral CHECK (referrer_id != referee_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee_id ON public.referrals (referee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals (referral_code);

-- 4. User Wallets table
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  current_balance INTEGER DEFAULT 0 NOT NULL CHECK (current_balance >= 0),
  total_earned INTEGER DEFAULT 0 NOT NULL CHECK (total_earned >= 0),
  total_redeemed INTEGER DEFAULT 0 NOT NULL CHECK (total_redeemed >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON public.user_wallets (user_id);

-- 5. Immutable Wallet Transaction Ledger
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES user_wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(32) NOT NULL CHECK (type IN ('credit_purchase', 'debit_conversion', 'refund_conversion_rejected', 'admin_adjustment')),
  points INTEGER NOT NULL CHECK (points != 0),
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  reference_id TEXT,
  source_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_reference_type UNIQUE (reference_id, type)
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_id ON public.wallet_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_id ON public.wallet_transactions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_reference ON public.wallet_transactions (reference_id, type);

-- 6. Cash Conversion Requests
CREATE TABLE IF NOT EXISTS public.cash_conversion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points_requested INTEGER NOT NULL CHECK (points_requested > 0),
  inr_amount NUMERIC(10,2) NOT NULL CHECK (inr_amount > 0),
  points_per_rupee NUMERIC(10,2) NOT NULL CHECK (points_per_rupee > 0),
  status VARCHAR(32) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  student_notes TEXT,
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cash_conv_user_id ON public.cash_conversion_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_cash_conv_status ON public.cash_conversion_requests (status);

-- 7. Coupons Table (supports exclusive referee coupons and promo codes)
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  discount_percentage NUMERIC(5,2) NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  applicable_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  max_uses INTEGER DEFAULT 1 NOT NULL CHECK (max_uses > 0),
  times_used INTEGER DEFAULT 0 NOT NULL CHECK (times_used >= 0),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_applicable_user ON public.coupons (applicable_user_id);

-- 8. Add coupon_code to payments if not present
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- Trigger to increment coupons times_used when payment completes
CREATE OR REPLACE FUNCTION public.handle_payment_completed_coupon()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') AND NEW.coupon_code IS NOT NULL THEN
    UPDATE public.coupons
    SET times_used = times_used + 1
    WHERE UPPER(code) = UPPER(NEW.coupon_code);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_completed_coupon ON public.payments;
CREATE TRIGGER trg_payment_completed_coupon
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_payment_completed_coupon();

-- 9. Row Level Security Policies
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_conversion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- referral_settings RLS
DROP POLICY IF EXISTS "Anyone can read referral settings" ON public.referral_settings;
CREATE POLICY "Anyone can read referral settings"
ON public.referral_settings FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Only admins can update referral settings" ON public.referral_settings;
CREATE POLICY "Only admins can update referral settings"
ON public.referral_settings FOR ALL
TO authenticated
USING (public.get_my_role() = 'admin');

-- referrals RLS: Users can read referrals where they are the referrer
DROP POLICY IF EXISTS "Referrers can view their referrals" ON public.referrals;
CREATE POLICY "Referrers can view their referrals"
ON public.referrals FOR SELECT
TO authenticated
USING (referrer_id = auth.uid() OR public.get_my_role() IN ('admin', 'sub_admin'));

-- user_wallets RLS: Users can view their own wallet
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.user_wallets;
CREATE POLICY "Users can view their own wallet"
ON public.user_wallets FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.get_my_role() IN ('admin', 'sub_admin'));

-- wallet_transactions RLS: Users can view their own ledger entries
DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view their own wallet transactions"
ON public.wallet_transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.get_my_role() IN ('admin', 'sub_admin'));

-- cash_conversion_requests RLS: Users can view their own requests and create new ones
DROP POLICY IF EXISTS "Users can view their own conversion requests" ON public.cash_conversion_requests;
CREATE POLICY "Users can view their own conversion requests"
ON public.cash_conversion_requests FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.get_my_role() IN ('admin', 'sub_admin'));

DROP POLICY IF EXISTS "Users can insert their own conversion requests" ON public.cash_conversion_requests;
CREATE POLICY "Users can insert their own conversion requests"
ON public.cash_conversion_requests FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage conversion requests" ON public.cash_conversion_requests;
CREATE POLICY "Admins can manage conversion requests"
ON public.cash_conversion_requests FOR ALL
TO authenticated
USING (public.get_my_role() IN ('admin', 'sub_admin'));

-- coupons RLS: Users can view coupons applicable to them or general coupons
DROP POLICY IF EXISTS "Users can view valid coupons" ON public.coupons;
CREATE POLICY "Users can view valid coupons"
ON public.coupons FOR SELECT
TO authenticated
USING (applicable_user_id IS NULL OR applicable_user_id = auth.uid() OR public.get_my_role() IN ('admin', 'sub_admin'));
