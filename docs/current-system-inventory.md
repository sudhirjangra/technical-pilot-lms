# Current System Inventory

Generated: 2026-08-17  
Project: Institution LMS  
Monorepo: Turborepo + pnpm workspaces

---

## 1. Frontend (Next.js 15 — `apps/web`)

### Routes / Pages

| Route | File | Access | Description |
|-------|------|--------|-------------|
| `/` | `app/(home)/page.tsx` | Public | Landing page |
| `/courses` | `app/courses/page.tsx` | Public | Published course listing |
| `/courses/[slug]` | `app/courses/[slug]/page.tsx` | Public | Course detail page |
| `/auth/sign-in` | `app/auth/sign-in/page.tsx` | Public | Sign-in form |
| `/auth/sign-up` | `app/auth/sign-up/page.tsx` | Public | Sign-up form |
| `/auth/confirm-email` | `app/auth/confirm-email/page.tsx` | Public | OTP email confirmation |
| `/auth/forgot-password` | `app/auth/forgot-password/page.tsx` | Public | Request password reset |
| `/auth/reset-password` | `app/auth/reset-password/page.tsx` | Public | Reset password with token |
| `/profile` | `app/profile/page.tsx` | Auth | User profile with tabs |
| `/dashboard` | `app/dashboard/page.tsx` | Auth | Student dashboard |
| `/dashboard/courses/[courseId]` | `app/dashboard/courses/[courseId]/page.tsx` | Auth | Student course viewer |
| `/dashboard/doubt-sessions` | `app/dashboard/doubt-sessions/page.tsx` | Auth | Student doubt session booking |
| `/admin` | `app/admin/page.tsx` | Admin | Admin dashboard root |
| `/admin/courses` | `app/admin/courses/page.tsx` | Admin | Course CRUD list |
| `/admin/courses/[id]` | `app/admin/courses/[id]/page.tsx` | Admin | Course detail + chapters + lessons |
| `/admin/categories` | `app/admin/categories/page.tsx` | Admin | Category CRUD |
| `/admin/students` | `app/admin/students/page.tsx` | Admin | Student list |
| `/admin/sub-admins` | `app/admin/sub-admins/page.tsx` | Admin | Sub-admin management + permissions |
| `/admin/enrollments` | `app/admin/enrollments/page.tsx` | Admin | Enrollment management |
| `/admin/payments` | `app/admin/payments/page.tsx` | Admin | Payment list |
| `/admin/doubt-sessions` | `app/admin/doubt-sessions/page.tsx` | Admin | Doubt slot management |
| `/api/auth/[...nextauth]` | `app/api/auth/[...nextauth]/route.ts` | — | NextAuth route handler |
| `/og` | `app/og/route.tsx` | Public | OpenGraph image generation |

### Frontend Components

**Auth:**
- `components/auth/sign-out.tsx` — Sign-out button
- `components/auth/session-other-logout.tsx` — Sign out a specific device
- `components/auth/session-all-logout.tsx` — Sign out all devices
- `components/auth/form/sign-in.form.tsx` — Sign-in form with device-limit handling
- `components/auth/form/sign-up.form.tsx` — Registration form
- `components/auth/form/change-password.form.tsx` — Change password (used in Security tab)
- `components/auth/form/change-email.form.tsx` — **DEAD UI** — all fields disabled, no backend endpoint, marked for removal
- `components/auth/form/confirm-email.form.tsx` — OTP confirmation form
- `components/auth/form/forgot-password.form.tsx` — Forgot password form
- `components/auth/form/reset-password.form.tsx` — Reset password form
- `components/auth/form/password-valid-errors.tsx` — Password validation error display

**Profile:**
- `components/profile/profile-header.tsx` — Avatar + name display
- `components/profile/profile-sidebar.tsx` — Sidebar navigation tabs (Profile, General, Security, Sessions, Appearance)
- `components/profile/profile-avatar-editor.tsx` — Avatar upload UI
- `components/profile/general-settings.tsx` — **PARTIALLY DEAD UI** — displays read-only name/email/phone with disabled Save button. Contains Delete Account functionality (active)
- `components/profile/security-settings.tsx` — Container for ChangePasswordForm + ChangeEmailForm
- `components/profile/sessions-settings.tsx` — Active sessions list with device logout
- `components/profile/appearance-settings.tsx` — Font/theme settings

