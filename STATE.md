# Project State

## Completed

### Phase 4: Admin Portal Bug Sweep + Sub-Admin RBAC + Media Storage (Done)
- [x] Categories/courses slug: backend regex now allows underscore (`[-_]`); frontend live-typing no longer strips trailing hyphen/underscore mid-keystroke (new `sanitizeSlugInput`, `slugify` only runs on submit/blur)
- [x] Categories/courses/enrollments admin tables: increased horizontal padding
- [x] Removed dead unused `Badge` import from courses-client (no duplicate Published badge existed; status is dropdown-only)
- [x] Fixed systemic bug: `safeFetch` threw "Invalid JSON response" on any empty-body 200/204 response (e.g. DELETE endpoints), making successful deletes look like failures — now tolerates empty bodies
- [x] Doubt-session slot delete now returns `{ success: true }` body explicitly
- [x] Verified already-working: admin→/admin redirect + /dashboard block (middleware + home page), lesson drag-and-drop reorder (already implemented via `@repo/shadcn` Sortable), question editor inline expand-in-place (already correct), manual grading endpoints for assignments/tests (already implemented)
- [x] Sub-Admin RBAC: added missing `013_sub_admin_permissions.sql` migration; registered previously-unused `PermissionGuard` as a global `APP_GUARD`; widened `@Roles` to include `SUB_ADMIN` + added `@Permissions(...)` on courses, students (users), enrollments, doubt-sessions, and assignment/test grading endpoints
- [x] Media storage: new public `course-media` Supabase Storage bucket (`014_course_media_bucket.sql`) for course/category thumbnails; added `uploadThumbnail` endpoints + services; admin UI now uploads image files (png/jpeg/webp) instead of external URLs
- [x] Enrollment manual-enrollment modal: enhanced with iOS-style translucent glass panel (backdrop-blur + translucent background) in addition to the existing blurred overlay
- [x] Fixed question-bank bulk import silently dropping the `topic`/subject column: `question-import.util.ts` never parsed a `topic` cell even though the DB, question builder UI, and analytics breakdown all support it — added parsing + propagated to CSV/JSON/XLSX templates
- [x] Enrollment status labels clarified ("Access revoked" instead of "Expired") for course-access disable/restore
- [x] Students list: added client-side "Export CSV" button (name, email, role, status, joined)

