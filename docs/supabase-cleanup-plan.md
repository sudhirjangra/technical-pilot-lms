# Supabase Cleanup Plan

Generated: 2026-08-17  
Based on: `docs/supabase-inventory.md` + full codebase audit

This plan proposes safe removal of database objects that are confirmed unused based on:
- Migration analysis (migrations 001–006)
- Backend code scan (apps/api/src/**)
- Frontend code scan (apps/web/**)
- Type definitions (packages/supabase/src/types/)

---

## APPROVED FOR REMOVAL

### 1. Referral Tables (5 tables)

| Object | Type | Migration |
|--------|------|-----------|
| `public.referral_discounts_applied` | TABLE | 001 |
| `public.referral_commissions` | TABLE | 001 |
| `public.referrals` | TABLE | 001 |
| `public.referral_config` | TABLE | 001 |
| `public.referral_codes` | TABLE | 001 |

**Reason unused:**
- No backend module, controller, or service references any referral table
- No frontend page, server action, or component references referral data
- Confirmed by: `grep -r "referral" apps/api/src/ apps/web/server/ apps/web/components/` → 0 matches in active code
- Listed as "Future Steps (Phase 2)" in `STATE.md`

**Dependencies:**
- `referral_discounts_applied.payment_id` → `payments.id` (FK — must drop first or cascade)
- `referral_discounts_applied.referral_code_id` → `referral_codes.id`
- `referral_commissions.referral_id` → `referrals.id`
- `referral_commissions.payment_id` → `payments.id`
- `referrals.referrer_id`, `referee_id` → `profiles.id`
- `referrals.referral_code_id` → `referral_codes.id`
- `referral_codes.user_id` → `profiles.id`

**Drop order:** referral_discounts_applied → referral_commissions → referrals → referral_config → referral_codes

**Safe to delete:** YES — no production data expected (system not live), no application code uses it

---

### 2. Unused Enums (2 enums)

| Object | Type | Notes |
|--------|------|-------|
| `referral_status` | ENUM | Only used in `referrals.status` (being dropped) |
| `commission_status` | ENUM | Only used in `referral_commissions.status` (being dropped) |

**Reason:** Only columns using these enums are in the referral tables being dropped.  
**Safe to delete:** YES — after referral tables are dropped

---

### 3. Unused Sessions Table

| Object | Type | Migration |
|--------|------|-----------|
| `public.sessions` | TABLE | 003 |

**Reason unused:**
- Application uses `devices` table for session management (device fingerprint, login tracking)
- `sessions` table was created in migration 003 as an "audit sessions" concept but nothing writes to it
- Confirmed by: searching `apps/api/src/` for `sessions` — only `getSessions()` and `getSession()` in `auth.service.ts` which query the `devices` table, not `sessions`
- `GetSessionsSchema` and `SessionSchema` in the frontend type file map to `devices` table columns (device_fingerprint, device_name, platform, last_active_at)
- The frontend calls `/auth/sessions/:userId` and `/auth/session/:id` which query `devices` table

**Dependencies:**
- `sessions.user_id` → `profiles.id`
- `sessions.device_id` → `devices.id`
- No FK from other tables into `sessions`

**RLS policies to drop first:**
- `Users read own sessions` on `sessions`
- `Admin full access sessions` on `sessions`

**Safe to delete:** YES — no data, no application code uses it

---

### 4. Duplicate RLS Policies (from migration 001 vs 004/006)

Since the service role policies in migrations 004 and 006 are what the backend actually relies on, the migration 001 policies on these tables can be considered redundant. However, since multiple policies on a table operate as OR conditions in PostgreSQL, they don't break anything — they just add noise and could create confusion.

**Proposed cleanup in migration 007:**

On `enrollments`:
- DROP `Students read own enrollments` (migration 001) — superseded by `enrollments_student_select` (migration 004)
- DROP `Admin reads all enrollments` (migration 001) — superseded by `enrollments_service_all` (migration 004)
- DROP `Admin inserts enrollments` (migration 001) — superseded by `enrollments_service_all` (migration 004)
- DROP `Admin updates enrollments` (migration 001) — superseded by `enrollments_service_all` (migration 004)
- DROP `Admin deletes enrollments` (migration 001) — superseded by `enrollments_service_all` (migration 004)

On `progress`:
- DROP `Students manage own progress` (migration 001) — superseded by migration 004 policies
- DROP `Admin reads all progress` (migration 001) — superseded by `progress_service_all` (migration 004)

On `payments`:
- DROP `Students read own payments` (migration 001) — superseded by `payments_student_select` (migration 004)
- DROP `Admin reads all payments` (migration 001) — superseded by `payments_service_all` (migration 004)

On `doubt_slots`:
- DROP `Anyone reads available slots` (migration 001) — superseded by `doubt_slots_read` (migration 006)
- DROP `Admin manages slots` (migration 001) — superseded by `doubt_slots_service_all` (migration 006)

On `doubt_bookings`:
- DROP `Students manage own bookings` (migration 001) — superseded by migration 006 policies
- DROP `Admin manages all bookings` (migration 001) — superseded by `doubt_bookings_service_all` (migration 006)

**Safe to delete:** YES — the service_role policies cover backend operations, and the student-specific select policies in 004/006 cover frontend reads

---

### 5. Duplicate Trigger Function

| Object | Type | Notes |
|--------|------|-------|
| `update_updated_at()` | FUNCTION | Duplicate of `handle_updated_at()` |

**Reason:** Migration 004 creates `update_updated_at()` which is functionally identical to `handle_updated_at()` from migration 001. However, since migrations 004, 005, 006 use `update_updated_at()` in their triggers, we should NOT drop it until we've confirmed which function the triggers are actually using.

**Resolution:** Keep both for now. The cleanup can consolidate them when re-running migrations on a fresh database. This is low risk to leave as-is in a live database.

**Safe to delete:** LOW RISK to drop `update_updated_at()` only if first updating all triggers (enrollments_updated_at, payments_updated_at, progress_updated_at, sub_admin_permissions_updated_at, doubt_slots_updated_at) to use `handle_updated_at()`. Deferred.

---

### 6. Conflicting Sub-Admin Permissions Trigger (migration 005)

Migration 001 creates:
```sql
CREATE TRIGGER sub_admin_permissions_updated_at BEFORE UPDATE ON public.sub_admin_permissions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
```

Migration 005 creates (without DROP IF EXISTS first):
```sql
CREATE TRIGGER sub_admin_permissions_updated_at BEFORE UPDATE ON public.sub_admin_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

If migration 001 ran first, migration 005's `CREATE TRIGGER` would fail with "trigger already exists."

**Fix:** Migration 005 should add `DROP TRIGGER IF EXISTS sub_admin_permissions_updated_at ON public.sub_admin_permissions;` before the CREATE TRIGGER.

---

## REQUIRES CONFIRMATION BEFORE DELETION

### Video/PDF/Assignment/Test Tables

Tables: `video_lessons`, `pdf_notes`, `assignments`, `tests`, `questions`, `question_options`, `test_attempts`, `test_answers`, `assignment_submissions`

These tables have no active backend endpoints today but are part of the defined product scope (students watch videos, take tests, submit assignments). They are **NOT unused in intent** — they're implemented in the DB schema as per ARCHITECTURE.md but the backend feature modules haven't been built yet.

**Recommendation:** RETAIN. These are core product tables per ARCHITECTURE.md. Do not delete.

---

## PROPOSED MIGRATION 007

```sql
-- ============================================================
-- Migration: 007_cleanup_unused_objects
-- Description: Remove unused referral system and sessions table,
--              clean up duplicate policies, fix trigger conflict
-- ============================================================

-- ─── DROP REFERRAL TABLES ────────────────────────────────────
DROP TABLE IF EXISTS public.referral_discounts_applied CASCADE;
DROP TABLE IF EXISTS public.referral_commissions CASCADE;
DROP TABLE IF EXISTS public.referrals CASCADE;
DROP TABLE IF EXISTS public.referral_config CASCADE;
DROP TABLE IF EXISTS public.referral_codes CASCADE;

-- ─── DROP UNUSED ENUMS ───────────────────────────────────────
DROP TYPE IF EXISTS public.referral_status;
DROP TYPE IF EXISTS public.commission_status;

-- ─── DROP UNUSED SESSIONS TABLE ──────────────────────────────
DROP TABLE IF EXISTS public.sessions CASCADE;

-- ─── FIX DUPLICATE RLS POLICIES — enrollments ────────────────
DROP POLICY IF EXISTS "Students read own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admin reads all enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admin inserts enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admin updates enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admin deletes enrollments" ON public.enrollments;

-- ─── FIX DUPLICATE RLS POLICIES — progress ───────────────────
DROP POLICY IF EXISTS "Students manage own progress" ON public.progress;
DROP POLICY IF EXISTS "Admin reads all progress" ON public.progress;

-- ─── FIX DUPLICATE RLS POLICIES — payments ───────────────────
DROP POLICY IF EXISTS "Students read own payments" ON public.payments;
DROP POLICY IF EXISTS "Admin reads all payments" ON public.payments;

-- ─── FIX DUPLICATE RLS POLICIES — doubt_slots ────────────────
DROP POLICY IF EXISTS "Anyone reads available slots" ON public.doubt_slots;
DROP POLICY IF EXISTS "Admin manages slots" ON public.doubt_slots;

-- ─── FIX DUPLICATE RLS POLICIES — doubt_bookings ─────────────
DROP POLICY IF EXISTS "Students manage own bookings" ON public.doubt_bookings;
DROP POLICY IF EXISTS "Admin manages all bookings" ON public.doubt_bookings;

-- ─── FIX TRIGGER CONFLICT — sub_admin_permissions ────────────
-- Migration 005 attempted to recreate this trigger but failed if 001 ran first
-- Ensure correct function is used
DROP TRIGGER IF EXISTS sub_admin_permissions_updated_at ON public.sub_admin_permissions;
CREATE TRIGGER sub_admin_permissions_updated_at
  BEFORE UPDATE ON public.sub_admin_permissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

## DEFERRED (not safe to remove without confirmation)

| Object | Reason |
|--------|--------|
| `update_updated_at()` function | Used by active triggers in migrations 004, 005, 006 — safe to remove only after updating those triggers |
| All `video_lessons`, `pdf_notes`, `tests`, etc. tables | In-scope product features, just not yet implemented in backend |

---

## UPDATED SUPABASE TYPES

After applying migration 007, the `packages/supabase/src/types/index.ts` should be updated:
- Remove `ReferralStatus` type
- Remove `CommissionStatus` type
- Remove `referral_codes`, `referral_config`, `referrals`, `referral_commissions`, `referral_discounts_applied` from `Database` interface if they exist
