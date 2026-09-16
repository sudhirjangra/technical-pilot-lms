# Technical Pilot LMS — NestJS API (`apps/api`)

The backend API for the Technical Pilot Learning Management System, built with **NestJS**, **Fastify**, **Supabase (PostgreSQL / Auth / Storage)**, and **MongoDB (Assessment Attempt Snapshots)**.

---

## 1. Tech Stack

- **Framework**: [NestJS 11](https://nestjs.com/) with Fastify HTTP adapter (`@nestjs/platform-fastify`)
- **Primary Database & Auth**: Supabase PostgreSQL SDK + Supabase Auth (`@supabase/supabase-js`)
- **Assessment History Store**: MongoDB native driver (`mongodb`) with indexed attempt snapshot documents
- **Validation**: `class-validator` + `class-transformer`
- **Security & Rate Limiting**: `@nestjs/throttler`, `@fastify/helmet`, `@fastify/cors`, JWT authentication
- **DRM Video Delivery**: VdoCipher OTP & Dynamic Watermarking API
- **Payments**: Razorpay Node SDK (Order creation, signature verification, webhook processing)
- **Transactional Mail**: Nodemailer SMTP delivery with responsive HTML email templates
- **Documentation**: OpenAPI / Swagger UI at `/api-docs`

---

## 2. Architecture & Modules

The API features are organized by domain under `src/features/`:

```text
src/
├── app.module.ts              # Root application module
├── bootstrap.ts               # Fastify setup, multipart handling, helmet, global validation pipes
├── swagger.ts                 # Swagger / OpenAPI documentation configuration
├── common/
│   ├── decorators/            # @Public(), @Roles(), @Permissions(), @User(), @Ip()
│   ├── guards/                # JwtAuthGuard, RolesGuard, PermissionGuard, CourseAccessGuard
│   ├── interceptors/          # Response formatting & error transformation
│   ├── modules/               # MongoModule & MongoService (MongoDB connection pool & snapshots)
│   ├── services/              # AttemptMigrationService (Supabase to MongoDB migration)
│   └── utils/                 # Question parser (Excel/CSV/JSON), token helpers
└── features/
    ├── analytics/             # Platform KPIs, course analytics, weak-point detection
    ├── assignments/           # Assignment CRUD, flexible questions, MongoDB attempt snapshots
    ├── auth/                  # Supabase Auth, device limit enforcement, Google sign-in
    ├── categories/            # Course categories and taxonomy
    ├── chapters/              # Course chapter management and ordering
    ├── courses/               # Course catalog, publishing, leaderboards, media
    ├── doubt-sessions/        # Targeted doubt slots (all/course/student), meeting links
    ├── enrollments/           # Course enrollments and access checks
    ├── file/                  # Storage abstractions for Supabase Storage buckets
    ├── health/                # Terminus probes (/health, /health/db, /health/memory, /health/disk)
    ├── lessons/               # Polymorphic lesson engine (video, pdf, assignment, test)
    ├── mail/                  # SMTP transactional notifications and email templates
    ├── notifications/         # Student and admin in-app notification dispatch
    ├── payments/              # Razorpay checkout, signature verification, webhooks (no refunds)
    ├── permissions/           # Sub-admin RBAC with 30+ granular permission slugs
    ├── progress/              # Lesson completion tracking and progress aggregation
    ├── referrals/             # Unique TP codes, friend coupons, wallet points, payout requests
    ├── student-queries/       # Public guest contact form, support tickets, extra attempt grants
    ├── tests/                 # Timed MCQ/MSQ/Text assessments, scoring, MongoDB snapshots
    ├── users/                 # Profile management, avatars, sub-admin management
    └── videos/                # VdoCipher OTP, watermark config, direct poster upload
```

---

## 3. Environment Variables

Create `.env` inside `apps/api/` with the following variables:

```ini
PORT=8000
NODE_ENV=development
API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Supabase
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_ANON_KEY=your-supabase-anon-key

# MongoDB (Attempt Snapshots)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/technical_pilot_lms

# VdoCipher
VDOCIPHER_API_SECRET_KEY=your-vdocipher-secret-key

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-razorpay-webhook-secret

# SMTP Mail Server
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.com
SMTP_PASS=your-smtp-password
SMTP_FROM="Technical Pilot <no-reply@technicalpilot.com>"
```

---

## 4. Running the API

```shell
# Install dependencies from root
pnpm install

# Start in development mode with watch
pnpm --filter api dev

# Typecheck
pnpm --filter api exec tsc --noEmit

# Run Unit Tests
pnpm --filter api test
```

---

## 5. API Documentation

When the API is running, browse to:
```
http://localhost:8000/api-docs
```
for interactive Swagger UI documentation and OpenAPI specifications.
