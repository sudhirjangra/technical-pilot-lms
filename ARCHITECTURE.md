# Architecture Specification — Technical Pilot LMS

## 1. System Overview

A comprehensive Learning Management System for institutional use. Students purchase courses, learn through videos/notes/assignments/tests, track progress, book doubt sessions, and earn referral rewards. Admin manages all content, users, payments, and analytics. Sub-admins get configurable privileges.

**Deployment Model:** NestJS API serves both Next.js web frontend and future mobile apps (React Native).

## 2. Tech Stack

| Layer          | Technology                                  | Rationale                                           |
| -------------- | ------------------------------------------- | --------------------------------------------------- |
| Frontend       | Next.js 15 (App Router, Turbopack)          | SSR, SEO, Server Actions                            |
| UI             | TailwindCSS + ShadCN UI + Aceternity        | Themeable, accessible, professional                 |
| Backend        | NestJS 11 + Fastify                         | Modular, type-safe, serves web + mobile             |
| Database       | Supabase (PostgreSQL 15+)                   | RLS, Auth, Storage, Realtime built-in               |
| Auth           | Supabase Auth + NextAuth 5                  | Device tracking, RLS integration, frontend sessions |
| Video          | Vimeo Professional                          | DRM, no-download, 5TB, anti-piracy                  |
| Payments       | Razorpay                                    | Indian gateway, webhooks, easy integration          |
| File Storage   | Supabase Storage                            | PDFs, thumbnails, with access policies              |
| Email          | Resend                                      | Transactional emails, confirmations, reminders      |
| State (client) | React Query + Zustand                       | Server state + UI state separation                  |
| Charts         | Recharts                                    | Test analytics, admin reports                       |
| Scheduling     | React Big Calendar (UI) + pg_cron (backend) | Doubt session calendar, automated reminders         |
| Monorepo       | Turborepo + pnpm workspaces                 | Fast builds, shared packages                        |

## 3. Roles & Permissions

| Role          | Description                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Admin**     | Full system control. Manages courses, users, payments, referrals, reports, sub-admin privileges.                                   |
| **Sub-admin** | Configurable privileges granted by admin. Can manage course content, view reports, handle doubt sessions — whatever admin enables. |
| **Student**   | Purchases courses, learns, takes tests, books doubt sessions, refers friends.                                                      |

### Permission System (Sub-admin)

Admin assigns granular permissions to sub-admins via a permission matrix:

- `courses:read`, `courses:write`, `courses:publish`
- `students:read`, `students:manage_devices`
- `payments:read`, `payments:refund`
- `doubt_sessions:manage`
- `reports:read`, `reports:export`
- `referrals:read`, `referrals:approve`

## 4. Database Schema (Supabase PostgreSQL)

### Core Tables

```
users (managed by Supabase Auth)
├── id (UUID, PK — from auth.users)
├── email
├── role (enum: admin, sub_admin, student)
├── full_name
├── phone
├── avatar_url
├── is_active
├── created_at, updated_at

sub_admin_permissions
├── id (UUID, PK)
├── user_id (FK → users.id)
├── permissions (text[] — array of permission slugs)
├── granted_by (FK → users.id)
├── created_at, updated_at

devices
├── id (UUID, PK)
├── user_id (FK → users.id)
├── device_fingerprint
├── device_name
├── platform (web, android, ios)
├── last_active_at
├── created_at

sessions (audit log)
├── id (UUID, PK)
├── user_id (FK → users.id)
├── device_id (FK → devices.id)
├── ip_address
├── user_agent
├── started_at
├── ended_at
├── is_active
```

### Course & Content Tables

```
categories
├── id (UUID, PK)
├── name, slug, description
├── thumbnail_url
├── sort_order
├── is_active

courses
├── id (UUID, PK)
├── category_id (FK → categories.id)
├── title, slug, description
├── thumbnail_url
├── price (decimal)
├── discount_price (decimal, nullable)
├── status (enum: draft, published, archived)
├── created_by (FK → users.id)
├── published_at
├── created_at, updated_at

chapters
├── id (UUID, PK)
├── course_id (FK → courses.id)
├── title, description
├── sort_order
├── is_published

lessons
├── id (UUID, PK)
├── chapter_id (FK → chapters.id)
├── title, description
├── lesson_type (enum: video, pdf, assignment, test)
├── sort_order
├── is_published
├── duration_seconds (for videos)

video_lessons
├── id (UUID, PK)
├── lesson_id (FK → lessons.id)
├── vimeo_video_id
├── vimeo_uri
├── duration_seconds
├── thumbnail_url

pdf_notes
├── id (UUID, PK)
├── lesson_id (FK → lessons.id)
├── file_path (Supabase Storage)
├── file_size_bytes
├── page_count

assignments
├── id (UUID, PK)
├── lesson_id (FK → lessons.id)
├── title, instructions
├── max_score
├── due_days_after_enrollment
```

