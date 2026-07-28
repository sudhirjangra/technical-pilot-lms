-- ============================================================
-- Migration: 001_initial_schema
-- Description: Full LMS schema — Phase 1 tables + RLS policies
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── ENUMS ───────────────────────────────────────────────────
create type user_role as enum ('admin', 'sub_admin', 'student'); -- done
create type device_platform as enum ('web', 'android', 'ios');
create type course_status as enum ('draft', 'published', 'archived');
create type lesson_type as enum ('video', 'pdf', 'assignment', 'test');
create type enrollment_status as enum ('active', 'completed', 'expired');
create type progress_status as enum ('not_started', 'in_progress', 'completed');
create type payment_status as enum ('pending', 'completed', 'failed', 'refunded');
create type referral_status as enum ('pending', 'converted', 'expired');
create type commission_status as enum ('pending', 'approved', 'paid', 'rejected');
create type booking_status as enum ('confirmed', 'cancelled', 'completed', 'no_show');

-- ─── PROFILES ────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  role         user_role not null default 'student',
  full_name    text,
  phone        text,
  avatar_url   text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── SUB-ADMIN PERMISSIONS ───────────────────────────────────
create table public.sub_admin_permissions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  permissions  text[] not null default '{}',
  granted_by   uuid not null references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── DEVICES ─────────────────────────────────────────────────
create table public.devices (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  device_fingerprint  text not null,
  device_name         text not null default 'unknown',
  platform            device_platform not null default 'web',
  last_active_at      timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

-- Max 2 devices per user enforced at app layer + trigger
create index idx_devices_user_id on public.devices(user_id);

-- ─── AUDIT LOGS ──────────────────────────────────────────────
create table public.audit_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete set null,
  action         text not null,
  resource_type  text,
  resource_id    text,
  ip_address     text,
  user_agent     text,
  metadata       jsonb,
  created_at     timestamptz not null default now()
);

-- ─── CATEGORIES ──────────────────────────────────────────────
create table public.categories (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text not null unique,
  description    text,
  thumbnail_url  text,
  sort_order     int not null default 0,
  is_active      boolean not null default true
);