**Admin:**
- `components/admin/sidebar.tsx` — Admin nav sidebar
- `components/admin/categories-client.tsx` — Category list + create + delete
- `components/admin/courses-client.tsx` — Course list + create + delete
- `components/admin/course-detail-client.tsx` — Course detail + chapter/lesson management
- `components/admin/enrollments-client.tsx` — Enrollment search + create
- `components/admin/payments-client.tsx` — Payment list display
- `components/admin/students-client.tsx` — Student list display
- `components/admin/sub-admins-client.tsx` — Sub-admin list + permission management
- `components/admin/doubt-slots-client.tsx` — Doubt slot creation and listing

**Dashboard:**
- `components/dashboard/` — Student dashboard components

**Courses:**
- `components/courses/` — Course listing/card components

**Shared:**
- `components/providers.tsx` — React Query + NextAuth session providers
- `components/session.tsx` — Session validation wrapper
- `components/back-navigation.tsx` — Back button
- `components/logo-icon.tsx` — Logo component

### Server Actions (`apps/web/server/`)

| File | Functions |
|------|-----------|
| `auth.server.ts` | `authorizeSignIn`, `signInWithCredentials`, `signUpWithCredentials`, `signOutCurrentDevice`, `signOutOtherDevice`, `signOutAllDevice`, `changePassword`, `forgotPassword`, `resetPassword`, `confirmEmail`, `resendOtp`, `refreshAccessToken`, `validateSessionIfExist`, `deleteAccount`, `removeSession` |
| `user.server.ts` | User profile fetch |
| `doubt-sessions.server.ts` | Doubt slot/booking operations for students |
| `cookie.server.ts` | Cookie utilities |
| `admin/categories.server.ts` | `getCategories`, `createCategory`, `deleteCategory` |
| `admin/courses.server.ts` | `getAdminCourses`, `createCourse`, `deleteCourse` |
| `admin/course-detail.server.ts` | `getCourseDetail`, `updateCourse` |
| `admin/chapters.server.ts` | `getChapters`, `createChapter`, `deleteChapter`, `createLesson`, `deleteLesson` |
| `admin/enrollments.server.ts` | `getCourseEnrollments`, `createEnrollment` |
| `admin/payments.server.ts` | Payment list retrieval |
| `admin/users.server.ts` | User list for admin |
| `admin/permissions.server.ts` | Sub-admin permission management |
| `student/` | Student-specific server actions |

### Authentication

- NextAuth 5 with Credentials provider (`auth.ts`)
- JWT session stored in cookie (`AUTH_SECRET`)
- Session contains: `id`, `email`, `role`, `full_name`, `phone`, `avatar_url`, `is_active`, `tokens` (access_token, refresh_token, session_token)
- Middleware (`middleware.ts`) enforces auth on protected routes
- Token refresh via `refreshAccessToken` (called in NextAuth `jwt` callback)

### Lib Utilities

| File | Purpose |
|------|---------|
| `lib/env.ts` | T3-oss typed env validation |
| `lib/safeFetch.ts` | Typed API fetch wrapper with Zod validation |
| `lib/safeAction.ts` | next-safe-action setup |
| `lib/device.ts` | Browser device info extraction |
| `lib/unstable_cache.ts` | Next.js cache wrapper |
| `lib/auth/` | Auth utilities |

---

## 2. Backend (NestJS 11 + Fastify — `apps/api`)

### Modules

| Module | Controller | Service | Description |
|--------|-----------|---------|-------------|
| `AuthModule` | `auth.controller.ts` | `auth.service.ts` | Registration, sign-in, sign-out, OTP, password reset/change, sessions, delete account, token refresh |
| `UsersModule` | `users.controller.ts` | `users.service.ts` | Admin user management |
| `CategoriesModule` | `categories.controller.ts` | `categories.service.ts` | Category CRUD |
| `CoursesModule` | `courses.controller.ts` | `courses.service.ts` | Course CRUD |
| `ChaptersModule` | `chapters.controller.ts` | `chapters.service.ts` | Chapter CRUD (nested under courses) |
| `LessonsModule` | `lessons.controller.ts` | `lessons.service.ts` | Lesson CRUD (nested under chapters) |
| `EnrollmentsModule` | `enrollments.controller.ts` | `enrollments.service.ts` | Enrollment management |
| `PaymentsModule` | `payments.controller.ts` | `payments.service.ts` | Razorpay order creation, verification, webhooks |
| `ProgressModule` | `progress.controller.ts` | `progress.service.ts` | Lesson progress tracking |
| `PermissionsModule` | `permissions.controller.ts` | `permissions.service.ts` | Sub-admin permission matrix CRUD |
| `DoubtSessionsModule` | `doubt-sessions.controller.ts` | `doubt-sessions.service.ts` | Doubt slot creation, booking |
| `HealthModule` | `health.controller.ts` | — | Uptime health check (public) |
| `FileModule` | — | `file.service.ts` | File upload utilities |
| `MailModule` | — | `mail.service.ts` | Resend email sending |