### Quiz/Test Tables

```
tests
├── id (UUID, PK)
├── lesson_id (FK → lessons.id)
├── title
├── time_limit_seconds
├── passing_score_percent
├── max_attempts

questions
├── id (UUID, PK)
├── test_id (FK → tests.id)
├── question_text
├── question_type (enum: mcq, text)
├── points
├── explanation
├── sort_order

question_options
├── id (UUID, PK)
├── question_id (FK → questions.id)
├── option_text
├── is_correct
├── sort_order

test_attempts
├── id (UUID, PK)
├── test_id (FK → tests.id)
├── student_id (FK → users.id)
├── started_at, completed_at
├── score, max_score
├── time_spent_seconds

test_answers
├── id (UUID, PK)
├── attempt_id (FK → test_attempts.id)
├── question_id (FK → questions.id)
├── selected_option_id (FK, nullable)
├── text_answer (nullable)
├── is_correct
├── time_spent_seconds
```

### Enrollment & Progress

```
enrollments
├── id (UUID, PK)
├── student_id (FK → users.id)
├── course_id (FK → courses.id)
├── enrolled_at
├── status (enum: active, completed, expired)
├── completed_at

progress
├── id (UUID, PK)
├── student_id (FK → users.id)
├── lesson_id (FK → lessons.id)
├── status (enum: not_started, in_progress, completed)
├── progress_percent (0-100, for videos)
├── last_position_seconds (video resume)
├── completed_at
├── updated_at

assignment_submissions
├── id (UUID, PK)
├── assignment_id (FK → assignments.id)
├── student_id (FK → users.id)
├── file_path
├── submitted_at
├── score (nullable, graded by admin)
├── feedback (nullable)
```

### Payments

```
payments
├── id (UUID, PK)
├── student_id (FK → users.id)
├── course_id (FK → courses.id)
├── amount (decimal)
├── discount_amount (decimal)
├── razorpay_order_id
├── razorpay_payment_id
├── razorpay_signature
├── status (enum: pending, completed, failed, refunded)
├── refund_reason (nullable)
├── invoice_number
├── created_at, updated_at

referral_discounts_applied
├── id (UUID, PK)
├── payment_id (FK → payments.id)
├── referral_code_id (FK → referral_codes.id)
├── discount_percent
├── discount_amount
```

### Referral System

```
referral_codes
├── id (UUID, PK)
├── user_id (FK → users.id)
├── code (unique, short string)
├── is_active
├── created_at

referral_config (singleton or per-course)
├── id (UUID, PK)
├── referee_discount_percent (e.g. 10)
├── referrer_commission_percent (e.g. 5)
├── min_purchase_amount
├── is_active

referrals
├── id (UUID, PK)
├── referrer_id (FK → users.id)
├── referee_id (FK → users.id)
├── referral_code_id (FK → referral_codes.id)
├── status (enum: pending, converted, expired)
├── converted_at

referral_commissions
├── id (UUID, PK)
├── referral_id (FK → referrals.id)
├── payment_id (FK → payments.id)
├── amount (decimal)
├── status (enum: pending, approved, paid, rejected)
├── approved_by (FK → users.id, nullable)
├── paid_at (nullable)
```

### Doubt Sessions

```
doubt_slots
├── id (UUID, PK)
├── created_by (FK → users.id)
├── date
├── start_time, end_time
├── duration_minutes
├── max_bookings
├── current_bookings
├── status (enum: available, full, cancelled)

doubt_bookings
├── id (UUID, PK)
├── slot_id (FK → doubt_slots.id)
├── student_id (FK → users.id)
├── status (enum: confirmed, cancelled, completed, no_show)
├── booked_at
├── cancelled_at (nullable)
├── meeting_link (nullable)
```

