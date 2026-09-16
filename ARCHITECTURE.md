# Technical Pilot LMS Architecture

This document describes the current implementation boundaries. `STATE.md` is the only active coding queue.

## System Shape

The repository is a Turborepo/pnpm monorepo with a Next.js web application and a NestJS API. The API serves the web application and is the future mobile integration boundary. Supabase provides PostgreSQL, Auth, RLS, and Storage. MongoDB provides immutable, self-contained attempt snapshot storage for assessments.

```text
apps/web/       Next.js App Router, pages, client components, server actions, API proxies
apps/api/       NestJS modules, guards, DTOs, Supabase queries, MongoDB models, provider integrations
packages/       Shared config, constants, Supabase types/client, UI, utilities, and TS config
```

## Current Integrations

| Concern | Current implementation |
| --- | --- |
| Authentication | Supabase Auth plus NextAuth 5 session management (DOB removed) |
| Authorization | JWT validation, role guards (`Roles`), permission guards (`RequirePermissions`), active-enrollment checks |
| Primary Database | Supabase PostgreSQL accessed through the Supabase SDK |
| Attempt History | MongoDB singleton connection (`MongoModule`/`MongoService`) for frozen assessment attempt snapshots |
| Private files | Supabase Storage; PDF bytes are protected through the API/Next.js proxy flow |
| Course media | Supabase `course-media` storage for course thumbnails and public assets |
| Video | VdoCipher Enterprise DRM, 5-min time-limited OTP tokens, client watermark overlay, direct custom thumbnail upload |
| Payments | Razorpay order creation, browser signature verification, and idempotent webhooks (No refunds / deductions) |
| Referrals & Wallet | Referral code generation (`TP...`), friend discount coupons, referrer wallet credits, manual payout ledger |
| Email | Nodemailer SMTP transactional emails (purchases, course launches, archive notices, password/security alerts) |
| Client state | Server actions/server fetches, React Query, and Zustand where appropriate |

## Domain Modules

The API is organized under `apps/api/src/features/` by domain. Current domains include:
- `auth`: Registration, login, Google OAuth, device limit tracking, session management, password recovery.
- `users`: User profile management, avatar updates, admin student management, role and status toggling.
- `permissions`: Sub-admin RBAC management, 30+ granular permission slugs, permission assignments.
- `categories`: Course category hierarchy and catalog organization.
- `courses`: Course CRUD, drag-and-drop structure, publishing, leaderboards, thumbnail uploads.
- `chapters`: Chapter hierarchy, sequencing, and course curriculum organization.
- `lessons`: Polymorphic lesson engine (video, PDF, assignment, test), PDF upload/proxying, lesson ordering.
- `videos`: VdoCipher integration, OTP generation, custom video thumbnail upload, watermarking config.
- `enrollments`: Course enrollment lifecycle, access verification, enrollment auditing.
- `payments`: Razorpay orders, payment verification, webhook ingestion, student invoice history (Refunds disabled).
- `referrals`: Referral codes (`TP...`), referee discount coupon validation, referrer wallet points ledger, cash conversion requests.
- `assignments`: Assignment configuration, flexible 2-4 option questions, categorization, attempts, MongoDB snapshots.
- `tests`: Test configuration, timer/attempt rules, flexible questions, categorization, attempts, MongoDB snapshots.
- `doubt-sessions`: Doubt slot scheduling, audience targeting (`all`, `course`, `student`), automated notifications, student booking.
- `notifications`: In-app notification delivery, read tracking, targeted broadcasts.
- `student-queries`: In-app query tickets, public guest Contact Us submissions, extra attempt requests.
- `progress`: Granular lesson and course completion tracking, automatic progress synchronization on submission.
- `analytics`: Platform-wide KPIs, course drilldowns, student progress reports, weak-point detection.
- `health`: Terminus health checks for database, MongoDB, memory, and disk.
- `file` & `mail`: Shared storage handling and transactional SMTP email delivery.

The web application is organized around public course discovery, authenticated student dashboard flows, admin management pages, server actions, and narrow API proxy routes for protected browser operations.

## Data and Access Rules

- All Supabase database access goes through the Supabase SDK. Do not introduce an ORM.
- Supabase RLS is the database defense layer; API guards are the application defense layer.
- Assessment attempt history is authored and read primarily from MongoDB snapshot documents, with Supabase retaining relational reference records.
- Admin operations use the server-side Supabase client. Student operations must validate the authenticated user and active enrollment before returning protected course content.
- Students may access only their own enrollments, progress, payments, bookings, attempts, referral wallets, and notifications.
- Sub-admin access requires both an allowed role and the required permission slug where the route is permission-scoped.
- Private PDF storage paths and provider/API secrets must remain server-side. Browser PDF access uses the protected proxy flow.
- Video playback uses short-lived VdoCipher OTP data and a watermark; the provider player URL is necessarily visible to the browser.
- Payment webhooks must verify the Razorpay signature and remain idempotent. Direct refund or money-deducting APIs are completely removed from the platform.
- Sensitive operations should continue to use the existing audit logging patterns.

## Current Content Model

```text
category
  course
    chapter
      lesson: video | pdf | assignment | test
```

- **Assignments and Tests**: Support MCQ/MSQ/Text questions with 2, 3, or 4 options, question taxonomy metadata (topic, subtopic, cognitive category: `reasoning`, `calculation`, `numerical`, `conceptual`, `other`, and difficulty: `easy`, `medium`, `hard`). Manual grading is completely removed; calculated marks are authoritative and frozen into MongoDB attempt records.
- **Progress Tracking**: Granular lesson progress is tracked per student and aggregated into overall course progress. Submitting an assignment or test immediately updates lesson completion status.

## Configuration

Limits, TTLs, upload sizes, and other adjustable values belong in the shared config package or validated environment configuration. Do not hardcode device limits, token lifetimes, upload limits, or UI sizing that is already configurable.

## UI Constraints

- Use the existing Tailwind/ShadCN patterns and shared components.
- Keep layouts usable from 320px through desktop widths.
- Avoid horizontal overflow; tables may use an explicit scroll boundary.
- Preserve mobile touch targets and existing loading, error, empty, and access-revoked states.
- Floating cursor trail dot is automatically disabled on touch devices (`@repo/shadcn/FollowCursor`).
- In-app assessment exit guards (`test-guard.ts`, `GuardedLink`, `LessonBackLink`) prevent accidental loss of student work.
- Keep changes local to the owning feature rather than introducing cross-cutting abstractions without a concrete need.

## Documentation Precedence

1. Current source code and tests define runtime behavior.
2. `STATE.md` defines the only active implementation task.
3. `AGENTS.md` defines coding workflow and constraints.
4. `LMS_ROADMAP.md` contains future work only.
5. `API_AUDIT.md` and `SUPABASE_FEATURES.md` are reference/audit material and are not coding queues.