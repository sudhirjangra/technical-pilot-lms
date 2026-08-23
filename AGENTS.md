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
├── config/       — Shared configuration (device limits, timeouts, UI sizing)
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

## Configuration Principles

- **No hardcoded values** for limits, timeouts, or UI sizing that may need adjustment.
- All configurable values live in `@repo/config` (packages/config) with Zod-validated schema.
- Environment variables override defaults (e.g., `MAX_DEVICES_PER_USER=3`).
- Frontend and backend share the same config package for consistency.
- Changing a limit (device count, session timeout, token expiry) requires only updating `.env` or the config defaults — no code changes.

## Responsive UI Principles

- **Mobile-first, professional responsive design** for all screens (320px–1920px+).
- Use Tailwind responsive prefixes: base (mobile), `sm:` (≥640px), `md:` (≥768px), `lg:` (≥1024px), `xl:` (≥1280px).
- Compact spacing, smaller text, and touch-friendly targets on mobile; relaxed spacing and larger elements on desktop.
- Cards/forms: `max-w-xs` → `sm:max-w-sm` → `md:max-w-md` → `lg:max-w-lg` for progressive width.
- Interactive elements minimum 44×44px touch target on mobile.
- Avoid horizontal scrolling; use `w-full`, `max-w-full`, `overflow-x-auto` where needed.
- Test at 320px, 375px, 768px, 1024px, 1440px breakpoints minimum.

## Environment

- **OS:** Arch Linux
- **IDE:** VS Code
- **Node:** >= 20
- **Package Manager:** pnpm 10.11.0
- **Deploy:** Vercel (web) + Railway/Render (api) + Supabase (db)
