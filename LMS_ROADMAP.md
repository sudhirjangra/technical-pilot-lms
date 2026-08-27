# LMS Feature Roadmap

> Complete picture: what's built, what's partial, what's missing.  
> Ordered by implementation priority. Each section lists API module + Web component status.

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented |
| 🔄 | Scaffold/shell exists — needs real logic or UI |
| ❌ | Not started — no files exist |
| 🔜 | Deferred by decision |

---

## 1. Authentication & Session Management

| Feature | API | Web | Status |
|---------|-----|-----|--------|
| Email/password sign-up + OTP email confirm | `auth.service.ts` | `sign-up`, `confirm-email` | ✅ |
| Sign-in + refresh token rotation | `auth.service.ts` | `sign-in.form.tsx` | ✅ |
| Forgot / reset / change password | `auth.service.ts` | all 3 pages | ✅ |
| Google OAuth | `auth.service.ts` | `sign-in.form.tsx`, `callback` | ✅ |
| Complete profile (post-OAuth) | `auth.service.ts` | `complete-profile` | ✅ |
| Sign-out single device | ✅ | ✅ | ✅ |
| Sign-out all devices | ✅ | `session-all-logout.tsx` | ✅ |
| Device session list | `users.service.ts` | `sessions-settings.tsx` | ✅ |
| Global session invalidation on ban/delete | `auth.service.ts` — 2 lines missing | — | ❌ |
| Admin/sub-admin MFA (TOTP) | — | `mfa/enroll`, `mfa/verify` pages missing | ❌ |
| Role injection into JWT claims (skip DB lookup) | SQL hook only — needs Supabase Pro | — | 🔜 |

---

## 2. User & Profile Management

| Feature | API | Web | Status |
|---------|-----|-----|--------|
| Roles: admin, sub_admin, student | `role.ts` constants | middleware guards | ✅ |
| Sub-admin configurable permissions | `permissions.service.ts` | `sub-admins-client.tsx` | ✅ |
| Profile — name, bio, avatar upload | `users.service.ts` | `profile-avatar-editor.tsx` | ✅ |
| Appearance settings (theme) | — | `appearance-settings.tsx` | ✅ |
| Delete account | `auth.service.ts` | `delete-account-card.tsx` | ✅ |
| Student list + search (admin) | `users.service.ts` | `students-client.tsx` | 🔄 no search |
| Admin user stats (total, active, new this month) | — | `admin/page.tsx` shell | ❌ |

---

## 3. Course Management

| Feature | API | Web | Status |
|---------|-----|-----|--------|
| Create / update / delete course | `courses.service.ts` | `courses-client.tsx` | ✅ |
| Course status: draft → published → archived | `courses.service.ts` | ✅ | ✅ |
| Course slug (SEO) | ✅ | ✅ | ✅ |
| Course thumbnail URL (plain string) | ✅ | ✅ | 🔄 no upload UI |
| Course thumbnail upload via Supabase Storage | — | — | ❌ |
| Chapter CRUD + sort order | `chapters.service.ts` | `course-detail-client.tsx` | ✅ |
| Lesson CRUD + sort order | `lessons.service.ts` | `course-detail-client.tsx` | ✅ |
| Lesson types: video, pdf, text | `lessons.service.ts` | ✅ | ✅ |
| Course categories | `categories.service.ts` | `categories-client.tsx` | ✅ |
| Category thumbnail upload | — | — | ❌ |
| Course price + discount price | `courses.service.ts` | ✅ | ✅ |
| Free course enrollment (price = 0, no payment) | — | — | ❌ |
| Course prerequisites (block enroll until X done) | — | — | ❌ |
| Course tags / difficulty level | — | — | ❌ |
| Bulk publish/archive courses (admin) | — | — | ❌ |

---

## 4. Content Delivery

| Feature | API | Web | Status |
|---------|-----|-----|--------|
| Video lessons via VdoCipher OTP | `videos.service.ts` | `video-player.tsx` | ✅ |
| Concurrent session limit (max 2) | `videos.service.ts` | ✅ | ✅ |
| Watermarked video (student email overlay) | `videos.service.ts` | ✅ | ✅ |
| PDF notes — upload + serve | `file.service.ts` (local disk) | ✅ | 🔄 local disk only — no CDN |
| PDF notes — Supabase Storage (private, signed URL) | `file.service.ts` needs rewrite | — | ❌ |
| Text/markdown lesson content | schema supports it | no render UI | 🔄 |
| Lesson PDF viewer in browser | — | — | ❌ |
| Download PDF toggle (allow/disallow per lesson) | — | — | ❌ |
| Student bookmark a lesson | — | — | ❌ |
| Student notes per lesson (private notepad) | — | — | ❌ |