### Audit & Analytics

```
audit_logs
├── id (UUID, PK)
├── user_id (FK → users.id)
├── action (string: login, video_access, pdf_download, payment, etc.)
├── resource_type, resource_id
├── ip_address
├── user_agent
├── metadata (jsonb)
├── created_at
```

## 5. Row-Level Security (RLS) Policies

All tables have RLS enabled. Key policies:

- **Students** can only read their own enrollments, progress, payments, bookings
- **Students** can read published courses/chapters/lessons
- **Students** can only access content for courses they're enrolled in
- **Admin** bypasses RLS (service_role key in NestJS)
- **Sub-admin** access enforced at application level (NestJS guards check permission array)
- **PDF downloads** require active enrollment (enforced via Supabase Storage policies)

## 6. Security Architecture

### Authentication Flow

1. Student registers → Supabase Auth creates user → NestJS creates profile
2. Login → Supabase Auth validates → checks device count (max 2) → issues JWT
3. NextAuth on frontend manages session cookies
4. Every API call includes Supabase JWT → NestJS validates → RLS enforces access

### Device Limit Enforcement

- On login: count active devices for user
- If >= 2: reject login OR force logout oldest device (configurable by admin)
- Device fingerprint stored for tracking

### Content Security

- Video: Vimeo DRM + signed URLs + domain restriction
- PDFs: Supabase Storage with RLS + signed time-limited URLs
- Dynamic watermark: student email/name overlaid on video player (frontend)
- Audit logs track all content access
- Session timeout on inactivity

## 7. API Architecture (NestJS)

### Module Structure

```
src/
├── main.ts
├── app.module.ts
├── common/
│   ├── guards/ (auth, roles, permissions, device-limit)
│   ├── decorators/ (current-user, roles, permissions)
│   ├── interceptors/ (audit-log, response-transform)
│   ├── filters/ (global exception)
│   └── config/ (supabase, razorpay, vimeo, resend)
├── modules/
│   ├── auth/
│   ├── users/
│   ├── courses/
│   ├── chapters/
│   ├── lessons/
│   ├── videos/ (Vimeo integration)
│   ├── tests/
│   ├── progress/
│   ├── payments/ (Razorpay)
│   ├── referrals/
│   ├── doubt-sessions/
│   ├── reports/
│   └── audit/
```

### Key Integrations

- **Supabase SDK** (`@supabase/supabase-js`): DB queries, auth, storage
- **Vimeo API**: Video upload, player embed, DRM settings
- **Razorpay SDK**: Order creation, payment verification, webhooks, refunds
- **Resend**: Transactional emails (welcome, payment confirm, booking reminders)

## 8. Frontend Architecture (Next.js)

### Route Structure

```
app/
├── (public)/
│   ├── page.tsx (landing)
│   ├── courses/ (browse)
│   └── auth/ (login, register, forgot-password)
├── (student)/
│   ├── dashboard/
│   ├── courses/[id]/ (learning view)
│   ├── tests/[id]/
│   ├── payments/
│   ├── doubt-sessions/
│   └── referrals/
├── (admin)/
│   ├── dashboard/
│   ├── courses/ (CRUD)
│   ├── students/
│   ├── payments/
│   ├── doubt-sessions/
│   ├── referrals/
│   ├── reports/
│   └── settings/ (sub-admin management)
├── api/
│   └── auth/[...nextauth]/
```

## 9. Third-Party Services (Client-Procured)

| Service            | Purpose                           | Estimated Cost     |
| ------------------ | --------------------------------- | ------------------ |
| Supabase Pro       | Database, Auth, Storage, Realtime | ~$25/mo            |
| Vimeo Professional | Video hosting, DRM, 5TB           | ~$200/yr           |
| Razorpay           | Payment gateway                   | 2% per transaction |
| Resend             | Transactional email               | Free tier / $20/mo |
| Vercel Pro         | Frontend hosting                  | ~$20/mo            |

## 10. Future-Ready Considerations (Phase 2, Not in Current Scope)

- Mobile apps (React Native) — NestJS API already serves them
- AI Doubt Solver (GPT-4/Claude integration)
- Parent Dashboard for monitoring student progress
- Live Classes (Zoom/Google Meet integration)
- Advanced server-side video watermarking