### API Endpoints

**Auth (`/auth`)**
- `POST /auth/sign-up` — Public
- `POST /auth/sign-in` — Public
- `POST /auth/sign-out` — Public
- `POST /auth/sign-out-allDevices` — Authenticated
- `POST /auth/resend-otp` — Public
- `PATCH /auth/confirm-email` — Public
- `PATCH /auth/forgot-password` — Public
- `PATCH /auth/reset-password` — Public
- `PATCH /auth/change-password` — Authenticated
- `PATCH /auth/refresh-token` — JwtRefreshGuard
- `DELETE /auth/delete-account` — Authenticated
- `GET /auth/sessions/:userId` — Authenticated (own only, or ADMIN)
- `GET /auth/session/:id` — Authenticated

**Categories (`/categories`)**
- `POST /categories` — ADMIN
- `GET /categories` — Public (with `?includeInactive=true`)
- `GET /categories/:id` — Public
- `PATCH /categories/:id` — ADMIN
- `DELETE /categories/:id` — ADMIN

**Courses (`/courses`)**
- `POST /courses` — ADMIN
- `GET /courses/admin` — ADMIN (all statuses)
- `GET /courses` — Public (published only)
- `GET /courses/slug/:slug` — Public
- `GET /courses/:id` — Public
- `PATCH /courses/:id` — ADMIN
- `DELETE /courses/:id` — ADMIN

**Chapters (`/courses/:courseId/chapters`)**
- `POST /courses/:courseId/chapters` — ADMIN
- `GET /courses/:courseId/chapters` — ADMIN
- `PATCH /chapters/:id` — ADMIN
- `DELETE /chapters/:id` — ADMIN

**Lessons (`/chapters/:chapterId/lessons`)**
- `POST /chapters/:chapterId/lessons` — ADMIN
- `GET /chapters/:chapterId/lessons` — ADMIN
- `PATCH /lessons/:id` — ADMIN
- `DELETE /lessons/:id` — ADMIN

**Enrollments (`/enrollments`)**
- `POST /enrollments` — ADMIN
- `GET /enrollments/course/:courseId` — ADMIN
- `GET /enrollments/student/:studentId` — ADMIN or own user
- `GET /enrollments/check/:courseId` — Authenticated (own enrollment check)

**Payments (`/payments`)**
- `POST /payments/create-order` — Authenticated
- `POST /payments/verify` — Authenticated
- `POST /payments/webhook` — Public (Razorpay webhook)
- `GET /payments` — ADMIN
- `GET /payments/:studentId` — ADMIN or own user

**Progress (`/progress`)**
- `POST /progress` — Authenticated (enrolled only)
- `GET /progress/:lessonId` — Authenticated (own)
- `GET /progress/course/:courseId` — Authenticated (own)

**Users (`/users`)**
- `GET /users` — ADMIN
- `GET /users/:id` — ADMIN
- `PATCH /users/:id` — ADMIN

**Permissions (`/permissions`)**
- `POST /permissions` — ADMIN
- `GET /permissions/:userId` — ADMIN
- `PATCH /permissions/:userId` — ADMIN

**Doubt Sessions (`/doubt-sessions`)**
- `POST /doubt-sessions/slots` — ADMIN
- `GET /doubt-sessions/slots` — Authenticated
- `POST /doubt-sessions/book` — Authenticated (student)
- `GET /doubt-sessions/bookings` — ADMIN
- `GET /doubt-sessions/my-bookings` — Authenticated (own)
- `PATCH /doubt-sessions/bookings/:id` — ADMIN

### Guards & Authorization