---

## 5. Enrollment & Payments

| Feature | API | Web | Status |
|---------|-----|-----|--------|
| Razorpay order create + HMAC verify | `payments.service.ts` | `course-view-client.tsx` | ✅ |
| Enrollment on payment success | `payments.service.ts` | ✅ | ✅ |
| Payment history (admin + student) | `payments.service.ts` | `payments-client.tsx` | ✅ |
| Refund flow (Razorpay) | `payments.service.ts` | `payments-client.tsx` | ✅ |
| Enrollment list (admin) | `enrollments.service.ts` | `enrollments-client.tsx` | ✅ |
| Manual enrollment by admin | `enrollments.service.ts` | ❌ no UI | 🔄 |
| Enrollment expiry (`expires_at`) | schema missing column | — | ❌ |
| pg_cron auto-expire enrollments | SQL only | — | ❌ |
| Free course self-enroll (no payment) | — | — | ❌ |
| Coupon / promo codes | — | — | ❌ |
| Payment confirmation email (async) | mail templates exist but sync | — | ❌ |
| Invoice / receipt download (PDF) | — | — | ❌ |

---

## 6. Progress Tracking

| Feature | API | Web | Status |
|---------|-----|-----|--------|
| Per-lesson progress (not_started / in_progress / completed) | `progress.service.ts` | `course-progress-client.tsx` | ✅ |
| Video resume position (`last_position_seconds`) | `progress.service.ts` | `video-player.tsx` | ✅ |
| Course overall % calculation | `progress.service.ts` | ✅ | ✅ |
| Admin view student progress | `progress.service.ts` | no dedicated UI | 🔄 |
| Progress reset by admin | — | — | ❌ |
| Completion status per chapter | schema/API ready | UI shows per-lesson only | 🔄 |

---

## 7. Assessments

### 7A. Assignments
> No files exist at all.

| Feature | API | Web | Status |
|---------|-----|-----|--------|
| `assignments` table + CRUD | new module needed | — | ❌ |
| `assignment_submissions` table | new migration | — | ❌ |
| Admin — create assignment per lesson | — | — | ❌ |
| Student — upload submission (PDF/image) | — | — | ❌ |
| Submission stored in Supabase Storage | — | — | ❌ |
| Admin — view submission (signed URL) | — | — | ❌ |
| Admin — grade: score + written feedback | — | — | ❌ |
| Student — view grade + feedback | — | — | ❌ |
| Re-submit (upsert, replace previous) | — | — | ❌ |
| Realtime: student notified when graded | — | — | ❌ |
| Assignment due dates + late submission flag | — | — | ❌ |

### 7B. Quizzes
> Not in scope document — evaluate for Phase 2.

| Feature | Status |
|---------|--------|
| Quiz CRUD (admin creates MCQ/true-false) | ❌ |
| Student takes quiz, auto-graded | ❌ |
| Quiz attempt history + score | ❌ |
| Pass/fail gate before next lesson | ❌ |

---

## 8. Certificates

| Feature | API | Web | Status |
|---------|-----|-----|--------|
| `certificates` table | — | — | ❌ |
| DB trigger — auto-issue on 100% completion | SQL function ready in SUPABASE_FEATURES.md | — | ❌ |
| Certificate number (unique, human-readable) | — | — | ❌ |
| Student — view certificate | — | `dashboard/certificates/` missing | ❌ |
| Certificate PDF generation + download | new module needed | — | ❌ |
| Public verification URL (`/verify/CERT-XXXXXXXX`) | — | — | ❌ |

---

## 9. Doubt Sessions

| Feature | API | Web | Status |
|---------|-----|-----|--------|
| Admin creates time slots | `doubt-sessions.service.ts` | `doubt-slots-client.tsx` | ✅ |
| Student books slot | `doubt-sessions.service.ts` | `doubt-client.tsx` | ✅ |
| Booking capacity limit | `doubt-sessions.service.ts` | ✅ | ✅ |
| Admin sets meeting link on booking | `doubt-sessions.service.ts` | ✅ | ✅ |
| Realtime slot availability (no refresh needed) | — | `doubt-client.tsx` not wired | ❌ |
| Realtime meeting link delivery to student | — | booking page not wired | ❌ |
| pg_cron auto-cancel past slots (daily) | SQL only | — | ❌ |
| Booking cancellation by student | — | — | ❌ |
| Booking cancellation by admin + notification | — | — | ❌ |
| Calendar view for admin slot management | — | — | ❌ |

