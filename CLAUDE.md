# Project Directives: Technical Pilot LMS
IMPORTANT NOTE: Save my tokens by not repharsing my wording or other things. Don't run and wait for build commands.
## Core Workflow Rules

1. **Never vibe code.** Before writing or modifying any code, read `ARCHITECTURE.md` to understand system design and `STATE.md` to know current task.
2. **Execute in isolation.** Only implement the exact task listed under "Immediate Next Step" in `STATE.md`, if something is extra-ordinery necessary then first tell me.
3. **Update state.** Once a task is complete and verified, update `STATE.md` to mark it complete and define the next step.

## Tech Stack

- **Monorepo:** Turborepo + pnpm workspaces
- **Frontend:** Next.js 15 (App Router, Turbopack) + TailwindCSS + ShadCN UI
- **Backend:** NestJS 11 + Fastify
- **Database:** Supabase (PostgreSQL 15+ with RLS)
- **Auth:** Supabase Auth + NextAuth 5 (frontend session management)
- **Video:** Vimeo Professional (DRM, secure streaming)
- **Payments:** Razorpay (webhooks, signature verification)
- **File Storage:** Supabase Storage (PDFs, thumbnails)
- **Email:** Resend (transactional)
- **State Management:** React Query (server) + Zustand (client)
- **Testing:** Vitest (web) + Jest (api)

## Workspace Structure

```
apps/
├── api/          — NestJS backend (serves web + mobile)
├── web/          — Next.js frontend (student + admin)
packages/
├── supabase/     — Shared Supabase client, types, migrations
├── shadcn/       — UI components (ShadCN + custom)
├── constants/    — Shared constants
├── utils/        — Shared utilities
├── eslint-config/
├── ts-config/
```

## Coding Standards

- Strict TypeScript everywhere. No `any`.
- Modular NestJS architecture: one module per domain feature.
- All DB access via Supabase SDK (not TypeORM). Service role for admin ops, anon key + JWT for student ops.
- Validate all inputs with Zod (frontend) and class-validator (NestJS DTOs).
- API responses follow consistent envelope: `{ data, error, meta }`.
- RLS policies enforce access at database level. Application guards as defense-in-depth.
- Never store secrets in code. Use environment variables via `@nestjs/config`.

## Security Rules

- Max 2 devices per student. Enforce on login.
- All content access (videos, PDFs) requires active enrollment verification.
- Razorpay webhook signatures MUST be verified server-side before processing.
- Audit log every sensitive action (login, payment, content access, admin changes).
- Supabase Storage policies restrict PDF downloads to enrolled students.
- Video player implements dynamic watermark (student email overlay).
- Session timeout on inactivity (configurable by admin).

## Environment

- **OS:** Arch Linux
- **IDE:** VS Code
- **Node:** >= 20
- **Package Manager:** pnpm 10.11.0
- **Deploy:** Vercel (web) + Railway/Render (api) + Supabase (db)
