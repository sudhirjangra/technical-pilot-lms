# Supabase Features Roadmap — Technical Pilot LMS

> Current state: Supabase used only for Auth + PostgreSQL + RLS. Realtime, Storage, Edge Functions, pg_cron, pgvector all unused.

---

## Status Summary

| # | Feature | Status |
|---|---------|--------|
| 1 | Storage — Replace Local Filesystem | ✅ Accepted |
| 2 | Storage — Course & Category Thumbnails | ✅ Accepted |
| 3 | Storage — Assignment Submission Viewer | ✅ Accepted |
| 4 | Auth — TOTP MFA | ✅ Accepted |
| 5 | Realtime — Doubt Session Live Booking | ✅ Accepted |
| 6 | Realtime — Admin Live Dashboard Stats | ✅ Accepted |
| 7 | Realtime — New Lesson Published Notification | ✅ Accepted |
| 8 | Realtime — Meeting Link Delivery | ✅ Accepted |
| 9 | Realtime — Assignment Feedback Notification | ✅ Accepted |
| 10 | PostgreSQL Full-Text Search | 🔜 Later |
| 11 | pg_cron — Auto-Clean Expired Video Sessions | ❓ Needs clarification |
| 12 | pg_cron — Auto-Cancel Past Doubt Slots | ✅ Accepted |
| 13 | pg_cron — Enrollment Auto-Expiry | ✅ Accepted |
| 14 | Database Webhooks — Payment Confirmation Email | ✅ Accepted |
| 15 | pgvector — Course Recommendations | 🔜 Later |
| 16 | Database Trigger — Auto Certificate on Completion | ✅ Accepted |
| 17 | Edge Function — Razorpay Webhook Handler | ✅ Accepted |
| 18 | Edge Function — VdoCipher OTP Proxy | ✅ Accepted |
| 19 | Edge Function — PDF Page Count on Upload | ✅ Accepted |
| 20 | Auth Admin — Global Session Invalidation | ✅ Accepted |
| 21 | RLS Enhancement — Direct Client Safety | ✅ Accepted |
| 22 | Auth Hook — Inject Role into JWT Claims | ✅ Accepted |
| 23 | Built-in Monitoring | ✅ Accepted |

---

## Priority Legend
- 🔴 **High** — fixes a real gap or replaces a fragile current approach
- 🟡 **Medium** — significant UX/ops improvement
- 🟢 **Low** — nice-to-have, implement after stable core

---

## 1. Supabase Storage — Replace Local Filesystem
**Priority:** 🔴 High  
**Replaces:** `FileService` (local disk at `apps/api/storage/`)

### Problem
PDF notes, assignment submissions stored on local disk. If server restarts or redeploys, files are gone. No CDN, no access control, no presigned URLs.

### What to do
Create 3 private Storage buckets:
- `pdf-notes` — lesson PDFs
- `assignment-submissions` — student file uploads
- `course-thumbnails` — public bucket, no auth needed

### RLS on buckets
```sql
-- pdf-notes: enrolled students can read, admin can write
CREATE POLICY "enrolled students read pdf"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pdf-notes'
  AND EXISTS (
    SELECT 1 FROM enrollments e
    JOIN lessons l ON l.chapter_id IN (
      SELECT id FROM chapters WHERE course_id = e.course_id
    )
    WHERE e.student_id = auth.uid()
    AND l.id = (storage.foldername(name))[1]::uuid
    AND e.status = 'active'
  )
);
```

### API change
- `POST /videos/lesson` PDF upload → call `supabase.storage.from('pdf-notes').upload()`
- Return signed URL: `supabase.storage.from('pdf-notes').createSignedUrl(path, 3600)`
- Delete: `supabase.storage.from('pdf-notes').remove([path])`

### Files to change
- `apps/api/src/features/file/file.service.ts` — replace `fs.writeFile` with storage upload
- `packages/supabase/migrations/` — add new migration for storage bucket creation

---

## 2. Supabase Storage — Course & Category Thumbnails
**Priority:** 🔴 High  
**Current gap:** `thumbnail_url` is a plain string — no upload UI, no validation, broken if external URL dies

### What to do
- Create public bucket `thumbnails`
- Frontend uploads directly to Supabase Storage from browser (bypass API server entirely)
- Get permanent CDN URL back, store in `courses.thumbnail_url`

### Direct upload from browser
```typescript
// No backend involved
const { data, error } = await supabase.storage
  .from('thumbnails')
  .upload(`courses/${courseId}.webp`, file, { upsert: true });

const { data: { publicUrl } } = supabase.storage
  .from('thumbnails')
  .getPublicUrl(`courses/${courseId}.webp`);
```