---

## 10. Notifications

| Feature | API | Web | Status |
|---------|-----|-----|--------|
| Auth emails (register, confirm, reset, sign-in) | `mail.service.ts` (Nodemailer) | — | ✅ |
| Email provider: **Resend** (per scope) | still Nodemailer | — | ❌ |
| Enrollment confirmation email | sync in payment verify | — | 🔄 blocking |
| New lesson published → enrolled students toast | — | — | ❌ |
| Assignment graded → student toast | — | — | ❌ |
| In-app notification center (bell icon + list) | — | — | ❌ |
| Email: meeting link set for booking | — | — | ❌ |
| Email: certificate issued | — | — | ❌ |

---

## 11. File Storage

| Feature | API | Web | Status |
|---------|-----|-----|--------|
| PDF notes upload | local disk `apps/api/storage/` | ✅ | 🔄 lost on redeploy |
| Assignment submissions upload | — | — | ❌ |
| Course/category thumbnails | URL string only | no upload UI | 🔄 |
| Supabase Storage: `pdf-notes` (private) | `file.service.ts` rewrite needed | — | ❌ |
| Supabase Storage: `assignment-submissions` (private) | — | — | ❌ |
| Supabase Storage: `thumbnails` (public CDN) | — | — | ❌ |
| RLS on `pdf-notes` (enrolled students only) | — | — | ❌ |
| Signed URL generation (1hr expiry) | — | — | ❌ |
| PDF page count auto-extract (Edge Function) | — | — | 🔜 |

---

## 12. Admin Dashboard & Analytics

| Feature | API | Web | Status |
|---------|-----|-----|--------|
| Dashboard shell + sidebar | — | `admin/page.tsx` | 🔄 shell only |
| Total students / enrollments / revenue KPIs | — | — | ❌ |
| Revenue chart (monthly, by course) | — | — | ❌ |
| Enrollment trend chart | — | — | ❌ |
| Top courses by enrollment | — | — | ❌ |
| Recent payments table | `payments.service.ts` | `payments-client.tsx` | ✅ |
| Student progress overview (admin) | partial | no dedicated UI | 🔄 |
| Realtime enrollment + payment counter (live) | — | not wired | ❌ |
| Export data (CSV — enrollments, payments) | — | — | ❌ |
| Audit log (who changed what) | `audit-log.interceptor.ts` | no UI | 🔄 |

---

## 13. Student Dashboard

| Feature | API | Web | Status |
|---------|-----|-----|--------|
| Dashboard shell + sidebar | — | `dashboard/page.tsx` | 🔄 shell |
| My enrolled courses list | `enrollments.service.ts` | `my-cources-client.tsx` | ✅ |
| Course progress card | `progress.service.ts` | `course-progress-client.tsx` | ✅ |
| Continue watching (resume lesson) | ✅ | needs UI link | 🔄 |
| Video lesson page + player | `videos.service.ts` | `lessons/[lessonId]/page.tsx` | ✅ |
| PDF lesson viewer | — | no PDF render | ❌ |
| Course completion % display | ✅ | ✅ | ✅ |
| Certificates page | — | — | ❌ |
| Assignments page (submit + view grades) | — | — | ❌ |
| Doubt sessions page | ✅ | `doubt-client.tsx` | ✅ |
| Student stats (total hours, courses completed) | — | — | ❌ |

---

## 14. Course Discovery (Public)

| Feature | API | Web | Status |
|---------|-----|-----|--------|
| Public course catalog | `courses.service.ts` findPublished | `courses/page.tsx` | ✅ |
| Course detail page (slug) | `courses.service.ts` findBySlug | `courses/[slug]/page.tsx` | ✅ |
| Filter by category | ✅ | `browse-client.tsx` | ✅ |
| Search courses by keyword | — | — | ❌ |
| Sort by price / newest / popular | — | partial | 🔄 |
| Course preview (free lessons visible to public) | — | — | ❌ |
| Course reviews + star rating | — | — | ❌ |
| Related / recommended courses | — | — | 🔜 |

---

## 15. Security & Ops

