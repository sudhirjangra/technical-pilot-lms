# Project State

## Completed

### Phase 1: Auth + Profile + Cleanup (Done)
- [x] Full auth flow: sign-up, sign-in, sign-out, confirm-email, forgot/reset password, change password, delete account
- [x] Device tracking (max 2 devices) with sessions management UI
- [x] Profile page with tabs: profile info, general settings, security, sessions, appearance
- [x] Password visibility toggle (PasswordInput component) on all password fields
- [x] Fixed type mismatches (general-settings used non-existent user.profile.name/username)
- [x] Fixed SessionSchema to match actual DB devices table columns
- [x] Removed S3/Backblaze code with hardcoded credentials
- [x] Removed blog tables (content_blog_posts, content_blog_post_comments, private_items)
- [x] Cleaned home page (removed RichTextEditor, media player cruft)
- [x] Fixed is-authorized middleware (home page now accessible to guests)
- [x] Updated APP_NAME/metadata from "Turbo NPN" to "Institution LMS"
- [x] Removed public file upload test endpoint
- [x] Created migration 002_drop_unused_tables.sql
- [x] Full migration 001 with all ARCHITECTURE.md tables + RLS policies
- [x] Cleaned env schema (removed AWS vars)
- [x] Updated .env.example with correct required vars

## Current Database
- profiles, devices, audit_logs (as per current_in_database.sql)
- Blog tables exist but migration 002 drops them

### Phase 1.5: Frontend Auth Error Handling (Done)
- [x] Sign-in form handles EMAIL_NOT_CONFIRMED → redirects to /auth/confirm-email?email=...
- [x] Sign-in form handles DEVICE_LIMIT_REACHED → shows sessions picker UI, user removes one, then auto-retries sign-in
- [x] Confirm-email form reads email from URL params (no session required)
- [x] confirmEmail server action no longer requires auth header (endpoint is @Public)
- [x] Sign-up no longer attempts signIn after registration → redirects to confirm-email page
- [x] /auth/confirm-email added to public paths in middleware
- [x] safeFetch preserves structured error payloads (JSON objects)
- [x] removeSession server action for device-limit flow

### Auth Bug Fixes + Sidebar (Done)
- [x] Fixed sign-up hang: dev SMTP fallback now uses jsonTransport (no network connection) instead of fake Ethereal credentials that caused 2-min timeout
- [x] mail.service.ts no longer re-throws errors — emails are best-effort, failures logged only
- [x] Fixed sign-out not deleting device: sidebar now calls removeSession (NestJS) before signOut (NextAuth) — prevents device accumulation and subsequent login failures
- [x] Added fetch-failure resiliency for auth flows: ipinfo lookup now fails safe, safeFetch now surfaces a friendly API-unreachable message with localhost/127.0.0.1 fallback retry, and sign-in normalizes fetch-failed AuthErrors
- [x] Fixed reset-password OTP mismatch and security: UI now accepts 6-8 digits, schema/DTO aligned, and backend now verifies recovery OTP before allowing password change
- [x] Improved resend-OTP errors by surfacing/logging provider error message instead of generic failure
- [x] Fixed sign-up for existing unconfirmed users: resend OTP failure no longer hard-fails registration flow (warning logged, flow continues to confirm-email screen)
- [x] Sidebar: user avatar + name + email in footer dropdown (ShadCN pattern)
- [x] Sidebar: dropdown includes Profile, Settings, Sign out with proper destructive style
- [x] Sidebar: removed duplicate Account nav group (moved to footer dropdown)
- [x] Sidebar: added SidebarSeparator between nav groups

## Immediate Next Step
- Add RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET to .env
- Run migration 004 in Supabase
- Test payment flow via Swagger (create order → verify payment)
- Test enrollment + progress APIs
- Build admin dashboard frontend (course management UI)