| Guard | File | Purpose |
|-------|------|---------|
| `JwtAuthGuard` | `common/guards/jwt-auth.guard.ts` | Global — validates Bearer JWT, attaches user payload to request. Public routes bypass via `@Public()` |
| `RolesGuard` | `common/guards/roles.guard.ts` | Global — enforces `@Roles(...)` decorator. Uses case-insensitive comparison. SUB_ADMIN has implicit access to all role-protected endpoints (logic bug noted) |
| `JwtRefreshGuard` | `common/guards/jwt-refresh.guard.ts` | Validates refresh token for token rotation |
| `EnrollmentGuard` | `common/guards/enrollment.guard.ts` | Verifies active enrollment for protected content |
| `PermissionGuard` | `common/guards/permission.guard.ts` | Sub-admin permission array check |

### Decorators

- `@Public()` — Bypasses JWT auth guard
- `@Roles(...roles)` — Requires specific roles
- `@User()` — Injects current user from request
- `@Permissions(...perms)` — Requires specific sub-admin permissions
- `@Ip()` — Extracts client IP

### Common Modules

- `SupabaseModule` — Provides `SUPABASE_ADMIN` and `SUPABASE_ANON` clients globally
- `LoggerModule` — Pino structured logging
- `NodeMailerModule` — Nodemailer (used by MailService)
- `ThrottleModule` — Rate limiting (10 req/s default, 5/min for auth)

### Mail Templates

- `sign-in-success.mail.ts` — New login notification
- `register-success.mail.ts` — Registration OTP email
- `reset-password.mail.ts` — Password reset email
- `confirm-email-success.mail.ts` — Email confirmed notification
- `change-password-success.mail.ts` — Password change notification

---

## 3. Shared Packages

### `packages/supabase`
- Supabase client creation (admin, anon, server, middleware)
- Generated TypeScript types (`Database` interface)
- Migrations (001–006)

### `packages/shadcn`
- ShadCN UI components + custom hooks
- Tailwind CSS configuration

### `packages/constants`
- `app.ts` — `APP_NAME`, `APP_URL` constants

### `packages/utils`
- `buildSearchParams.ts`, `date.ts`, `file.ts`, `formData.ts`, `group.ts`, `lib.ts`

### `packages/eslint-config`
- Shared ESLint configs: `next.js`, `nest.js`, `react-internal.js`, `base.js`

### `packages/ts-config`
- Shared TypeScript configs: `nextjs.json`, `nestjs.json`, `base.json`, `react-library.json`

---

## 4. Database Summary

See `docs/supabase-inventory.md` for full details.

**Core tables:** profiles, devices, audit_logs, sub_admin_permissions  
**Content tables:** categories, courses, chapters, lessons, video_lessons, pdf_notes, assignments, tests, questions, question_options, test_attempts, test_answers  
**Commerce tables:** enrollments, payments, referral_codes, referral_config, referrals, referral_commissions, referral_discounts_applied  
**Sessions table:** sessions (created in migration 003)  
**Doubt sessions:** doubt_slots, doubt_bookings  
**Progress:** progress, assignment_submissions  

---

## 5. Environment Variables

### `apps/web/.env`
- `API_URL` — NestJS backend URL
- `AUTH_SESSION_AGE` — NextAuth session lifetime (seconds)
- `AUTH_SECRET` — NextAuth JWT secret
- `AUTH_URL` — App base URL
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key

### `apps/api/.env`
- `HOST`, `PORT` — Server binding
- `ALLOW_CORS_URL` — CORS allowed origin
- `ACCESS_TOKEN_SECRET/EXPIRATION` — JWT signing
- `REFRESH_TOKEN_SECRET/EXPIRATION` — JWT refresh signing
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`, `MAIL_FROM` — Email service
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`

---

## 6. Known Issues at Audit Time

1. **Category creation throws an error** — root cause to be investigated (auth flow / RLS / validation)
2. **General Settings tab shows disabled form** — `Save Changes` button is permanently disabled; no update endpoint exists. Delete Account functionality is live and correctly wired.
3. **Change Email section** — Fully disabled UI, no backend endpoint exists. Should be removed.
4. **SUB_ADMIN implicit bypass in RolesGuard** — `|| user.role.toUpperCase() === 'SUB_ADMIN'` at the end of canActivate means sub-admins bypass all role checks unconditionally. This is a logic issue — sub-admins should only access endpoints explicitly permitting them.
5. **Sessions table in migration 003** — Created but not used by any application code. The app uses the `devices` table for session tracking, not the `sessions` table.
