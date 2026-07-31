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

## Immediate Next Step
- Configure Supabase email settings (see below)
- Run migration 002 in Supabase to drop blog tables
- Run migration 003 to add sessions table + performance indexes
- Run migration 001 (if not already run) to create full schema
- Verify app compiles: `pnpm build`
- Test Course CRUD via Swagger/Postman

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
- Payment integration (Razorpay) — webhook signature verification, order creation
- Enrollment + progress tracking — enrollment guard for content access
- Referral system
- Doubt sessions
- Admin dashboard (frontend)
- Sub-admin permissions — permission guard, permission matrix CRUD
- CSP headers in Next.js middleware
- Stricter rate limiting on auth endpoints (5/min per IP)
- Session timeout on inactivity
- Frontend: course management UI (admin panel)

## Known Remaining Warnings (Not Blocking)
- Health endpoints are public (acceptable for uptime monitoring)
- Swagger only enabled in non-production (OK)
- Device fingerprint uses refresh_token (works but could be decoupled later)
- Frontend CSRF: Server Actions have built-in protection; direct fetches rely on SameSite cookies
