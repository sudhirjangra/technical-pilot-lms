-- ============================================================
-- Migration: 003_indexes_and_sessions
-- Description: Add sessions table + performance indexes
-- ============================================================

-- ─── SESSIONS (audit trail per ARCHITECTURE.md) ──────────────
create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  device_id    uuid references public.devices(id) on delete set null,
  ip_address   text,
  user_agent   text,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  is_active    boolean not null default true
);

alter table public.sessions enable row level security;

create policy "Users read own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Admin full access sessions"
  on public.sessions for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ─── PERFORMANCE INDEXES ─────────────────────────────────────

-- Sessions
create index idx_sessions_user_id on public.sessions(user_id);
create index idx_sessions_device_id on public.sessions(device_id);

-- Audit logs
create index idx_audit_logs_user_id on public.audit_logs(user_id);
create index idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index idx_audit_logs_action on public.audit_logs(action);

-- Courses
create index idx_courses_status on public.courses(status);
create index idx_courses_category_id on public.courses(category_id);
create index idx_courses_created_by on public.courses(created_by);

-- Chapters
create index idx_chapters_course_id on public.chapters(course_id);

-- Lessons
create index idx_lessons_chapter_id on public.lessons(chapter_id);

-- Video lessons
create index idx_video_lessons_lesson_id on public.video_lessons(lesson_id);

-- PDF notes
create index idx_pdf_notes_lesson_id on public.pdf_notes(lesson_id);

-- Assignments
create index idx_assignments_lesson_id on public.assignments(lesson_id);

-- Tests
create index idx_tests_lesson_id on public.tests(lesson_id);

-- Questions
create index idx_questions_test_id on public.questions(test_id);

-- Question options
create index idx_question_options_question_id on public.question_options(question_id);

-- Test attempts
create index idx_test_attempts_student_id on public.test_attempts(student_id);
create index idx_test_attempts_test_id on public.test_attempts(test_id);

-- Test answers
create index idx_test_answers_attempt_id on public.test_answers(attempt_id);

-- Enrollments
create index idx_enrollments_student_id on public.enrollments(student_id);
create index idx_enrollments_course_id on public.enrollments(course_id);
create index idx_enrollments_status on public.enrollments(status);

-- Progress
create index idx_progress_student_id on public.progress(student_id);
create index idx_progress_lesson_id on public.progress(lesson_id);

-- Assignment submissions
create index idx_assignment_submissions_student_id on public.assignment_submissions(student_id);
create index idx_assignment_submissions_assignment_id on public.assignment_submissions(assignment_id);

-- Payments
create index idx_payments_student_id on public.payments(student_id);
create index idx_payments_course_id on public.payments(course_id);
create index idx_payments_status on public.payments(status);
create index idx_payments_created_at on public.payments(created_at desc);

-- Referral codes
create index idx_referral_codes_user_id on public.referral_codes(user_id);

-- Referrals
create index idx_referrals_referrer_id on public.referrals(referrer_id);
create index idx_referrals_referee_id on public.referrals(referee_id);

-- Referral commissions
create index idx_referral_commissions_referral_id on public.referral_commissions(referral_id);
create index idx_referral_commissions_payment_id on public.referral_commissions(payment_id);

-- Doubt slots
create index idx_doubt_slots_date on public.doubt_slots(date);
create index idx_doubt_slots_created_by on public.doubt_slots(created_by);

-- Doubt bookings
create index idx_doubt_bookings_slot_id on public.doubt_bookings(slot_id);
create index idx_doubt_bookings_student_id on public.doubt_bookings(student_id);

-- Sub-admin permissions
create index idx_sub_admin_permissions_user_id on public.sub_admin_permissions(user_id);
