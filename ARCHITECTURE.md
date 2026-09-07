# Technical Pilot LMS Architecture

This document describes the current implementation boundaries. `STATE.md` is the only active coding queue.

## System Shape

The repository is a Turborepo/pnpm monorepo with a Next.js web application and a NestJS API. The API serves the web application and is the future mobile integration boundary. Supabase provides PostgreSQL, Auth, RLS, and Storage.

```text
apps/web/       Next.js App Router, pages, client components, server actions, API proxies
apps/api/       NestJS modules, guards, DTOs, Supabase queries, provider integrations
packages/       Shared config, constants, Supabase types/client, UI, utilities, and TS config
```

## Current Integrations

| Concern | Current implementation |
| --- | --- |
| Authentication | Supabase Auth plus NextAuth 5 session management |
| Authorization | JWT validation, role guards, permission guards, active-enrollment checks |
| Database | Supabase PostgreSQL accessed through the Supabase SDK |
| Private files | Supabase Storage; PDF bytes are protected through the API/Next.js proxy flow |
| Course media | Supabase `course-media` storage for thumbnails and related public media |
| Video | VdoCipher OTP/DRM playback with provider watermarking and concurrent-session checks |
| Payments | Razorpay orders, signature verification, idempotent webhooks, and refunds |
| Email | The configured application mail provider through the API mail service |
| Client state | Server actions/server fetches, React Query, and Zustand where appropriate |

## Domain Modules

The API is organized under `apps/api/src/features/` by domain. Current domains include auth, users, permissions, categories, courses, chapters, lessons, videos, enrollments, payments, progress, assignments, tests, doubt sessions, notifications, student queries, analytics, health, and shared file/media services.

The web application is organized around public course discovery, authenticated student dashboard flows, admin management pages, server actions, and narrow API proxy routes for protected browser operations.

## Data and Access Rules

- All database access goes through the Supabase SDK. Do not add an ORM.
- Supabase RLS is the database defense layer; API guards are the application defense layer.
- Admin operations use the server-side Supabase client. Student operations must validate the authenticated user and active enrollment before returning protected course content.
- Students may access only their own enrollments, progress, payments, bookings, attempts, and notifications.
- Sub-admin access requires both an allowed role and the required permission slug where the route is permission-scoped.
- Private PDF storage paths and provider/API secrets must remain server-side. Browser PDF access uses the protected proxy flow.
- Video playback uses short-lived VdoCipher OTP data and a watermark; the provider player URL is necessarily visible to the browser.
- Payment webhooks must verify the Razorpay signature and remain idempotent.
- Sensitive operations should continue to use the existing audit logging patterns.

## Current Content Model

```text
category
  course
    chapter
      lesson: video | pdf | assignment | test
```

Assignments and tests have their own questions, options, attempts, answers, import, auto-grading, manual grading, and student review flows. Lesson progress is tracked per student and aggregated into course progress.

## Configuration

Limits, TTLs, upload sizes, and other adjustable values belong in the shared config package or validated environment configuration. Do not hardcode device limits, token lifetimes, upload limits, or UI sizing that is already configurable.

## UI Constraints

- Use the existing Tailwind/ShadCN patterns and shared components.
- Keep layouts usable from 320px through desktop widths.
- Avoid horizontal overflow; tables may use an explicit scroll boundary.
- Preserve mobile touch targets and existing loading, error, empty, and access-revoked states.
- Keep changes local to the owning feature rather than introducing cross-cutting abstractions without a concrete need.

## Documentation Precedence

1. Current source code and tests define runtime behavior.
2. `STATE.md` defines the only active implementation task.
3. `AGENTS.md` defines coding workflow and constraints.
4. `LMS_ROADMAP.md` contains future work only.
5. `API_AUDIT.md` and `SUPABASE_FEATURES.md` are reference/audit material and are not coding queues.