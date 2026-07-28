# Project State & Tracker

## Current Phase: Phase 1 — Foundation & Infrastructure

### Phase Overview

Set up Supabase, configure auth, establish NestJS module structure, wire up monorepo packages. This phase produces a working auth flow (register/login/device management) with proper security.

---

### Immediate Next Step

- [ ] Run migration SQL in Supabase Dashboard (SQL Editor → paste `packages/supabase/migrations/001_initial_schema.sql`)
- [ ] Configure Supabase Auth (email/password provider, email templates in Supabase Dashboard)
- [ ] Implement JWT auth guard using Supabase JWT verification (replace current custom JWT)

---

### Phase 1 Backlog (Infrastructure)

- [x] Remove TypeORM dependency, switch all DB access to Supabase SDK
- [x] Write Supabase migrations: full schema in `packages/supabase/migrations/001_initial_schema.sql`
- [ ] Configure Supabase Auth (email/password provider, email templates)
- [ ] Implement auth module in NestJS (register, login, logout, refresh, device check)
- [ ] Set up RLS policies for users and devices tables
- [ ] Integrate NextAuth 5 with Supabase Auth on web frontend
- [ ] Device limit enforcement (max 2 devices per user)
- [ ] Session monitoring and audit logging
- [ ] Configure Resend for transactional emails
- [ ] Set up environment variables and secrets management

### Phase 2 Backlog (Course Management)

- [ ] Supabase migrations: categories, courses, chapters, lessons, video_lessons, pdf_notes, assignments
- [ ] Course CRUD API (NestJS)
- [ ] Chapter/Lesson CRUD with ordering
- [ ] Vimeo integration (video upload, embed URL generation)
- [ ] PDF upload to Supabase Storage with access policies
- [ ] Assignment creation API
- [ ] Draft/publish workflow
- [ ] Admin course management UI
- [ ] Student course browsing UI (public)

### Phase 3 Backlog (Payments & Enrollment)

- [ ] Supabase migrations: payments, enrollments tables
- [ ] Razorpay integration (order creation, webhook verification, signature validation)
- [ ] Payment flow: browse → buy → pay → auto-enroll
- [ ] Invoice generation
- [ ] Payment history (student + admin views)
- [ ] Refund support (admin-initiated)
- [ ] Enrollment status management

### Phase 4 Backlog (Learning Experience)

- [ ] Video player with resume-from-position
- [ ] Dynamic watermark overlay (student identity on video)
- [ ] PDF viewer with download (enrolled students only)
- [ ] Progress tracking (video %, lesson completion, chapter completion, course %)
- [ ] Assignment submission and grading
- [ ] Student learning dashboard

### Phase 5 Backlog (Tests & Analytics)

- [ ] Supabase migrations: tests, questions, options, attempts, answers
- [ ] Test/quiz builder (admin)
- [ ] Test-taking UI (student) with timer
- [ ] Auto-grading MCQs
- [ ] Test analytics: score, accuracy, time per question, weak topics
- [ ] Historical performance tracking
- [ ] Improvement suggestions engine

### Phase 6 Backlog (Referrals & Doubt Sessions)

- [ ] Referral code generation and tracking
- [ ] Referral discount application at checkout
- [ ] Commission calculation and approval workflow
- [ ] Referral dashboard (student + admin)
- [ ] Doubt session slot management (admin)
- [ ] Booking system with conflict prevention
- [ ] Calendar UI for students
- [ ] Booking confirmations and reminders (email)

### Phase 7 Backlog (Admin Reports & Polish)

- [ ] Admin analytics dashboard (KPIs: revenue, users, enrollments, completions)
- [ ] Student performance reports
- [ ] Payment & revenue reports
- [ ] Referral analytics (top referrers, conversion rates)
- [ ] Engagement metrics (active users, time spent, popular courses)
- [ ] CSV/Excel export
- [ ] Sub-admin permission management UI
- [ ] Content security audit and hardening
- [ ] Performance optimization
- [ ] Production deployment (Vercel + Supabase)

---

### Completed Tasks

- [x] Initial monorepo setup (Turborepo + pnpm workspaces)
- [x] Next.js 15 web app with ShadCN UI, theming, font switching
- [x] NestJS 11 API with Fastify adapter
- [x] Shared packages (shadcn, eslint-config, ts-config, constants, utils)
- [x] Husky + commitlint + lint-staged configured
- [x] Defined project architecture (ARCHITECTURE.md)
- [x] Defined project plan (STATE.md)
- [x] Read and analyzed full Scope of Work document
- [x] Created `packages/supabase/` shared package (client, server, admin, middleware, types)

---

### Key Decisions Made

1. **NestJS kept as dedicated backend** — serves web + future mobile apps
2. **Supabase as database** — replaces TypeORM, provides Auth + Storage + RLS + Realtime
3. **Roles: Admin + Sub-admin + Student** — Sub-admin gets configurable granular permissions from admin
4. **Auth: Supabase Auth + NextAuth 5** — Supabase handles server-side auth/sessions, NextAuth manages frontend
5. **No instructor role** — Admin/sub-admin handles course content creation