| Feature | API | Web | Status |
|---------|-----|-----|--------|
| JWT auth guard | `jwt-auth.guard.ts` | middleware | ✅ |
| Role guard | `roles.guard.ts` | ✅ | ✅ |
| Permission guard (sub-admin) | `permission.guard.ts` | ✅ | ✅ |
| Rate limiting | `throttle.module.ts` | — | ✅ |
| Enrollment guard (student access gate) | `enrollment.guard.ts` | — | ✅ |
| Request logging + audit trail | `audit-log.interceptor.ts` | — | ✅ |
| Global session invalidation on ban | 2 lines missing | — | ❌ |
| Admin MFA (TOTP) | — | — | ❌ |
| RLS on storage buckets | — | — | ❌ |
| RLS on progress / payments / lessons tables | SQL missing | — | ❌ |
| pg_cron: clean expired video sessions | SQL only | — | ❌ |
| Razorpay webhook at Edge (independent of NestJS uptime) | — | — | 🔜 |
| VdoCipher OTP via Edge Function (hide API key) | — | — | 🔜 |
| Supabase built-in monitoring | dashboard | — | ❌ (enable now, 5 min) |

---

## Implementation Order

```
SPRINT 1 — Stop the bleeding (1 week)
  ├── Security: global session invalidation (30 min, 2 lines)
  ├── Ops: enable Supabase monitoring (5 min, dashboard)
  ├── Ops: pg_cron cleanup jobs — video_sessions + doubt_slots (1 hr, SQL)
  └── Storage: migrate file.service.ts → Supabase Storage (1-2 days)
      ├── buckets: pdf-notes, assignment-submissions, thumbnails
      ├── RLS on pdf-notes
      └── thumbnail upload UI in admin forms

SPRINT 2 — Core missing features (2 weeks)
  ├── Assignments module — backend (2 days)
  │   ├── DB migration: assignments + assignment_submissions tables
  │   ├── NestJS assignments module (CRUD + file upload to Storage)
  │   └── Admin: grade endpoint (score + feedback)
  ├── Assignments UI (1 day)
  │   ├── Admin: view submission + grade form
  │   └── Student: submit file + view grade/feedback
  ├── Enrollment expiry — add expires_at column + pg_cron (half day)
  └── Free course self-enroll (no Razorpay flow) (half day)

SPRINT 3 — Certificates + Notifications (1.5 weeks)
  ├── Certificates (1 day)
  │   ├── DB migration: certificates table
  │   ├── DB trigger: auto-issue on 100% completion
  │   ├── Certificate PDF generation (NestJS module)
  │   ├── Student certificates page
  │   └── Public verify URL (/verify/CERT-XXXXXXXX)
  ├── Email: switch Nodemailer → Resend (half day)
  ├── Email: enrollment confirm + certificate issued templates
  └── Realtime subscriptions wired (1 day)
      ├── Doubt slot availability
      ├── Meeting link delivery
      └── Assignment graded notification

SPRINT 4 — Admin Dashboard + Analytics (1 week)
  ├── KPI cards: total students, revenue, enrollments, completions
  ├── Revenue chart (monthly)
  ├── Top courses by enrollment
  ├── Realtime enrollment/payment live counter
  └── Student progress overview table (admin)

SPRINT 5 — Discovery + UX gaps (1 week)
  ├── Search (pg full-text on courses + lessons)
  ├── Course preview (free lessons public)
  ├── PDF viewer in lesson page
  ├── Student: continue watching widget (resume)
  ├── Student: stats (hours watched, completed)
  └── Admin: manual enrollment UI

SPRINT 6 — Polish + Ops (ongoing)
  ├── Course reviews + star rating
  ├── In-app notification center
  ├── Coupon / promo codes
  ├── RLS hardening (progress, payments, lessons)
  ├── Edge Functions: Razorpay webhook + VdoCipher OTP proxy
  ├── MFA for admin accounts
  └── CSV export (enrollments, payments)

DEFERRED (Phase 2)
  ├── Quizzes / MCQ assessments
  ├── Course prerequisites
  ├── Discussion forum / lesson comments
  ├── pgvector recommendations
  ├── JWT role claims hook (Supabase Pro required)
  ├── Mobile apps
  ├── AI Doubt Solver
  └── Live classes
```

---

## Quick Wins (Do Before Next Feature)

These are small but currently broken/missing:

1. **Global session invalidation** — 2 lines in `auth.service.ts` + `permissions.service.ts`. Gap is live.
2. **Enable Supabase monitoring** — 5 min in dashboard. Free observability.
3. **pg_cron: video session cleanup** — stale rows block new playback (`video_sessions` table grows forever).
4. **Free course enrollment** — no payment path exists. Any free course = unenrollable right now.
5. **Manual enrollment UI** — API exists (`enrollments.service.ts`), admin has no button to enroll a student.

---

> See `SUPABASE_FEATURES.md` for Supabase-specific implementation details (SQL, edge function code, RLS policies).