### Files to change
- `apps/web/components/admin/` — add file input + upload logic to course/category forms
- No API changes needed

---

## 3. Supabase Storage — Assignment Submission Viewer
**Priority:** 🟡 Medium  
**Current gap:** Admin has no way to view submitted files securely

### What to do
- Store submissions in private bucket `assignment-submissions`
- Admin requests signed URL (1hr expiry) to view
- Student can re-upload (upsert), previous version replaced

```typescript
// Admin views submission
const { data } = await supabase.storage
  .from('assignment-submissions')
  .createSignedUrl(`${submissionId}/file.pdf`, 3600);
```

---

## 4. Supabase Auth — TOTP Multi-Factor Authentication
**Priority:** 🔴 High  
**Replaces:** Nothing — this is missing entirely

### What to do
Enable MFA only for `admin` and `sub_admin` roles. Students skip it.

```typescript
// Enroll MFA (show QR code)
const { data } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
// data.totp.qr_code — show this as QR image

// Verify TOTP code on sign-in
const { data: challenge } = await supabase.auth.mfa.challenge({ factorId });
await supabase.auth.mfa.verify({ factorId, challengeId, code: userEnteredCode });
```

### Files to add
- `apps/web/app/auth/mfa/enroll/page.tsx` — QR code enrollment page
- `apps/web/app/auth/mfa/verify/page.tsx` — code entry on login
- `apps/web/middleware.ts` — check `auth.user.factors` to enforce MFA redirect for admins

---

## 5. Supabase Realtime — Doubt Session Live Booking
**Priority:** 🔴 High  
**Current gap:** Student books a slot → other students don't see it's full until they refresh

### What to do
Subscribe to `doubt_slots` table on the booking page. When `current_bookings` changes or `status` flips to `full`, UI updates live.

```typescript
// On doubt sessions page (client component)
const channel = supabase
  .channel('doubt-slots')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'doubt_slots',
  }, (payload) => {
    updateSlot(payload.new);
  })
  .subscribe();
```

### Files to change
- `apps/web/components/doubt-sessions/slots-list.tsx` — add realtime subscription
- Enable Realtime on `doubt_slots` table in Supabase dashboard → Table Editor → enable replication

---

## 6. Supabase Realtime — Admin Live Dashboard Stats
**Priority:** 🟡 Medium  
**Current gap:** Admin sees stale enrollment/payment counts until page refresh

### What to do
Subscribe to inserts on `enrollments` and `payments`. Show live counter badge.

```typescript
supabase.channel('admin-stats')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'enrollments' }, () => {
    setEnrollmentCount(c => c + 1);
  })
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments', filter: 'status=eq.completed' }, () => {
    setPaymentCount(c => c + 1);
  })
  .subscribe();
```

---

## 7. Supabase Realtime — New Lesson Published Notification
**Priority:** 🟡 Medium  
**Current gap:** Student has no way to know new content was added

### What to do
When admin flips `lessons.is_published = true`, subscribed enrolled students get a toast.

```typescript
supabase.channel(`course-${courseId}-lessons`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'lessons',
    filter: `is_published=eq.true`,
  }, (payload) => {
    toast(`New lesson available: ${payload.new.title}`);
  })
  .subscribe();
```

Only subscribe if student is enrolled — check enrollment first, then subscribe.

---

## 8. Supabase Realtime — Meeting Link Delivery
**Priority:** 🔴 High  
**Current gap:** Admin sets `doubt_bookings.meeting_link` → student has to refresh to see it

### What to do
Student's booking confirmation page subscribes to their booking row.

```typescript
supabase.channel(`booking-${bookingId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'doubt_bookings',
    filter: `id=eq.${bookingId}`,
  }, (payload) => {
    if (payload.new.meeting_link) setMeetingLink(payload.new.meeting_link);
  })
  .subscribe();