### Next Step
- Apply migrations `013_sub_admin_permissions.sql` and `014_course_media_bucket.sql` in Supabase
- Wire granular `@Permissions` checks onto remaining assignment/test CRUD routes (currently only grading is permission-gated; others are role-gated to ADMIN+SUB_ADMIN without a fine-grained slug)
- Build out full `/admin/students` payments + login/device-activity tabs (devices table exists but isn't surfaced in student detail yet)
- Excel/CSV export server endpoint (current export is client-side CSV only, no XLSX)

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
- [x] Updated APP_NAME/metadata from "Turbo NPN" to "Technical Pilot LMS"
- [x] Removed public file upload test endpoint
- [x] Created migration 002_drop_unused_tables.sql
- [x] Full migration 001 with all ARCHITECTURE.md tables + RLS policies
- [x] Cleaned env schema (removed AWS vars)
- [x] Updated .env.example with correct required vars

## Current Database
- profiles, devices, audit_logs (as per current_in_database.sql)
- Blog tables exist but migration 002 drops them

### Phase 3.2: Admin Lesson Asset Uploads (Done)
- [x] Video lessons can upload directly to VdoCipher with a course/chapter/lesson title hierarchy
- [x] PDF lessons upload to the private `course-materials` Supabase bucket using course/chapter/lesson folders
- [x] Video metadata and PDF note paths are persisted against the lesson
- [x] Assignment and test lessons remain unchanged for later implementation
- [x] Multipart upload size uses the configured `FILE_MAX_SIZE` limit
- [x] Fixed validation error: removed duration_seconds requirement for PDF uploads, accepting any response.
- [x] Removed duration_seconds field from lesson schema as it's not needed for pre-recorded/uploaded content.
- [x] Removed Duration (s) input from admin lesson creation form.

### Next Step
- Apply `009_course_materials_bucket.sql`, configure an upload-sized `FILE_MAX_SIZE`, and test video/PDF uploads with provider credentials.
- Fixed video upload 413 handling: multipart requests no longer receive a JSON content type, and Fastify body limits now follow `FILE_MAX_SIZE`.
- Fixed VdoCipher upload credentials: use documented `PUT /api/videos` with course/chapter folder IDs instead of unsupported `POST /api/videos`.
- Fixed admin upload UX: file uploads now show a centered blocking loading overlay instead of inline button spinners, and the non-functional PDF watermark overlay was removed.

### Phase 1.5: Frontend Auth Error Handling (Done)
- [x] Sign-in form handles EMAIL_NOT_CONFIRMED → redirects to /auth/confirm-email?email=...
- [x] Sign-in form handles DEVICE_LIMIT_REACHED → shows sessions picker UI, user removes one, then auto-retries sign-in
- [x] Device-limit sign-in now forcibly opens a translucent session-management popup from the action result, with device metadata and sign-out controls
- [x] API exception filter preserves structured device-limit code and session records for the frontend
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
- [x] Fixed sign-out-all-devices bug: sends a valid empty JSON payload with a real bearer token, and guards missing authenticated sessions before hitting the API.
- [x] Added fetch-failure resiliency for auth flows: ipinfo lookup now fails safe, safeFetch now surfaces a friendly API-unreachable message with localhost/127.0.0.1 fallback retry, and sign-in normalizes fetch-failed AuthErrors
- [x] Fixed reset-password OTP mismatch and security: UI now accepts 6-8 digits, schema/DTO aligned, and backend now verifies recovery OTP before allowing password change
- [x] Improved resend-OTP errors by surfacing/logging provider error message instead of generic failure
- [x] Fixed sign-up for existing unconfirmed users: resend OTP failure no longer hard-fails registration flow (warning logged, flow continues to confirm-email screen)
- [x] Sidebar: user avatar + name + email in footer dropdown (ShadCN pattern)
- [x] Sidebar: dropdown includes Profile, Settings, Sign out with proper destructive style
- [x] Sidebar: removed duplicate Account nav group (moved to footer dropdown)
- [x] Sidebar: added SidebarSeparator between nav groups

### Phase 3.4: Admin Course/Chapter/Lesson Bug Fixes (Done)
- [x] Fixed chapters/lessons invisible in admin UI: `chapters.findByCourse` returned a partial lesson projection (`id, title, lesson_type, sort_order, is_published`) that failed the frontend Zod `LessonSchema` (which required `chapter_id`/`description`) — `getChapters` swallowed the error and returned `[]`. Now selects `*, lessons(*)` with nested sort ordering.
- [x] Fixed broken chapter/lesson reorder: `ReorderChaptersDto`/`ReorderLessonsDto` had no validation decorators, so the global `ValidationPipe({ whitelist: true })` stripped the array, making `dto.chapters`/`dto.lessons` undefined and throwing on `.map()`. Added nested `@ValidateNested` item DTOs.
- [x] Reorder services now surface Supabase errors instead of silently discarding them
- [x] Course status: all draft/published/archived transitions available (was one-way into archived); `published_at` preserved on re-publish and cleared when returning to draft
- [x] Categories: slug auto-generated/sanitized via new `slugify()` in `@repo/utils` (fixes "Slug must be kebab-case" 400)
- [x] Admin categories page now sends auth + `includeInactive=true` so inactive categories are visible
- [x] Frontend schemas (chapter/lesson/course/category/video) made tolerant (`.passthrough()`, optional nullables) so a single field drift no longer blanks the entire admin page
- [x] Cascade delete: removes VdoCipher video assets and Supabase Storage PDFs for a deleted lesson/chapter/course (DB rows already cascade via FKs)
- [x] Fixed duplicate `fastify` install (5.11.3 via @nestjs/platform-fastify vs direct 5.12.1) that broke the API type build — added pnpm override; API now compiles with 0 TSC issues and boots successfully

### Phase 3.5: VdoCipher Upload 403 Fix (Done)
- [x] Root cause: the S3 browser-POST omitted `success_action_status` and `success_action_redirect`. VdoCipher's signed policy declares conditions for both but does not return them in `clientPayload`, and S3 answers 403 when a POST omits a field its policy conditions on.
- [x] Upload form is now built in explicit policy-field order (`x-amz-credential`, `x-amz-algorithm`, `x-amz-date`, `x-amz-signature`, `key`, `policy`), then the two `success_action_*` fields, with `file` appended last (S3 ignores any field after `file`)
- [x] No `Authorization` header is sent to the S3 upload link; `validateStatus` widened to accept the 201 S3 returns; `maxBodyLength/maxContentLength` set to Infinity
- [x] Folder creation (`POST /videos/folders`) is best-effort — any failure (including a plan-gated 403) logs and falls back to the parent/root instead of aborting the upload
- [x] New `describeAxiosError()` names the failing step and includes VdoCipher's response body, so a future failure is no longer an opaque "Request failed with status code 403"

## Immediate Next Step (In Progress)
### Requested Student/Admin UX Corrections (In Progress)
- [x] Secured course PDFs: the API now validates JWT + active enrollment and streams private Supabase bytes through the Next.js proxy; no Supabase URL, bucket, object key, or signed URL reaches the browser.
- [x] Added migration `015_private_course_materials.sql` to force `course-materials` private and remove common public-read policies.
- [x] VdoCipher playback remains OTP-gated with provider-side watermarking and a short configurable TTL; the provider iframe URL necessarily remains visible to the browser for DRM playback.
- [x] Applied shared responsive liquid-glass surfaces, cursor-reactive ambient motion, and blurred modal/sheet backdrops across auth, student dashboard, My Courses, and admin routes.
- [x] Removed Dashboard from the student sidebar; `/dashboard` now redirects to `/dashboard/courses`.
- [x] My Courses now uses the correctly spelled `/dashboard/courses` route and library view; removed the legacy `/cources` routes.
- [x] Admin sidebar now signs out instead of linking back to the site.
- [x] Doubt-session DELETE no longer sends an empty JSON request body.
- [x] Admin enrollment rows now include a View dialog with ordered chapter/lesson progress and PDF completion state.
- [x] Admin student progress is grouped by course, chapter, and lesson hierarchy.
- [x] Added student-scoped assignment/test attempt history and on-demand question analytics inside the enrollment progress dialog, including attempt timing, score/pass bars, marks, correctness, answers, and per-question time.
- [x] `safeFetch` retries transient API connection failures during concurrent web/API startup, preventing initial course-progress loads from failing on the startup race.
- [x] Student `/courses` now always shows published courses, including for authenticated students; enrolled-course content remains under `/dashboard/courses`.
- [x] Paid course enrollment now creates a Razorpay order, opens Checkout, verifies the payment signature server-side, and activates enrollment.
- [x] Razorpay payment verification is idempotent when `payment.captured` reaches the webhook before the browser callback; Checkout now prefills the signed-in email.
- [x] Razorpay `payment.failed` webhook events now mark pending payment rows as failed instead of leaving stale pending orders.
- [x] Added the existing favicon asset at the web public root so browser requests to `/favicon.ico` no longer return 404.
- [x] Diagnosed production Auth.js invalid JSON: web API URL template incorrectly used `/api`, while NestJS auth routes are rooted at `/auth`; corrected both web API URL examples and added upstream status/content-type/path details to non-JSON errors.
- [x] Fixed admin video upload UnauthorizedException after 15-minute access-token expiry: direct uploads now obtain a server-refreshed token, and middleware checks the JWT `exp` claim instead of the unrelated three-day session refresh timestamp.
- [x] Fixed student past-attempt detail 403s by separating the ownership lookup from nested attempt details, explicitly verifying `student_id`, and then loading the detail record without the fragile ownership-filtered join.
- [x] Added inline admin chapter title/description editing with update action; softened the admin course-completion tooltip to low-opacity translucent styling; invalid/stale sessions now redirect to normal sign-in instead of falsely showing the disabled-account message.
- [x] Signup auto-login reviewed: blocked safely because new accounts are created with email confirmation required and the password is not retained; confirmation continues to lead to sign-in.
- [ ] Diagnose live booking response/configuration if My Bookings remains empty against the configured Supabase data.

### Phase 3.3: Assignment/Test MSQ Module + Admin Content Ordering + Student UX (Complete)
- [x] Migration 010_msq_assignments_tests.sql written (questions now belong to test OR assignment, msq question_type, assignment_attempts/answers + option-junction tables, RLS)
- [x] Sample import templates created: apps/web/public/templates/question-import-template.{csv,json,xlsx}
- [x] Backend: AssignmentsModule + TestsModule (CRUD, question/option CRUD, CSV/JSON/XLSX bulk import), lessons PDF delete endpoint
- [x] Frontend: admin course-detail UI — chapter/lesson up/down reorder buttons, publish/draft toggle buttons, video/pdf delete+reupload, assignment/test question builder + import UI
- [x] Imported bulk questions append below existing questions instead of replacing them, while preserving question_number and sort_order offsets.
- [x] Admin question editor accepts manual question numbers and no longer exposes reorder arrows as the ordering mechanism.
- [x] Student lesson view includes prev/next lesson navigation and a manual completion action for video/PDF lessons.
- [x] Video progress now persists at completion threshold, on natural end, and on unload/visibility hide so last_position_seconds is not lost.
- [x] Mark as completed only when video progress is above 80% (manual action); auto-complete at 90% (unobtrusive)
- [x] Prevent downgrade of completed status on re-watch (if already completed, toggle button is disabled)
- [x] Chapter progression: first chapter always unlocked; other chapters unlock only when ALL lessons in previous chapter are completed
- [x] Lock icon + disabled state + informative message shown for locked chapters
- [x] PDF viewer with "CONTENT RESERVED" watermark (2x per page, light visible, rotated -45 degrees)
- [x] PDF access requires active enrollment verification (server-side)
- [x] Signed PDF URLs expire after 1 hour
- [x] Responsive admin portal: mobile drawer sidebar (Sheet component), desktop fixed sidebar, proper flex layout
- [x] Loading spinners for all async operations (OrbitalSpinner SVG component, 3 rotating orbits)
- [x] Device limit flow: "Sign out all devices" button on device limit error using Supabase global signOut
- [x] Type check passes: web (tsc --noEmit), api (nest build)
- [x] Fixed student access to past attempts: the student detail route now queries attempt rows by both id and student_id instead of reusing the admin-only detail lookup, which was returning 404 even for valid student attempts.
- [x] Added regression tests covering student-owned assignment/test attempt retrieval.

### Previously queued
- Apply migration 008_profile_details.sql in Supabase
- Test registration with full name and date of birth, then verify the profile view
- Test video resume/completion and confirm course progress averages all video lessons
- Verify the security curtain appears on tab switch without triggering on player clicks
- Verify the API honors MAX_DEVICES_PER_USER from apps/api/.env

### Phase 3.1: Video Resume + Security Hardening (Done)
- [x] GET /progress/lesson/:lessonId endpoint (NestJS) — returns last_position_seconds
- [x] Next.js proxy routes: GET + PATCH /api/progress/[lessonId]
- [x] VideoPlayer: fetches resume position on mount; sets player.video.currentTime on loadedmetadata
- [x] VideoPlayer: VdoCipher api.js SDK (VdoPlayer.getInstance) — real API, not postMessage hacks
- [x] VideoPlayer: timeupdate/ended event listeners via player.video.addEventListener
- [x] VideoPlayer: upsert progress on PATCH — creates on first call, updates on subsequent
- [x] VideoPlayer: 3-position randomly-moving HTML watermark overlay + server-side VdoCipher watermark
- [x] VideoPlayer: black curtain on tab switch (visibilitychange), window blur, PrintScreen key
- [x] VideoPlayer: player.video.pause() called on visibility loss/window blur
- [x] VideoPlayer: keyboard shortcut blocking (PrintScreen, Win+Shift+S, Cmd+Shift+3/4/5)
- [x] VideoPlayer: saves on unmount, on visibility hide, periodic every 8s
- [x] VideoPlayer: auto-completes at 90% watch threshold
- [x] CSP: added player.vdocipher.com to script-src and *.vdocipher.com to connect-src

### Phase 3.0: VdoCipher Video Streaming (Done)
- [x] Migration 008: rename vimeo_video_id → vdocipher_video_id in video_lessons, drop vimeo_uri, add video_sessions table
- [x] VideosModule (NestJS) — OTP endpoint with enrollment guard, concurrent session check, watermark, per-user rate limit (10/min), audit log
- [x] Admin endpoints: create/update/delete/get video_lesson records
- [x] OTP proxy route in Next.js (apps/web/app/api/video-otp/[lessonId]) — access token never reaches client
- [x] VideoPlayer component — VdoCipher iframe, DRM-required allow="encrypted-media", loading/error states
- [x] Lesson viewer page: /dashboard/courses/[courseId]/lessons/[lessonId]
- [x] Course progress list links video lessons to viewer page
- [x] Env vars: VDOCIPHER_API_SECRET, VDOCIPHER_OTP_TTL_SECONDS added to schema + .env.example
- [x] Admin UI: "Link Video" / "Edit Video" button on video-type lessons in course detail page
- [x] Admin UI: GET /videos/course/:courseId endpoint + server action for pre-loading video IDs
- [x] Swagger: global bearer auth applied — token now sent on all requests after Authorize click
- [x] Swagger URL: http://localhost:8000/api-docs (sign in → copy tokens.access_token → Authorize)

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
