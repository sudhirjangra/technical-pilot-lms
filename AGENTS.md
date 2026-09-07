# Project Directives: Technical Pilot LMS

This file is the execution contract for coding agents in this repository.

## Before Coding

1. Read `ARCHITECTURE.md` for current system boundaries.
2. Read `STATE.md` and work only on `Immediate Next Step`.
3. Inspect the owning code path and a focused test or validation command before editing.
4. Do not reopen items listed under `Completed Baseline` unless the user explicitly asks for a regression fix.

## Execution Rules

- Implement only the current `Immediate Next Step`.
- Keep each session small enough to finish, test, and document in one pass.
- Do not implement roadmap items, audit recommendations, or speculative refactors unless they are promoted into `STATE.md`.
- Do not run long-lived or build-and-wait commands. Prefer focused typechecks, tests, lint, or targeted scripts.
- Preserve unrelated user changes in the worktree.
- Do not commit or create branches unless explicitly requested.
- After a successful implementation, update `STATE.md`: check off the task and promote exactly one next task.

## Current Stack

- Monorepo: Turborepo + pnpm workspaces
- Web: Next.js App Router, TypeScript, Tailwind CSS, ShadCN UI
- API: NestJS + Fastify, TypeScript
- Data/Auth/Storage: Supabase PostgreSQL, Auth, RLS, and Storage
- Session management: NextAuth 5 plus backend device/session tracking
- Video: VdoCipher DRM and OTP playback
- Payments: Razorpay with server-side signature and webhook verification
- State: server actions/server fetches with React Query and Zustand where needed
- Tests: Vitest for web and Jest for API

## Non-Negotiable Constraints

- Strict TypeScript; do not add `any`.
- Use Supabase SDK for database access; do not introduce an ORM.
- Validate NestJS inputs with `class-validator` and frontend inputs with the existing Zod patterns.
- Keep API authorization in guards/decorators and enforce active enrollment for student content.
- Keep secrets in environment variables.
- Preserve the response and error conventions already used by the owning module.
- Keep UI mobile-first from 320px through desktop widths; avoid horizontal overflow and keep touch targets usable.
- Never expose private PDF storage paths, signed URLs, access tokens, or provider secrets unnecessarily to the browser.

## Document Precedence

`STATE.md` is the only execution queue. `LMS_ROADMAP.md` may contain detailed user requirements and acceptance criteria, but agents must execute only the single task promoted under `STATE.md`.

`API_AUDIT.md` and `SUPABASE_FEATURES.md` are reference material only. They do not override `STATE.md` and must not be treated as task queues. Historical details in other documents are subordinate to the current code and `STATE.md`.