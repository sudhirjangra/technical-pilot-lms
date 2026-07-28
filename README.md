# Institution LMS Portal

A comprehensive Learning Management System for institutional use. Students purchase courses, learn through videos, notes, assignments and tests, track progress, book doubt sessions, and earn referral rewards. Admins manage all content, users, payments, and analytics.

## Features

### Student Experience

- Secure registration with max 2 device limit and session monitoring
- Personal dashboard — enrolled courses, progress, payment history, upcoming doubt sessions, pending assignments
- Watch lecture videos with resume-from-position
- Download PDF notes (enrolled students only)
- Complete assignments and take chapter-wise tests
- Post-test analytics: score, accuracy, time per question, weak topics, improvement suggestions
- Book doubt session slots via calendar view
- Referral system — unique code/link, earn commissions, track rewards

### Admin & Sub-admin

- Full course builder: chapters, video lessons, PDF notes, assignments, MCQ tests
- Draft/publish workflow
- Student management: enrollment, progress monitoring, device management
- Doubt session slot creation and booking management
- Referral configuration: discount %, commission %, reward approvals
- Reports & analytics: performance, completion rates, revenue, referral conversions
- Configurable sub-admin permissions

### Security

- DRM-protected video streaming via Vimeo (no download enforcement)
- Dynamic watermark (student email/name overlay on video player)
- PDF access restricted to enrolled students via Supabase Storage policies
- Audit logs for all sensitive actions
- Session timeout on inactivity
- Razorpay webhook signature verification

## Tech Stack

| Layer        | Technology                                  |
| ------------ | ------------------------------------------- |
| Frontend     | Next.js 15 (App Router, Turbopack)          |
| UI           | TailwindCSS v4 + ShadCN UI + Aceternity     |
| Backend      | NestJS 11 + Fastify                         |
| Database     | Supabase (PostgreSQL 15+ with RLS)          |
| Auth         | Supabase Auth + NextAuth 5                  |
| Video        | Vimeo Professional (DRM, secure streaming)  |
| Payments     | Razorpay (webhooks, signature verification) |
| File Storage | Supabase Storage                            |
| Email        | Resend                                      |
| State        | React Query + Zustand                       |
| Charts       | Recharts                                    |
| Scheduling   | React Big Calendar + pg_cron                |
| Monorepo     | Turborepo + pnpm workspaces                 |

## Project Structure

```
apps/
├── api/          — NestJS backend (serves web + future mobile)
└── web/          — Next.js frontend (student + admin)
packages/
├── supabase/     — Shared Supabase client, types, migrations
├── shadcn/       — UI component library (ShadCN + custom)
├── constants/    — Shared constants
├── utils/        — Shared utilities
├── eslint-config/
└── ts-config/
```

## Setup

**Requirements:** Node >= 20, pnpm 10+

```shell
pnpm install
```

Copy environment files:

```shell
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Start development:

```shell
pnpm dev
```

## Scripts

| Command        | Description                        |
| -------------- | ---------------------------------- |
| `pnpm dev`     | Start both api and web in dev mode |
| `pnpm dev:api` | Start api only                     |
| `pnpm dev:web` | Start web only                     |
| `pnpm build`   | Production build (both apps)       |
| `pnpm lint`    | Lint all workspaces                |
| `pnpm format`  | Format with Prettier               |
| `pnpm test`    | Run all tests                      |
| `pnpm add:api` | Add package to api workspace       |
| `pnpm add:web` | Add package to web workspace       |

## Third-Party Services

The following services are required and procured separately by the client:

| Service            | Purpose                           |
| ------------------ | --------------------------------- |
| Supabase Pro       | Database, Auth, Storage, Realtime |
| Vimeo Professional | Video hosting with DRM (5TB)      |
| Razorpay           | Payment gateway                   |
| Resend             | Transactional email               |
| Vercel Pro         | Frontend hosting                  |

## Future Enhancements (Phase 2)

- Mobile apps (iOS & Android) — React Native
- AI Doubt Solver
- Parent Dashboard
- Live Classes (Zoom/Google Meet integration)
- Advanced server-side video watermarking

## License

MIT
