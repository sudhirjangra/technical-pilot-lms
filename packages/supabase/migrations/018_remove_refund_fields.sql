-- Migration 018: Drop refund-related column from payments
ALTER TABLE public.payments DROP COLUMN IF EXISTS refund_reason;
