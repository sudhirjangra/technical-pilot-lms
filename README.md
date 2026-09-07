# Technical Pilot LMS

Learning management portal for course delivery, protected video/PDF content, assessments, progress tracking, payments, doubt sessions, notifications, and admin operations.

## Current Stack

| Layer | Technology |
| --- | --- |
| Web | Next.js App Router + TypeScript + Tailwind CSS + ShadCN UI |
| API | NestJS + Fastify + TypeScript |
| Database/Auth/Storage | Supabase PostgreSQL, Auth, RLS, and Storage |
| Sessions | NextAuth 5 plus backend device/session tracking |
| Video | VdoCipher DRM and OTP playback |
| Payments | Razorpay |
| State | Server actions/server fetches, React Query, and Zustand where needed |
| Tests | Vitest (web) and Jest (API) |
| Monorepo | Turborepo + pnpm workspaces |

## Features

- Student and admin authentication with email confirmation, Google sign-in, password recovery, device limits, and session management.
- Course and category management with chapters, lessons, VdoCipher videos, protected PDFs, thumbnails, publishing, and progress tracking.
- Assignments and tests with MCQ/MSQ/text questions, imports, attempts, auto-grading, manual grading, and review history.
- Razorpay orders, signature verification, idempotent webhooks, enrollment activation, payment history, and refunds.
- Student enrollments, doubt-session booking, in-app notifications, admin analytics, sub-admin permissions, and access-revoked handling.

## Repository Layout

```text
apps/api/       NestJS backend
apps/web/       Next.js frontend
packages/       Shared config, Supabase, UI, constants, utilities, and TypeScript config
```

## Setup

Requirements: Node 20 or newer and pnpm 11.

```shell
pnpm install
pnpm dev
```

Copy the environment examples into `apps/api/.env` and `apps/web/.env` before starting the applications. Required third-party credentials include Supabase, VdoCipher, Razorpay, and the configured mail provider.

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