```

---

## 9. Supabase Realtime — Assignment Feedback Notification
**Priority:** 🟡 Medium  
**Current gap:** Student submits assignment → no notification when graded

### What to do
```typescript
supabase.channel(`submissions-${studentId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'assignment_submissions',
    filter: `student_id=eq.${studentId}`,
  }, (payload) => {
    if (payload.new.score !== null) {
      toast(`Your assignment was graded: ${payload.new.score}/${payload.new.max_score}`);
    }
  })
  .subscribe();
```

---

## 10. PostgreSQL Full-Text Search — Course & Lesson Search
**Priority:** 🔴 High  
**Status:** 🔜 Deferred — revisit later  
**Replaces:** No search exists at all currently

### Migration
```sql
ALTER TABLE courses ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))
  ) STORED;

ALTER TABLE lessons ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))
  ) STORED;

CREATE INDEX courses_fts_idx ON courses USING GIN(fts);
CREATE INDEX lessons_fts_idx ON lessons USING GIN(fts);
```

### Query from API
```typescript
const { data } = await supabase
  .from('courses')
  .select('id, title, slug, thumbnail_url, price')
  .textSearch('fts', query, { type: 'websearch', config: 'english' })
  .eq('status', 'published');
```

### Files to add
- `apps/api/src/features/search/search.controller.ts` — `GET /search?q=`
- `apps/api/src/features/search/search.service.ts`
- `apps/web/components/search/search-bar.tsx`

---

## 11. pg_cron — Auto-Clean Expired Video Sessions
**Priority:** 🔴 High  
**Status:** ❓ Needs clarification before implementing  
**Current gap:** `video_sessions` table grows forever, rows never deleted

### How it works
`video_sessions` stores one row per OTP request with an `expires_at` timestamp (5-minute TTL per VdoCipher OTP). After expiry the row is dead weight — it's only used to enforce the concurrent session limit (max 2 active sessions). Stale rows would falsely count as active sessions and block new playback.

### Setup (run in Supabase SQL editor — no backend code needed)
```sql
SELECT cron.schedule(
  'clean-expired-video-sessions',
  '*/15 * * * *',  -- every 15 minutes
  $$DELETE FROM public.video_sessions WHERE expires_at < now()$$
);
```

### To verify it's working
```sql
SELECT * FROM cron.job;           -- see scheduled jobs
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;  -- see run history
```

---

## 12. pg_cron — Auto-Cancel Past Doubt Slots
**Priority:** 🟡 Medium  
**Current gap:** Old available slots stay as `available` forever

### Setup
```sql
SELECT cron.schedule(
  'cancel-past-doubt-slots',
  '0 1 * * *',  -- daily at 1 AM
  $$
    UPDATE public.doubt_slots
    SET status = 'cancelled'
    WHERE status = 'available'
      AND (date + start_time) < now() - interval '1 hour'
  $$
);
```

---

## 13. pg_cron — Enrollment Auto-Expiry
**Priority:** 🟡 Medium  
**Requires:** Adding `expires_at` column to `enrollments` table

### Migration
```sql
ALTER TABLE enrollments ADD COLUMN expires_at timestamptz;

SELECT cron.schedule(
  'expire-enrollments',
  '0 2 * * *',  -- daily at 2 AM
  $$
    UPDATE public.enrollments
    SET status = 'expired'
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at < now()
  $$
);
```

---

## 14. Supabase Database Webhooks — Payment Confirmation Email
**Priority:** 🟡 Medium  
**Current gap:** Enrollment confirmation email sent synchronously during payment verify request, blocking response

### What to do
1. Supabase dashboard → Database → Webhooks → Create webhook
2. Table: `payments`, Event: `INSERT` + `UPDATE`, Filter: `status=completed`
3. Endpoint: `https://your-api.com/webhooks/payment-confirmed`

```typescript
// New endpoint in payments controller
@Public()
@Post('payment-confirmed-webhook')
async paymentConfirmedWebhook(@Body() body: any, @Headers('x-supabase-webhook-secret') secret: string) {
  // verify secret matches SUPABASE_WEBHOOK_SECRET env var
  // send enrollment confirmation email
  // non-blocking — Supabase fires this async
}
```

---

## 15. pgvector — Course Recommendations
**Priority:** 🟢 Low  
**Status:** 🔜 Deferred — revisit later  
**Requires:** OpenAI or any embedding model to generate vectors

### Migration
```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE courses ADD COLUMN embedding vector(1536);
CREATE INDEX ON courses USING ivfflat (embedding vector_cosine_ops);
```

### Recommendation query
```sql
SELECT id, title, slug,
  1 - (embedding <=> $1::vector) AS similarity
FROM courses
WHERE status = 'published'
  AND id != $2
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

### Files to add
- `apps/api/src/features/courses/courses.service.ts` — add `getRecommendations(courseId)` method
- Background job to generate + store embeddings when course is published

---

## 16. Database Function + Trigger — Auto Certificate on Course Completion
**Priority:** 🟡 Medium  
**Current gap:** No certificate system exists

### Migration
```sql
CREATE TABLE certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  certificate_number text UNIQUE NOT NULL DEFAULT 'CERT-' || upper(substr(gen_random_uuid()::text, 1, 8)),
  issued_at timestamptz DEFAULT now(),
  UNIQUE(student_id, course_id)
);

