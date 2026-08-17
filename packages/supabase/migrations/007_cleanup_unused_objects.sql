-- ============================================================
-- Migration: 007_cleanup_unused_objects
-- Description: Remove unused referral system tables/enums,
--              drop unused sessions table, clean up duplicate
--              RLS policies, and fix the sub_admin_permissions
--              trigger conflict between migrations 001 and 005.
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── DROP REFERRAL TABLES ────────────────────────────────────
-- These tables have no backend endpoints or frontend UI.
-- The referral system is planned for Phase 2 and will be
-- re-added with its own migration when implemented.

DROP TABLE IF EXISTS public.referral_discounts_applied CASCADE;
DROP TABLE IF EXISTS public.referral_commissions CASCADE;
DROP TABLE IF EXISTS public.referrals CASCADE;
DROP TABLE IF EXISTS public.referral_config CASCADE;
DROP TABLE IF EXISTS public.referral_codes CASCADE;

-- ─── DROP UNUSED ENUMS ───────────────────────────────────────
-- Only used by the referral tables that were just dropped.

DROP TYPE IF EXISTS public.referral_status;
DROP TYPE IF EXISTS public.commission_status;

-- ─── DROP UNUSED SESSIONS TABLE ──────────────────────────────
-- The app uses the `devices` table for session management.
-- This table was created in migration 003 but is never written to.

DROP TABLE IF EXISTS public.sessions CASCADE;

-- ─── CLEAN UP DUPLICATE RLS POLICIES — enrollments ───────────
-- Migration 001 created these; migration 004 creates service_role
-- policies that cover backend writes. Remove the 001 duplicates.

DROP POLICY IF EXISTS "Students read own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admin reads all enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admin inserts enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admin updates enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admin deletes enrollments" ON public.enrollments;

-- ─── CLEAN UP DUPLICATE RLS POLICIES — progress ──────────────

DROP POLICY IF EXISTS "Students manage own progress" ON public.progress;
DROP POLICY IF EXISTS "Admin reads all progress" ON public.progress;

-- ─── CLEAN UP DUPLICATE RLS POLICIES — payments ──────────────

DROP POLICY IF EXISTS "Students read own payments" ON public.payments;
DROP POLICY IF EXISTS "Admin reads all payments" ON public.payments;

-- ─── CLEAN UP DUPLICATE RLS POLICIES — doubt_slots ───────────

DROP POLICY IF EXISTS "Anyone reads available slots" ON public.doubt_slots;
DROP POLICY IF EXISTS "Admin manages slots" ON public.doubt_slots;

-- ─── CLEAN UP DUPLICATE RLS POLICIES — doubt_bookings ────────

DROP POLICY IF EXISTS "Students manage own bookings" ON public.doubt_bookings;
DROP POLICY IF EXISTS "Admin manages all bookings" ON public.doubt_bookings;

-- ─── FIX sub_admin_permissions TRIGGER CONFLICT ──────────────
-- Migration 001 creates this trigger with handle_updated_at().
-- Migration 005 attempts to re-create the same trigger name
-- with update_updated_at() — this fails if 001 ran first.
-- Drop and recreate idempotently using handle_updated_at()
-- so both functions remain consistent.

DROP TRIGGER IF EXISTS sub_admin_permissions_updated_at ON public.sub_admin_permissions;

CREATE TRIGGER sub_admin_permissions_updated_at
  BEFORE UPDATE ON public.sub_admin_permissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
