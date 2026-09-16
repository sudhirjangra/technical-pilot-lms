# Technical Pilot LMS

Learning management portal for course delivery, protected video/PDF content, assessments, progress tracking, payments, referrals, doubt sessions, notifications, and admin operations.

## Current Stack

| Layer | Technology |
| --- | --- |
| Web | Next.js App Router + TypeScript + Tailwind CSS + ShadCN UI |
| API | NestJS + Fastify + TypeScript |
| Database / Auth / Storage | Supabase PostgreSQL, Auth, RLS, and Storage |
| Attempt History Store | MongoDB (immutable, self-contained attempt snapshots) |
| Sessions | NextAuth 5 plus backend device/session tracking |
| Video | VdoCipher DRM and OTP playback with custom thumbnail uploads |
| Payments | Razorpay (order creation, signature verification, webhooks; zero refund/deductions) |
| Email | Nodemailer SMTP transactional email delivery |
| State | Server actions/server fetches, React Query, and Zustand where needed |
| Tests | Vitest (web) and Jest (API) |
| Monorepo | Turborepo + pnpm workspaces |

## Features

- **Authentication & Security**: Student and admin auth with email confirmation, Google sign-in, password recovery, device limits (max 2 devices), session management, and streamlined signup (DOB completely removed).
- **Role-Based Access Control**: Super-admin console with 30+ granular permission slugs for customizable sub-admin roles.
- **Course & Content Management**: Course hierarchy (Category → Course → Chapter → Lesson) supporting Videos (VdoCipher DRM + direct poster upload), protected PDF viewer, Assignments, and Tests.
- **Assessments & Analytics**: MCQ/MSQ/Text questions with flexible 2-4 options, question categorization (reasoning, calculation, numerical, conceptual, other) and difficulty levels (easy, medium, hard). MongoDB-backed attempt history with zero manual grading dependency.
- **Referral & Wallet Reward System**: Unique `TP...` referral code per student, friend discount coupons, referrer wallet rewards on course purchases, and manual cash conversion payout ledger.
- **Communications & Doubt Sessions**: Course-targeted doubt sessions (`all`, `course`, `student`), automated in-app notifications, student booking, and unified admin communications.
- **Public Support**: Guest Contact Us form (`/contact`) and student query ticketing system with extra attempt grant requests.
- **Payments & Safeguards**: Razorpay checkout integration with server-side signature verification and idempotent webhooks. Direct refund and money-deduction functions completely removed for safety.
- **Transactional Emails**: Automated notifications for purchases, course launches, course archiving, password changes, and login security.

## Repository Layout

```text
apps/api/       NestJS backend API
apps/web/       Next.js frontend web app
packages/       Shared config, Supabase schemas/client, UI components, constants, utilities, and TypeScript configs
```

## Setup

Requirements: Node 20 or newer and pnpm 11.

```shell
pnpm install
pnpm dev
```

Copy the environment examples into `apps/api/.env` and `apps/web/.env` before starting the applications:
- Supabase (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- MongoDB (`MONGODB_URI`)
- VdoCipher (`VDOCIPHER_API_SECRET_KEY`)
- Razorpay (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`)
- Mail / SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`)

## Useful Commands

```shell
pnpm dev
pnpm --filter api exec tsc --noEmit
pnpm --filter web exec tsc --noEmit
pnpm test
pnpm lint
```

## Development Guidance

Read `AGENTS.md`, `ARCHITECTURE.md`, and `STATE.md` before coding. `STATE.md` contains the only active implementation task. `API_AUDIT.md` and `SUPABASE_FEATURES.md` are reference documents, not execution queues.