CREATE OR REPLACE FUNCTION check_and_issue_certificate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  total_lessons int;
  completed_lessons int;
  v_course_id uuid;
BEGIN
  SELECT c.course_id INTO v_course_id
  FROM lessons l
  JOIN chapters c ON c.id = l.chapter_id
  WHERE l.id = NEW.lesson_id;

  SELECT COUNT(*) INTO total_lessons
  FROM lessons l
  JOIN chapters c ON c.id = l.chapter_id
  WHERE c.course_id = v_course_id AND l.is_published = true;

  SELECT COUNT(*) INTO completed_lessons
  FROM progress p
  JOIN lessons l ON l.id = p.lesson_id
  JOIN chapters c ON c.id = l.chapter_id
  WHERE c.course_id = v_course_id
    AND p.student_id = NEW.student_id
    AND p.status = 'completed';

  IF total_lessons > 0 AND completed_lessons >= total_lessons THEN
    INSERT INTO certificates (student_id, course_id)
    VALUES (NEW.student_id, v_course_id)
    ON CONFLICT (student_id, course_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lesson_completed
AFTER INSERT OR UPDATE ON progress
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION check_and_issue_certificate();
```

---

## 17. Supabase Edge Function — Razorpay Webhook Handler
**Priority:** 🟡 Medium  
**Replaces:** `apps/api/src/features/payments/payments.controller.ts` webhook endpoint

### What to do
Move webhook verification + enrollment activation to an Edge Function. Runs at edge, independent of NestJS uptime.

```typescript
// supabase/functions/razorpay-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hmac } from 'https://deno.land/x/hmac@v2.0.1/mod.ts';

Deno.serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature');
  const expected = hmac('sha256', Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!, body, 'utf8', 'hex');

  if (signature !== expected) return new Response('Unauthorized', { status: 401 });

  const event = JSON.parse(body);
  if (event.event === 'payment.captured') {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    // upsert enrollment...
  }

  return new Response('OK');
});
```

Deploy: `supabase functions deploy razorpay-webhook`

---

## 18. Supabase Edge Function — VdoCipher OTP Proxy
**Priority:** 🟡 Medium  
**Current gap:** VdoCipher API key stored in NestJS env — if API is compromised, key leaks

### What to do
Move OTP generation to Edge Function. NestJS calls the Edge Function (internal call), not VdoCipher directly.

```typescript
// supabase/functions/vdocipher-otp/index.ts
Deno.serve(async (req) => {
  const authHeader = req.headers.get('x-internal-secret');
  if (authHeader !== Deno.env.get('INTERNAL_SECRET')) {
    return new Response('Forbidden', { status: 403 });
  }

  const { videoId, annotationText } = await req.json();

  const res = await fetch(`https://dev.vdocipher.com/api/videos/${videoId}/otp`, {
    method: 'POST',
    headers: {
      Authorization: `Apisecret ${Deno.env.get('VDOCIPHER_API_SECRET')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ttl: 300, annotate: JSON.stringify([{ type: 'rtext', text: annotationText }]) }),
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
});
```

---

## 19. Supabase Edge Function — PDF Page Count on Upload
**Priority:** 🟢 Low  
**Current gap:** `pdf_notes.page_count` is never populated automatically

### What to do
Storage trigger → Edge Function → extract page count → update `pdf_notes` row.

Set up in Supabase dashboard: Storage → Webhooks → on `pdf-notes` bucket insert → call Edge Function URL.

```typescript
// supabase/functions/pdf-metadata/index.ts
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1';

Deno.serve(async (req) => {
  const { record } = await req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: fileData } = await supabase.storage
    .from('pdf-notes')
    .download(record.name);

  const pdfDoc = await PDFDocument.load(await fileData!.arrayBuffer());
  const pageCount = pdfDoc.getPageCount();
  const fileSizeBytes = record.metadata?.size ?? 0;

  await supabase.from('pdf_notes')
    .update({ page_count: pageCount, file_size_bytes: fileSizeBytes })
    .eq('file_path', record.name);

  return new Response('OK');
});
```

---

## 20. Supabase Auth Admin — Global Session Invalidation
**Priority:** 🔴 High  
**Current gap:** Banning a user or deleting account only removes from `devices` table — Supabase Auth session still valid

### What to do
```typescript
// In auth.service.ts deleteAccount + any future ban feature
await this.supabase.auth.admin.signOut(userId, 'global');
// Invalidates ALL Supabase sessions for that user immediately
```

Also call this when admin demotes a sub_admin — their elevated session should die.

### Files to change
- `apps/api/src/features/auth/auth.service.ts` — `deleteAccount()` method
- `apps/api/src/features/permissions/permissions.service.ts` — `demoteToStudent()` method

---

## 21. RLS Enhancement — Direct Client Safety for Mobile
**Priority:** 🟡 Medium  
**Current gap:** All data access goes through NestJS service-role client (bypasses RLS). Safe now, but a future mobile app with a direct Supabase client has no safety net without proper policies.

### Add missing policies
```sql
-- Students can only read their own progress
CREATE POLICY "student reads own progress"
ON progress FOR SELECT
USING (student_id = auth.uid());

-- Students can only read their own payment records
CREATE POLICY "student reads own payments"
ON payments FOR SELECT
USING (student_id = auth.uid());

-- Students can only see published lessons in enrolled courses
CREATE POLICY "student reads enrolled lessons"
ON lessons FOR SELECT
USING (
  is_published = true
  AND chapter_id IN (
    SELECT ch.id FROM chapters ch
    JOIN enrollments e ON e.course_id = ch.course_id
    WHERE e.student_id = auth.uid() AND e.status = 'active'
  )
);
```

---

## 22. Supabase Auth Hook — Inject Role into JWT Claims
**Priority:** 🟡 Medium  
**Current gap:** Every API request queries `profiles` table to get user role — zero DB round-trip with custom claims.

### Setup (Supabase dashboard → Auth → Hooks)
```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
  claims jsonb;
  user_role text;
  user_permissions text[];
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  SELECT permissions INTO user_permissions
  FROM public.sub_admin_permissions
  WHERE user_id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(coalesce(user_role, 'student')));

  IF user_permissions IS NOT NULL THEN
    claims := jsonb_set(claims, '{permissions}', to_jsonb(user_permissions));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
```

> **Note:** Auth hooks require Supabase Pro plan.

---

## 23. Supabase Built-in Monitoring
**Priority:** 🔴 High — zero implementation effort, use immediately

| Dashboard section | What it shows |
|---|---|
| **Logs → API** | Every request hitting PostgREST, Auth, Storage |
| **Logs → Postgres** | Slow queries, errors, lock waits |
| **Reports → Query Performance** | Top 50 slowest queries with execution plans |
| **Reports → Database** | Table sizes, index usage, cache hit ratio |
| **Auth → Users** | Sign-in history, last sign-in, provider used |
| **Auth → Logs** | Failed logins, token errors |

Useful right now: check if `video_sessions` is growing unchecked, verify Google Auth callback errors, find slow queries.

---

## Implementation Order

```
Immediate (minutes, SQL only / dashboard)
  ├── #23 Turn on Supabase monitoring (dashboard, 5 min)
  ├── #12 pg_cron past slot cleanup (SQL, 15 min)
  ├── #20 Global session invalidation (2 lines of code, 30 min)
  └── #11 pg_cron video session cleanup (SQL, 15 min) ← clarify first

Week 1
  └── #1  Storage for PDFs/assignments (1-2 days)

Week 2
  ├── #5  Realtime doubt slot booking (half day)
  ├── #8  Realtime meeting link delivery (half day)
  ├── #4  MFA for admin accounts (1 day)
  └── #2  Thumbnail upload via Storage (half day)

Week 3
  ├── #16 Certificate auto-generation trigger (1 day)
  ├── #13 Enrollment expiry (half day)
  ├── #6  Realtime admin dashboard (half day)
  └── #7  New lesson notification (half day)

Week 4+
  ├── #22 JWT claims hook (Pro plan required)
  ├── #17 Edge Function Razorpay webhook
  ├── #18 Edge Function VdoCipher OTP proxy
  ├── #10 Full-text search (deferred)
  └── #15 pgvector recommendations (deferred)
```

---

## Notes

- **pg_cron jobs:** run SQL in Supabase dashboard → SQL Editor
- **Realtime subscriptions:** enable table replication first — Supabase dashboard → Database → Replication → toggle table on
- **Edge Functions:** need Supabase CLI (`supabase functions deploy <name>`)
- **Storage buckets:** create via dashboard or migration SQL
- **Auth hooks:** Pro plan and above only
- **pgvector:** already enabled on all Supabase projects — just run `CREATE EXTENSION IF NOT EXISTS vector`