### Phase 2.0: Course CRUD (Done)
- [x] Categories module — full CRUD, public read, admin write
- [x] Courses module — full CRUD with slug lookup, status management, published_at auto-set
- [x] Chapters module — CRUD nested under courses, reorder support, auto sort_order
- [x] Lessons module — CRUD nested under chapters, reorder support, auto sort_order
- [x] All admin endpoints protected with @Roles('ADMIN')
- [x] Public endpoints: course listing (published only), category listing, slug lookup
- [x] Audit logging interceptor created + applied to courses (create/update/delete)
- [x] UUID validation on all :id params via ParseUUIDPipe
- [x] Input validation: slug format, max lengths, numeric constraints
- [x] Database types added for categories, chapters, lessons
- [x] All modules registered in app.module.ts

## Security Audit Fixes Applied (Phase 1.6)
- [x] Password complexity enforcement on DTOs (min 8, uppercase, lowercase, number, special char)
- [x] Users endpoint locked behind `@Roles('ADMIN')` guard
- [x] Sessions endpoint ownership check (user can only access own sessions)
- [x] JWT verification uses explicit `algorithms: ['HS256']`
- [x] RolesGuard: removed SUPERADMIN backdoor, case-insensitive comparison
- [x] Role constants aligned with ARCHITECTURE.md (ADMIN, SUB_ADMIN, STUDENT)
- [x] Cookie security flags (httpOnly, secure, sameSite, path, maxAge)
- [x] changePassword removed unsafe `as any` casts
- [x] Production console.log statements gated behind NODE_ENV check
- [x] Migration 003: sessions table + 40+ performance indexes
- [x] Profile avatar editor: removed debug logs

## Supabase Email Setup Required
1. Dashboard → Authentication → Email Templates → Disable "Enable email confirmations" (we send custom emails via Resend)
2. OR keep it enabled but set Custom SMTP to your Resend SMTP (smtp.resend.com:465, user=resend, pass=RESEND_API_KEY)
3. In apps/api/.env set: RESEND_API_KEY, MAIL_FROM (e.g. noreply@yourdomain.com)
4. Domain must be verified in Resend dashboard for MAIL_FROM to work

## Future Steps (Phase 2)
- Video integration (Vimeo) — upload, signed URL generation, player embed
- Referral system — codes, commissions, discount application
- Doubt sessions — slot management, booking, calendar
- Admin dashboard (frontend) — course/student/payment management UI
- Sub-admin permissions — permission guard, permission matrix CRUD
- CSP headers in Next.js middleware
- Stricter rate limiting on auth endpoints (5/min per IP)
- Session timeout on inactivity

### Phase 2.5: Enrollments + Payments + Progress (Done)
- [x] Enrollments module — CRUD, student self-check, admin course-enrollments view
- [x] Payments module — Razorpay order creation, client-side signature verification, webhook handler
- [x] Progress module — lesson-level tracking, course progress overview, video position resume
- [x] EnrollmentGuard — reusable guard that verifies active enrollment from any route param
- [x] Migration 004 — enrollments, payments, progress tables + RLS + indexes + triggers
- [x] Fixed migration 004 re-run safety by dropping existing trigger names before recreating them
- [x] Razorpay env vars added to validation schema (with defaults for dev)
- [x] safeFetch fixed: network errors caught gracefully (no more TypeError: fetch failed crashes)
- [x] Middleware wrapped in try-catch (resilient to API being down)
- Referral system
- Doubt sessions
- Admin dashboard (frontend)
- Sub-admin permissions — permission guard, permission matrix CRUD
- CSP headers in Next.js middleware
- Stricter rate limiting on auth endpoints (5/min per IP)
- Session timeout on inactivity
- Frontend: course management UI (admin panel)

### Next Step
- Re-run migration 004 in Supabase after applying this fix, then verify the payment and progress tables are writable for enrolled students.

## Known Remaining Warnings (Not Blocking)
- Health endpoints are public (acceptable for uptime monitoring)
- Swagger only enabled in non-production (OK)
- Device fingerprint uses refresh_token (works but could be decoupled later)
- Frontend CSRF: Server Actions have built-in protection; direct fetches rely on SameSite cookies