-- ─── COURSES ─────────────────────────────────────────────────
create table public.courses (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid references public.categories(id) on delete set null,
  title           text not null,
  slug            text not null unique,
  description     text,
  thumbnail_url   text,
  price           numeric(10,2) not null default 0,
  discount_price  numeric(10,2),
  status          course_status not null default 'draft',
  created_by      uuid not null references public.profiles(id),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── CHAPTERS ────────────────────────────────────────────────
create table public.chapters (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses(id) on delete cascade,
  title        text not null,
  description  text,
  sort_order   int not null default 0,
  is_published boolean not null default false
);

-- ─── LESSONS ─────────────────────────────────────────────────
create table public.lessons (
  id               uuid primary key default gen_random_uuid(),
  chapter_id       uuid not null references public.chapters(id) on delete cascade,
  title            text not null,
  description      text,
  lesson_type      lesson_type not null,
  sort_order       int not null default 0,
  is_published     boolean not null default false,
  duration_seconds int
);

-- ─── VIDEO LESSONS ───────────────────────────────────────────
create table public.video_lessons (
  id               uuid primary key default gen_random_uuid(),
  lesson_id        uuid not null unique references public.lessons(id) on delete cascade,
  vimeo_video_id   text not null,
  vimeo_uri        text not null,
  duration_seconds int,
  thumbnail_url    text
);

-- ─── PDF NOTES ───────────────────────────────────────────────
create table public.pdf_notes (
  id              uuid primary key default gen_random_uuid(),
  lesson_id       uuid not null unique references public.lessons(id) on delete cascade,
  file_path       text not null,
  file_size_bytes bigint,
  page_count      int
);

-- ─── ASSIGNMENTS ─────────────────────────────────────────────
create table public.assignments (
  id                        uuid primary key default gen_random_uuid(),
  lesson_id                 uuid not null unique references public.lessons(id) on delete cascade,
  title                     text not null,
  instructions              text,
  max_score                 int not null default 100,
  due_days_after_enrollment int
);

-- ─── TESTS ───────────────────────────────────────────────────
create table public.tests (
  id                    uuid primary key default gen_random_uuid(),
  lesson_id             uuid not null unique references public.lessons(id) on delete cascade,
  title                 text not null,
  time_limit_seconds    int,
  passing_score_percent int not null default 60,
  max_attempts          int not null default 1
);

create table public.questions (
  id             uuid primary key default gen_random_uuid(),
  test_id        uuid not null references public.tests(id) on delete cascade,
  question_text  text not null,
  question_type  text not null check (question_type in ('mcq', 'text')),
  points         int not null default 1,
  explanation    text,
  sort_order     int not null default 0
);

create table public.question_options (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references public.questions(id) on delete cascade,
  option_text  text not null,
  is_correct   boolean not null default false,
  sort_order   int not null default 0
);

create table public.test_attempts (
  id               uuid primary key default gen_random_uuid(),
  test_id          uuid not null references public.tests(id) on delete cascade,
  student_id       uuid not null references public.profiles(id) on delete cascade,
  started_at       timestamptz not null default now(),
  completed_at     timestamptz,
  score            int,
  max_score        int,
  time_spent_seconds int
);

create table public.test_answers (
  id                 uuid primary key default gen_random_uuid(),
  attempt_id         uuid not null references public.test_attempts(id) on delete cascade,
  question_id        uuid not null references public.questions(id) on delete cascade,
  selected_option_id uuid references public.question_options(id),
  text_answer        text,
  is_correct         boolean,
  time_spent_seconds int
);

-- ─── ENROLLMENTS ─────────────────────────────────────────────
create table public.enrollments (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles(id) on delete cascade,
  course_id    uuid not null references public.courses(id) on delete cascade,
  enrolled_at  timestamptz not null default now(),
  status       enrollment_status not null default 'active',
  completed_at timestamptz,
  unique(student_id, course_id)
);

-- ─── PROGRESS ────────────────────────────────────────────────
create table public.progress (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid not null references public.profiles(id) on delete cascade,
  lesson_id            uuid not null references public.lessons(id) on delete cascade,
  status               progress_status not null default 'not_started',
  progress_percent     int not null default 0 check (progress_percent between 0 and 100),
  last_position_seconds int not null default 0,
  completed_at         timestamptz,
  updated_at           timestamptz not null default now(),
  unique(student_id, lesson_id)
);

-- ─── ASSIGNMENT SUBMISSIONS ───────────────────────────────────
create table public.assignment_submissions (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.assignments(id) on delete cascade,
  student_id     uuid not null references public.profiles(id) on delete cascade,
  file_path      text not null,
  submitted_at   timestamptz not null default now(),
  score          int,
  feedback       text
);

-- ─── PAYMENTS ────────────────────────────────────────────────
create table public.payments (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid not null references public.profiles(id) on delete cascade,
  course_id            uuid not null references public.courses(id) on delete cascade,
  amount               numeric(10,2) not null,
  discount_amount      numeric(10,2) not null default 0,
  razorpay_order_id    text not null,
  razorpay_payment_id  text,
  razorpay_signature   text,
  status               payment_status not null default 'pending',
  refund_reason        text,
  invoice_number       text not null unique,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ─── REFERRALS ───────────────────────────────────────────────
create table public.referral_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  code       text not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.referral_config (
  id                          uuid primary key default gen_random_uuid(),
  referee_discount_percent    int not null default 10,
  referrer_commission_percent int not null default 5,
  min_purchase_amount         numeric(10,2) not null default 0,
  is_active                   boolean not null default true
);

create table public.referrals (
  id               uuid primary key default gen_random_uuid(),
  referrer_id      uuid not null references public.profiles(id) on delete cascade,
  referee_id       uuid not null references public.profiles(id) on delete cascade,
  referral_code_id uuid not null references public.referral_codes(id),
  status           referral_status not null default 'pending',
  converted_at     timestamptz
);

create table public.referral_commissions (
  id           uuid primary key default gen_random_uuid(),
  referral_id  uuid not null references public.referrals(id) on delete cascade,
  payment_id   uuid not null references public.payments(id) on delete cascade,
  amount       numeric(10,2) not null,
  status       commission_status not null default 'pending',
  approved_by  uuid references public.profiles(id),
  paid_at      timestamptz
);

create table public.referral_discounts_applied (
  id               uuid primary key default gen_random_uuid(),
  payment_id       uuid not null references public.payments(id) on delete cascade,
  referral_code_id uuid not null references public.referral_codes(id),
  discount_percent int not null,
  discount_amount  numeric(10,2) not null
);

-- ─── DOUBT SESSIONS ──────────────────────────────────────────
create table public.doubt_slots (
  id               uuid primary key default gen_random_uuid(),
  created_by       uuid not null references public.profiles(id),
  date             date not null,
  start_time       time not null,
  end_time         time not null,
  duration_minutes int not null,
  max_bookings     int not null default 1,
  current_bookings int not null default 0,
  status           text not null default 'available' check (status in ('available', 'full', 'cancelled'))
);

create table public.doubt_bookings (
  id           uuid primary key default gen_random_uuid(),
  slot_id      uuid not null references public.doubt_slots(id) on delete cascade,
  student_id   uuid not null references public.profiles(id) on delete cascade,
  status       booking_status not null default 'confirmed',
  booked_at    timestamptz not null default now(),
  cancelled_at timestamptz,
  meeting_link text
);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create profile on new auth user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'student')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();
create trigger courses_updated_at before update on public.courses
  for each row execute procedure public.handle_updated_at();
create trigger payments_updated_at before update on public.payments
  for each row execute procedure public.handle_updated_at();
create trigger sub_admin_permissions_updated_at before update on public.sub_admin_permissions
  for each row execute procedure public.handle_updated_at();
create trigger progress_updated_at before update on public.progress
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.sub_admin_permissions enable row level security;
alter table public.courses enable row level security;
alter table public.chapters enable row level security;
alter table public.lessons enable row level security;
alter table public.video_lessons enable row level security;
alter table public.pdf_notes enable row level security;
alter table public.enrollments enable row level security;
alter table public.progress enable row level security;
alter table public.payments enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_commissions enable row level security;
alter table public.doubt_slots enable row level security;
alter table public.doubt_bookings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.test_attempts enable row level security;
alter table public.assignment_submissions enable row level security;

-- Helper: get current user role
create or replace function public.get_my_role()
returns user_role language sql security definer as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ─── PROFILES POLICIES ───────────────────────────────────────
create policy "Users read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Admin reads all profiles"
  on public.profiles for select using (public.get_my_role() in ('admin', 'sub_admin'));

create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Admin update any profile"
  on public.profiles for update using (public.get_my_role() = 'admin');

-- ─── DEVICES POLICIES ────────────────────────────────────────
create policy "Users manage own devices"
  on public.devices for all using (auth.uid() = user_id);

create policy "Admin reads all devices"
  on public.devices for select using (public.get_my_role() in ('admin', 'sub_admin'));

-- ─── COURSES POLICIES ────────────────────────────────────────
create policy "Anyone reads published courses"
  on public.courses for select using (status = 'published');

create policy "Admin manages courses"
  on public.courses for all using (public.get_my_role() in ('admin', 'sub_admin'));

-- ─── CHAPTERS/LESSONS POLICIES ───────────────────────────────
create policy "Enrolled students read published chapters"
  on public.chapters for select using (
    is_published = true and
    exists (
      select 1 from public.enrollments e
      join public.courses c on c.id = e.course_id
      where e.student_id = auth.uid()
        and e.status = 'active'
        and c.id = course_id
    )
  );

create policy "Admin manages chapters"
  on public.chapters for all using (public.get_my_role() in ('admin', 'sub_admin'));

create policy "Enrolled students read published lessons"
  on public.lessons for select using (
    is_published = true and
    exists (
      select 1 from public.enrollments e
      join public.courses c on c.id = e.course_id
      join public.chapters ch on ch.course_id = c.id
      where e.student_id = auth.uid()
        and e.status = 'active'
        and ch.id = chapter_id
    )
  );

create policy "Admin manages lessons"
  on public.lessons for all using (public.get_my_role() in ('admin', 'sub_admin'));

-- ─── VIDEO/PDF POLICIES ──────────────────────────────────────
create policy "Enrolled students read video lessons"
  on public.video_lessons for select using (
    exists (
      select 1 from public.lessons l
      join public.chapters ch on ch.id = l.chapter_id
      join public.enrollments e on e.course_id = ch.course_id
      where l.id = lesson_id
        and e.student_id = auth.uid()
        and e.status = 'active'
    )
  );

create policy "Admin manages video lessons"
  on public.video_lessons for all using (public.get_my_role() in ('admin', 'sub_admin'));

create policy "Enrolled students read pdf notes"
  on public.pdf_notes for select using (
    exists (
      select 1 from public.lessons l
      join public.chapters ch on ch.id = l.chapter_id
      join public.enrollments e on e.course_id = ch.course_id
      where l.id = lesson_id
        and e.student_id = auth.uid()
        and e.status = 'active'
    )
  );

create policy "Admin manages pdf notes"
  on public.pdf_notes for all using (public.get_my_role() in ('admin', 'sub_admin'));

-- ─── ENROLLMENTS POLICIES ────────────────────────────────────
create policy "Students read own enrollments"
  on public.enrollments for select using (auth.uid() = student_id);

create policy "Admin reads all enrollments"
  on public.enrollments for select using (public.get_my_role() in ('admin', 'sub_admin'));

create policy "Admin inserts enrollments"
  on public.enrollments for insert with check (public.get_my_role() in ('admin', 'sub_admin'));

create policy "Admin updates enrollments"
  on public.enrollments for update using (public.get_my_role() in ('admin', 'sub_admin'));

create policy "Admin deletes enrollments"
  on public.enrollments for delete using (public.get_my_role() in ('admin', 'sub_admin'));

-- ─── PROGRESS POLICIES ───────────────────────────────────────
create policy "Students manage own progress"
  on public.progress for all using (auth.uid() = student_id);

create policy "Admin reads all progress"
  on public.progress for select using (public.get_my_role() in ('admin', 'sub_admin'));

-- ─── PAYMENTS POLICIES ───────────────────────────────────────
create policy "Students read own payments"
  on public.payments for select using (auth.uid() = student_id);

create policy "Admin reads all payments"
  on public.payments for select using (public.get_my_role() in ('admin', 'sub_admin'));

-- ─── TEST ATTEMPTS POLICIES ──────────────────────────────────
create policy "Students manage own attempts"
  on public.test_attempts for all using (auth.uid() = student_id);

create policy "Admin reads all attempts"
  on public.test_attempts for select using (public.get_my_role() in ('admin', 'sub_admin'));

-- ─── ASSIGNMENT SUBMISSIONS POLICIES ─────────────────────────
create policy "Students manage own submissions"
  on public.assignment_submissions for all using (auth.uid() = student_id);

create policy "Admin reads all submissions"
  on public.assignment_submissions for select using (public.get_my_role() in ('admin', 'sub_admin'));

-- ─── DOUBT SLOTS/BOOKINGS ────────────────────────────────────
create policy "Anyone reads available slots"
  on public.doubt_slots for select using (status = 'available');

create policy "Admin manages slots"
  on public.doubt_slots for all using (public.get_my_role() in ('admin', 'sub_admin'));

create policy "Students manage own bookings"
  on public.doubt_bookings for all using (auth.uid() = student_id);

create policy "Admin manages all bookings"
  on public.doubt_bookings for all using (public.get_my_role() in ('admin', 'sub_admin'));

-- ─── AUDIT LOGS ──────────────────────────────────────────────
create policy "Admin reads audit logs"
  on public.audit_logs for select using (public.get_my_role() = 'admin');

-- ─── REFERRALS ───────────────────────────────────────────────
create policy "Students read own referral codes"
  on public.referral_codes for select using (auth.uid() = user_id);

create policy "Admin manages referral codes"
  on public.referral_codes for all using (public.get_my_role() in ('admin', 'sub_admin'));

create policy "Students read own referrals"
  on public.referrals for select using (auth.uid() = referrer_id or auth.uid() = referee_id);

create policy "Admin reads all referrals"
  on public.referrals for all using (public.get_my_role() in ('admin', 'sub_admin'));

create policy "Students read own commissions"
  on public.referral_commissions for select using (
    exists (
      select 1 from public.referrals r where r.id = referral_id and r.referrer_id = auth.uid()
    )
  );

create policy "Admin manages commissions"
  on public.referral_commissions for all using (public.get_my_role() in ('admin', 'sub_admin'));
