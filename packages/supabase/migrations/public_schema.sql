--
-- PostgreSQL database dump
--

\restrict tuWaW2NsbNyULEk5aWjGfZRSr8FvfTqVm6ZbmTseU7QkVhidOsGYKz9rmvDcwbc

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6 (Ubuntu 18.6-1.pgdg24.04+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_status AS ENUM (
    'confirmed',
    'cancelled',
    'completed',
    'no_show'
);


--
-- Name: course_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.course_status AS ENUM (
    'draft',
    'published',
    'archived'
);


--
-- Name: device_platform; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.device_platform AS ENUM (
    'web',
    'android',
    'ios'
);


--
-- Name: enrollment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enrollment_status AS ENUM (
    'active',
    'completed',
    'expired'
);


--
-- Name: lesson_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lesson_type AS ENUM (
    'video',
    'pdf',
    'assignment',
    'test'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
);


--
-- Name: progress_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.progress_status AS ENUM (
    'not_started',
    'in_progress',
    'completed'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'sub_admin',
    'student'
);


--
-- Name: generate_unique_tp_referral_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_unique_tp_referral_code() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  new_code TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'TP';
    FOR i IN 1..6 LOOP
      new_code := new_code || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
    END LOOP;

    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$;


--
-- Name: get_my_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_role() RETURNS public.user_role
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT COALESCE(role, 'student'::public.user_role) 
  FROM public.profiles 
  WHERE id = auth.uid()
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'student')
  on conflict (id) do nothing;
  return new;
end;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: set_profile_referral_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_profile_referral_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_unique_tp_referral_code();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: assessment_attempt_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_attempt_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    assignment_id uuid,
    test_id uuid,
    extra_attempts integer DEFAULT 0 NOT NULL,
    granted_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assessment_attempt_grants_target_check CHECK ((num_nonnulls(assignment_id, test_id) = 1))
);


--
-- Name: assignment_answer_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_answer_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_answer_id uuid NOT NULL,
    option_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assignment_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attempt_id uuid NOT NULL,
    question_id uuid NOT NULL,
    text_answer text,
    is_correct boolean,
    time_spent_seconds integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assignment_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    student_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    score integer,
    max_score integer,
    time_spent_seconds integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    title text NOT NULL,
    instructions text,
    max_score integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    time_limit_seconds integer,
    passing_score_percent integer DEFAULT 60 NOT NULL,
    max_attempts integer DEFAULT 1 NOT NULL,
    due_days_after_start integer
);


--
-- Name: COLUMN assignments.due_days_after_start; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assignments.due_days_after_start IS 'Days allowed after the student starts the parent chapter (see chapter_starts). NULL = no due date.';


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    resource_type text,
    resource_id text,
    ip_address text,
    user_agent text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cash_conversion_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_conversion_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    points_requested integer NOT NULL,
    inr_amount numeric(10,2) NOT NULL,
    points_per_rupee numeric(10,2) NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    student_notes text,
    admin_notes text,
    processed_at timestamp with time zone,
    processed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cash_conversion_requests_inr_amount_check CHECK ((inr_amount > (0)::numeric)),
    CONSTRAINT cash_conversion_requests_points_per_rupee_check CHECK ((points_per_rupee > (0)::numeric)),
    CONSTRAINT cash_conversion_requests_points_requested_check CHECK ((points_requested > 0)),
    CONSTRAINT cash_conversion_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'paid'::character varying])::text[])))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    thumbnail_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: chapter_starts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chapter_starts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    chapter_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chapters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chapters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(64) NOT NULL,
    discount_percentage numeric(5,2) NOT NULL,
    applicable_user_id uuid,
    max_uses integer DEFAULT 1 NOT NULL,
    times_used integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    valid_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT coupons_discount_percentage_check CHECK (((discount_percentage >= (0)::numeric) AND (discount_percentage <= (100)::numeric))),
    CONSTRAINT coupons_max_uses_check CHECK ((max_uses > 0)),
    CONSTRAINT coupons_times_used_check CHECK ((times_used >= 0))
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid,
    title text NOT NULL,
    slug text NOT NULL,
    description text,
    thumbnail_url text,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    discount_price numeric(10,2),
    status public.course_status DEFAULT 'draft'::public.course_status NOT NULL,
    created_by uuid,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    device_fingerprint text NOT NULL,
    device_name text DEFAULT 'unknown'::text NOT NULL,
    platform public.device_platform DEFAULT 'web'::public.device_platform NOT NULL,
    last_active_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: doubt_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doubt_bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slot_id uuid NOT NULL,
    student_id uuid NOT NULL,
    status public.booking_status DEFAULT 'confirmed'::public.booking_status NOT NULL,
    booked_at timestamp with time zone DEFAULT now() NOT NULL,
    cancelled_at timestamp with time zone,
    meeting_link text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: doubt_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doubt_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_by uuid,
    date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    duration_minutes integer NOT NULL,
    max_bookings integer DEFAULT 1 NOT NULL,
    current_bookings integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    topic character varying(200),
    description text,
    meeting_link text,
    target_type text DEFAULT 'all'::text,
    course_id uuid,
    student_id uuid,
    CONSTRAINT doubt_slots_status_check CHECK ((status = ANY (ARRAY['available'::text, 'full'::text, 'cancelled'::text])))
);


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    course_id uuid NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL,
    status public.enrollment_status DEFAULT 'active'::public.enrollment_status NOT NULL,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    lesson_type public.lesson_type NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    duration_seconds integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: COLUMN notifications.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.type IS 'One of: course_added, offer, congratulation, announcement, assignment_due, query_reply';


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    course_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0 NOT NULL,
    razorpay_order_id text NOT NULL,
    razorpay_payment_id text,
    razorpay_signature text,
    status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
    refund_reason text,
    invoice_number text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    coupon_code text
);


--
-- Name: pdf_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdf_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    file_path text NOT NULL,
    file_size_bytes bigint,
    page_count integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    role public.user_role DEFAULT 'student'::public.user_role NOT NULL,
    full_name text,
    phone text,
    avatar_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    referral_code character varying(16),
    referred_by uuid
);


--
-- Name: progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    status public.progress_status DEFAULT 'not_started'::public.progress_status NOT NULL,
    progress_percent integer DEFAULT 0 NOT NULL,
    last_position_seconds integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT progress_progress_percent_check CHECK (((progress_percent >= 0) AND (progress_percent <= 100)))
);


--
-- Name: question_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    option_text text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_id uuid,
    question_text text NOT NULL,
    question_type text NOT NULL,
    points integer DEFAULT 1 NOT NULL,
    explanation text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    assignment_id uuid,
    question_number integer,
    correct_text_answer text,
    topic text,
    question_category text,
    question_difficulty text,
    subtopic text,
    CONSTRAINT questions_parent_xor_check CHECK ((num_nonnulls(test_id, assignment_id) = 1)),
    CONSTRAINT questions_question_type_check CHECK ((question_type = ANY (ARRAY['mcq'::text, 'msq'::text, 'text'::text]))),
    CONSTRAINT questions_question_difficulty_check CHECK (((question_difficulty IS NULL) OR (question_difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text]))))
);


--
-- Name: COLUMN questions.question_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.questions.question_number IS 'Admin-facing question number shown to students. Defaults to position; may be set explicitly on import.';


--
-- Name: COLUMN questions.correct_text_answer; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.questions.correct_text_answer IS 'Expected answer for question_type = text. NULL for mcq/msq questions.';


--
-- Name: referral_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_settings (
    id integer DEFAULT 1 NOT NULL,
    referee_discount_percentage numeric(5,2) DEFAULT 20.00 NOT NULL,
    referrer_reward_percentage numeric(5,2) DEFAULT 10.00 NOT NULL,
    points_per_rupee numeric(10,2) DEFAULT 5.00 NOT NULL,
    min_withdrawal_points integer DEFAULT 500 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT referral_settings_id_check CHECK ((id = 1)),
    CONSTRAINT referral_settings_min_withdrawal_points_check CHECK ((min_withdrawal_points >= 0)),
    CONSTRAINT referral_settings_points_per_rupee_check CHECK ((points_per_rupee > (0)::numeric)),
    CONSTRAINT referral_settings_referee_discount_percentage_check CHECK (((referee_discount_percentage >= (0)::numeric) AND (referee_discount_percentage <= (100)::numeric))),
    CONSTRAINT referral_settings_referrer_reward_percentage_check CHECK (((referrer_reward_percentage >= (0)::numeric) AND (referrer_reward_percentage <= (100)::numeric)))
);


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid NOT NULL,
    referee_id uuid NOT NULL,
    referral_code character varying(32) NOT NULL,
    status character varying(32) DEFAULT 'registered'::character varying NOT NULL,
    total_purchases_count integer DEFAULT 0 NOT NULL,
    total_purchased_amount numeric(10,2) DEFAULT 0 NOT NULL,
    total_points_awarded integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT no_self_referral CHECK ((referrer_id <> referee_id)),
    CONSTRAINT referrals_status_check CHECK (((status)::text = ANY ((ARRAY['registered'::character varying, 'purchased'::character varying])::text[]))),
    CONSTRAINT referrals_total_points_awarded_check CHECK ((total_points_awarded >= 0)),
    CONSTRAINT referrals_total_purchased_amount_check CHECK ((total_purchased_amount >= (0)::numeric)),
    CONSTRAINT referrals_total_purchases_count_check CHECK ((total_purchases_count >= 0))
);


--
-- Name: student_queries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_queries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    subject text NOT NULL,
    body text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    admin_reply text,
    replied_by uuid,
    replied_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    type text DEFAULT 'general'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT student_queries_status_check CHECK ((status = ANY (ARRAY['open'::text, 'answered'::text, 'closed'::text])))
);


--
-- Name: COLUMN student_queries.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_queries.type IS 'One of: general, extra_attempt_request';


--
-- Name: COLUMN student_queries.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_queries.metadata IS 'Request payload, e.g. { assignment_id, test_id, lesson_id }';


--
-- Name: sub_admin_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sub_admin_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    permissions text[] DEFAULT '{}'::text[] NOT NULL,
    granted_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: test_answer_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_answer_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_answer_id uuid NOT NULL,
    option_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: test_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attempt_id uuid NOT NULL,
    question_id uuid NOT NULL,
    selected_option_id uuid,
    text_answer text,
    is_correct boolean,
    time_spent_seconds integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: COLUMN test_answers.selected_option_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.test_answers.selected_option_id IS 'Deprecated: single-option legacy column. Use test_answer_options for MCQ/MSQ selections.';


--
-- Name: test_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_id uuid NOT NULL,
    student_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    score integer,
    max_score integer,
    time_spent_seconds integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    title text NOT NULL,
    time_limit_seconds integer,
    passing_score_percent integer DEFAULT 60 NOT NULL,
    max_attempts integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    current_balance integer DEFAULT 0 NOT NULL,
    total_earned integer DEFAULT 0 NOT NULL,
    total_redeemed integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_wallets_current_balance_check CHECK ((current_balance >= 0)),
    CONSTRAINT user_wallets_total_earned_check CHECK ((total_earned >= 0)),
    CONSTRAINT user_wallets_total_redeemed_check CHECK ((total_redeemed >= 0))
);


--
-- Name: video_lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    vdocipher_video_id text NOT NULL,
    duration_seconds integer,
    thumbnail_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: video_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    ip_address text NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    user_id uuid NOT NULL,
    type character varying(32) NOT NULL,
    points integer NOT NULL,
    balance_after integer NOT NULL,
    reference_id text,
    source_user_id uuid,
    description text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallet_transactions_balance_after_check CHECK ((balance_after >= 0)),
    CONSTRAINT wallet_transactions_points_check CHECK ((points <> 0)),
    CONSTRAINT wallet_transactions_type_check CHECK (((type)::text = ANY ((ARRAY['credit_purchase'::character varying, 'debit_conversion'::character varying, 'refund_conversion_rejected'::character varying, 'admin_adjustment'::character varying])::text[])))
);


--
-- Data for Name: assessment_attempt_grants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assessment_attempt_grants (id, student_id, assignment_id, test_id, extra_attempts, granted_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: assignment_answer_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assignment_answer_options (id, assignment_answer_id, option_id, created_at) FROM stdin;
\.


--
-- Data for Name: assignment_answers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assignment_answers (id, attempt_id, question_id, text_answer, is_correct, time_spent_seconds, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: assignment_attempts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assignment_attempts (id, assignment_id, student_id, started_at, completed_at, score, max_score, time_spent_seconds, created_at, updated_at) FROM stdin;
e44c4d89-32a3-4e1b-96d4-c115b83df3c7	6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	2026-09-07 09:53:05.277+00	2026-09-07 09:53:25.762+00	9	11	20	2026-09-07 09:53:05.624575+00	2026-09-07 09:53:05.624575+00
766a981b-668b-4b5c-87d0-0601e18a44f9	4d8bdb1b-579b-4d1b-a590-dc1e9d060dc8	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	2026-09-08 12:53:17.792+00	\N	\N	\N	\N	2026-09-08 12:53:17.893263+00	2026-09-08 12:53:17.893263+00
94d3cfd6-7ab1-4e4c-8b48-c3464a0139b8	6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	2026-09-08 14:10:58.121+00	\N	\N	\N	\N	2026-09-08 14:10:58.235929+00	2026-09-08 14:10:58.235929+00
3e2d9064-2917-4e7d-8d9b-75421b204d6d	6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	2026-09-08 14:11:20.854+00	\N	\N	\N	\N	2026-09-08 14:11:20.969375+00	2026-09-08 14:11:20.969375+00
18daf3c5-c458-4389-a4c3-7cb75332eaee	4d8bdb1b-579b-4d1b-a590-dc1e9d060dc8	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	2026-09-08 15:03:12.389+00	2026-09-08 15:04:02.715+00	12	12	50	2026-09-08 15:03:12.441888+00	2026-09-08 15:03:12.441888+00
22586db9-5add-4ea5-ab95-52fac5fdc437	6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0	2c919628-836c-4d18-abc9-2def9e21573a	2026-09-09 09:15:39.977+00	2026-09-09 09:16:02.818+00	11	11	23	2026-09-09 09:15:40.027326+00	2026-09-09 09:15:40.027326+00
3e40904d-7037-41a5-8bdd-0d5b27e78a8b	6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	2026-09-10 12:34:17.884+00	2026-09-10 12:34:54.515+00	11	11	37	2026-09-10 12:34:18.071662+00	2026-09-10 12:34:18.071662+00
259bcb9a-eec9-49a1-ae73-bd34601b7800	6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	2026-09-10 12:38:35.619+00	2026-09-10 12:38:40.236+00	0	11	5	2026-09-10 12:38:35.70192+00	2026-09-10 12:38:35.70192+00
\.


--
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assignments (id, lesson_id, title, instructions, max_score, created_at, updated_at, time_limit_seconds, passing_score_percent, max_attempts, due_days_after_start) FROM stdin;
4d8bdb1b-579b-4d1b-a590-dc1e9d060dc8	c4884aea-3279-4c09-a05a-82ad980e3ae0	Nav-Assignment	Don't use AI	100	2026-09-06 13:02:50.093251+00	2026-09-08 14:06:25.957515+00	1200	75	0	30
6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0	b7304d3b-6618-4cd4-b52f-8d8ce583244a	Assignment 01	No cheating	100	2026-09-05 11:19:14.20073+00	2026-09-08 14:10:41.455043+00	120	75	0	1
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, user_id, action, resource_type, resource_id, ip_address, user_agent, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: cash_conversion_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cash_conversion_requests (id, user_id, points_requested, inr_amount, points_per_rupee, status, student_notes, admin_notes, processed_at, processed_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, slug, description, thumbnail_url, sort_order, is_active) FROM stdin;
98a0f515-69db-4557-b50b-e948af329998	USPC	uspc-2026	This is test category	\N	1	t
9c950693-2835-4088-8fdb-ae651820e3c0	Navigation	navigation-2026-2027	\N	\N	2	t
615e7731-be3c-49d1-bf65-fcb6a4b92a42	SSC	ssc-2026	\N	\N	2	t
\.


--
-- Data for Name: chapter_starts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chapter_starts (id, student_id, chapter_id, started_at, created_at) FROM stdin;
51be0764-dbc7-43c6-aee8-448bc83cafaa	282b8c30-e2aa-4696-b153-76d7450e168a	629fe62d-64a0-40c6-b2cc-46a5eff84c85	2026-09-05 11:23:17.689685+00	2026-09-05 11:23:17.689685+00
be2ef41a-a4f1-4fa1-afa0-e880b2cf3c5a	282b8c30-e2aa-4696-b153-76d7450e168a	d57a0791-d98b-43ec-b40c-dcc68959488f	2026-09-05 11:23:49.409895+00	2026-09-05 11:23:49.409895+00
f255575c-4935-446d-8815-a4ea249cfad2	282b8c30-e2aa-4696-b153-76d7450e168a	e4d45eb4-e03e-43e2-a580-59a376fdabca	2026-09-05 11:34:45.745034+00	2026-09-05 11:34:45.745034+00
d5c61686-461b-46d5-a506-48147bd955c6	b2dee688-c16e-440c-8580-ded0d2be8732	629fe62d-64a0-40c6-b2cc-46a5eff84c85	2026-09-05 13:38:16.553247+00	2026-09-05 13:38:16.553247+00
679ae356-ddbc-49ff-b32d-a950a25ae7cc	b2dee688-c16e-440c-8580-ded0d2be8732	d57a0791-d98b-43ec-b40c-dcc68959488f	2026-09-05 13:39:47.305326+00	2026-09-05 13:39:47.305326+00
b1f2132c-8115-4ef4-a052-3cd1b8c8924e	b2dee688-c16e-440c-8580-ded0d2be8732	e4d45eb4-e03e-43e2-a580-59a376fdabca	2026-09-05 13:53:01.402017+00	2026-09-05 13:53:01.402017+00
32fded0d-2401-423e-a3ea-974d04e91f3e	357e5c5e-a846-4a20-8c3b-67c23f280dbd	629fe62d-64a0-40c6-b2cc-46a5eff84c85	2026-09-05 14:19:27.611889+00	2026-09-05 14:19:27.611889+00
d04dd3a7-8950-46ee-aaa6-7c7d9a1295cf	357e5c5e-a846-4a20-8c3b-67c23f280dbd	d57a0791-d98b-43ec-b40c-dcc68959488f	2026-09-05 14:20:04.081024+00	2026-09-05 14:20:04.081024+00
14312f1f-55c7-4def-8aa9-408002d9dbfe	e30e15fe-0f2d-4b6c-85d6-1e0e09b0b4d6	629fe62d-64a0-40c6-b2cc-46a5eff84c85	2026-09-05 15:35:57.48411+00	2026-09-05 15:35:57.48411+00
8816d3be-dcd2-4b4c-badb-ed1f1ca4deaa	e30e15fe-0f2d-4b6c-85d6-1e0e09b0b4d6	d57a0791-d98b-43ec-b40c-dcc68959488f	2026-09-05 15:36:22.438011+00	2026-09-05 15:36:22.438011+00
9ab6076d-2e63-4dcc-92f6-1b277e4aabf0	e30e15fe-0f2d-4b6c-85d6-1e0e09b0b4d6	e4d45eb4-e03e-43e2-a580-59a376fdabca	2026-09-05 15:38:32.053868+00	2026-09-05 15:38:32.053868+00
d062b435-db4e-4efb-b679-d35ffc691a43	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	629fe62d-64a0-40c6-b2cc-46a5eff84c85	2026-09-06 10:57:44.86843+00	2026-09-06 10:57:44.86843+00
f8186eb7-09b9-435a-8314-4f6c7e403a96	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	d57a0791-d98b-43ec-b40c-dcc68959488f	2026-09-06 10:59:58.357671+00	2026-09-06 10:59:58.357671+00
d02c036f-8dd7-4264-8f29-f64b91173fb4	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	ab7ae40b-4edb-47e4-8203-7f9670e7736f	2026-09-06 13:11:45.805213+00	2026-09-06 13:11:45.805213+00
7749bc14-1731-4a12-880d-02025d05b723	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	8850f799-f86c-4aa0-9cc1-f2c210e7d8b0	2026-09-06 13:12:11.505328+00	2026-09-06 13:12:11.505328+00
b9886252-8fe6-458b-a868-db6fb8732490	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	e4d45eb4-e03e-43e2-a580-59a376fdabca	2026-09-08 12:57:35.234138+00	2026-09-08 12:57:35.234138+00
a96c3add-1daa-44e9-b612-410b8d2ad36f	2c919628-836c-4d18-abc9-2def9e21573a	629fe62d-64a0-40c6-b2cc-46a5eff84c85	2026-09-09 09:06:17.049436+00	2026-09-09 09:06:17.049436+00
0b39230a-5b50-4b4a-9f33-7374334b7e0d	2c919628-836c-4d18-abc9-2def9e21573a	d57a0791-d98b-43ec-b40c-dcc68959488f	2026-09-09 09:13:39.962116+00	2026-09-09 09:13:39.962116+00
3be2fd6e-084a-45d7-b128-7d2e4d031b66	2c919628-836c-4d18-abc9-2def9e21573a	e4d45eb4-e03e-43e2-a580-59a376fdabca	2026-09-09 09:17:11.260502+00	2026-09-09 09:17:11.260502+00
6fcc8f3c-2fe3-470a-b8d3-2776ba7a1252	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	629fe62d-64a0-40c6-b2cc-46a5eff84c85	2026-09-10 12:29:54.897011+00	2026-09-10 12:29:54.897011+00
b739090f-af31-4340-a3dc-d94919ac9453	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	d57a0791-d98b-43ec-b40c-dcc68959488f	2026-09-10 12:33:08.708208+00	2026-09-10 12:33:08.708208+00
8012eee8-9610-4b29-a1c3-116a6d3d5806	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	e4d45eb4-e03e-43e2-a580-59a376fdabca	2026-09-10 12:39:02.907082+00	2026-09-10 12:39:02.907082+00
\.


--
-- Data for Name: chapters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chapters (id, course_id, title, description, sort_order, is_published, created_at, updated_at) FROM stdin;
629fe62d-64a0-40c6-b2cc-46a5eff84c85	b8434539-78f9-4e76-b6a7-d002cc006640	Introduction Session	This is introduction session	1	t	2026-09-05 11:05:56.157265+00	2026-09-05 11:05:56.157265+00
d57a0791-d98b-43ec-b40c-dcc68959488f	b8434539-78f9-4e76-b6a7-d002cc006640	Core learning	\N	2	t	2026-09-05 11:06:07.857746+00	2026-09-05 11:06:07.857746+00
e4d45eb4-e03e-43e2-a580-59a376fdabca	b8434539-78f9-4e76-b6a7-d002cc006640	Assignments	A test description is a clear statement that explains what a specific test checks, how it works, and what result it expects to get.Key ElementsObjective: What the test is trying to prove or check.Input/Action: The steps or data used to run the test.Expected Result: The exact outcome that should happen if the test passes.According to a consensus on The Club by the Ministry of Testing, a test acts as a check to see if a product or system meets its required conditions. Good descriptions read like simple sentences using words like "should" or "must" to define expected behavior. [1] (https://guilhermesimoes.github.io/blog/writing-good-test-descriptions), [2] (https://club.ministryoftesting.com/t/what-are-the-definitions-of-a-test/82197)If you'd like, let me know:Is this a software test description, an educational test, or something else?What system or feature are you trying to describe?I can help you write a clear test description.	3	t	2026-09-05 11:06:15.924807+00	2026-09-05 11:07:01.750837+00
ab7ae40b-4edb-47e4-8203-7f9670e7736f	17f620f4-ff2a-4c63-b63b-f9bc920c99ca	Chapter-1	\N	1	t	2026-09-06 12:54:12.724149+00	2026-09-06 12:54:12.724149+00
8850f799-f86c-4aa0-9cc1-f2c210e7d8b0	17f620f4-ff2a-4c63-b63b-f9bc920c99ca	Videos Sessions	\N	2	t	2026-09-06 12:56:24.972356+00	2026-09-06 12:56:24.972356+00
\.


--
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.coupons (id, code, discount_percentage, applicable_user_id, max_uses, times_used, is_active, valid_until, created_at) FROM stdin;
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.courses (id, category_id, title, slug, description, thumbnail_url, price, discount_price, status, created_by, published_at, created_at, updated_at) FROM stdin;
b8434539-78f9-4e76-b6a7-d002cc006640	98a0f515-69db-4557-b50b-e948af329998	Testing-Phase-I	testing-phase-i	The Aviation Course is designed to provide students with a strong understanding of the aviation and airline industry. It covers key areas such as airport operations, passenger handling, airline management, aviation safety, customer service, and basic industry procedures. The course helps students develop practical skills, professional communication, and industry knowledge needed to pursue exciting career opportunities in aviation and airport services.	https://emoqhomxasfusolkppzr.supabase.co/storage/v1/object/public/course-media/courses/b8434539-78f9-4e76-b6a7-d002cc006640/thumbnail.jpeg?v=1788606290508	999.00	499.00	published	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-05 11:02:50.183+00	2026-09-05 11:02:32.770246+00	2026-09-10 12:02:08.917901+00
17f620f4-ff2a-4c63-b63b-f9bc920c99ca	9c950693-2835-4088-8fdb-ae651820e3c0	Navigation-Part-I	navigation-part-i	<h3>📰 Today’s Top News — 11 Sept 2026</h3><p><strong>🇮🇳 BRICS Summit:</strong> New Delhi is under tight security as leaders arrive for the BRICS summit, with major traffic restrictions across the capital.</p><p><strong>📉 Indian Markets:</strong> Sensex and Nifty fell sharply as escalating Middle East tensions pushed crude oil above <strong>$108/barrel</strong>.</p><p><strong>💱 Rupee Under Pressure:</strong> The rupee weakened amid surging oil prices and rising US yields, with the RBI reportedly intervening to support the currency.</p>	https://emoqhomxasfusolkppzr.supabase.co/storage/v1/object/public/course-media/courses/17f620f4-ff2a-4c63-b63b-f9bc920c99ca/thumbnail.jpeg?v=1788875344430	20000.00	15000.00	published	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-06 13:10:48.927+00	2026-09-06 12:52:19.604544+00	2026-09-11 06:51:50.911478+00
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.devices (id, user_id, device_fingerprint, device_name, platform, last_active_at, created_at) FROM stdin;
b138ede6-c3b5-42eb-993c-73fc0ac84329	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUzYWM3YWM2LWUzZDQtNDQ5NS04MmNlLWM5Y2Q2NDUxYmYzYyIsImVtYWlsIjoibHVjazI4a3VkaWRhQGF0b21pY21haWwuaW8iLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc4OTA0MTQ3NiwiZXhwIjoxNzkxNjMzNDc2fQ.HJq_-l6tOI8EF2IKzWFpIU7EC2yLxbvGC5j20FPW16A	unknown	web	2026-09-10 11:57:56.789318+00	2026-09-10 11:57:56.789318+00
ab43eb96-4d5c-4eba-ba4b-b1879c0969c5	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUzYWM3YWM2LWUzZDQtNDQ5NS04MmNlLWM5Y2Q2NDUxYmYzYyIsImVtYWlsIjoibHVjazI4a3VkaWRhQGF0b21pY21haWwuaW8iLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc4OTEwNzU2MCwiZXhwIjoxNzkxNjk5NTYwfQ.d3rZceI6HCjUtos1SjtybQ6CyxQeYxk2IT96by40w2M	unknown	web	2026-09-11 06:19:21.021907+00	2026-09-11 06:19:21.021907+00
d685c14a-6b9a-4fc2-a197-285cb20c412c	c7412dd5-8f70-4716-aa60-ac597baf36d7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM3NDEyZGQ1LThmNzAtNDcxNi1hYTYwLWFjNTk3YmFmMzZkNyIsImVtYWlsIjoidGVjaG5pY2FscGlsb3RAYXRvbWljbWFpbC5pbyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4OTEwOTE4NSwiZXhwIjoxNzkxNzAxMTg1fQ.tIzbv5gCPMEBMGuCahc5q238WHHFi-S8sgylV0yXdO8	unknown	web	2026-09-11 06:46:25.162644+00	2026-09-11 06:46:25.162644+00
654b8460-4f61-43f8-b6a0-df02d2516e59	ac16bf89-3b9f-4dff-9229-6ceea67c483c	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFjMTZiZjg5LTNiOWYtNGRmZi05MjI5LTZjZWVhNjdjNDgzYyIsImVtYWlsIjoidHBsbXMwM0BhdG9taWNtYWlsLmlvIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE3ODkxMDk1NDUsImV4cCI6MTc5MTcwMTU0NX0.VkuuB_9N_blmj4YqKX1tWfJW_HsRczgZZ-CfRCGQtHk	unknown	web	2026-09-11 06:52:25.706034+00	2026-09-11 06:52:25.706034+00
1c7f9550-098f-4dce-a17d-6d87ba4dd0c5	ac16bf89-3b9f-4dff-9229-6ceea67c483c	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFjMTZiZjg5LTNiOWYtNGRmZi05MjI5LTZjZWVhNjdjNDgzYyIsImVtYWlsIjoidHBsbXMwM0BhdG9taWNtYWlsLmlvIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE3ODkwMjQyMTYsImV4cCI6MTc5MTYxNjIxNn0.Rq7YQgpXgREAxAJUTmkegbWEzV-aH2x5gQ9p_uRVBdM	Web Browser	web	2026-09-10 07:10:17.291447+00	2026-09-10 07:10:17.291447+00
1383427a-45f8-4a38-bd1f-3cb017cdc281	8c8120cb-92f7-4e9e-95f8-1eea5821d3ef	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhjODEyMGNiLTkyZjctNGU5ZS05NWY4LTFlZWE1ODIxZDNlZiIsImVtYWlsIjoidHBsbXMwNEBhdG9taWNtYWlsLmlvIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE3ODkwMjQzNTMsImV4cCI6MTc5MTYxNjM1M30.e8XINhn6ETqPUaO6KYGFLRCpdNL6uwZF8IhjAe2YOf4	Web Browser	web	2026-09-10 07:12:34.069709+00	2026-09-10 07:12:34.069709+00
7f2bb2ee-d97d-4203-a89f-781cedb39800	8c8120cb-92f7-4e9e-95f8-1eea5821d3ef	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhjODEyMGNiLTkyZjctNGU5ZS05NWY4LTFlZWE1ODIxZDNlZiIsImVtYWlsIjoidHBsbXMwNEBhdG9taWNtYWlsLmlvIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE3ODkwMjQzODQsImV4cCI6MTc5MTYxNjM4NH0.HmjxKiWI9Ej4v8qctwso32QkxEMyxxPIwGv74e5bqgY	unknown	web	2026-09-10 07:13:04.957222+00	2026-09-10 07:13:04.957222+00
4b55ce44-75a9-4d90-9a32-a938ae732922	439195c5-3e21-4eb6-b8fc-58a86ea95882	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQzOTE5NWM1LTNlMjEtNGViNi1iOGZjLTU4YTg2ZWE5NTg4MiIsImVtYWlsIjoidHBsbXMwNUBhdG9taWNtYWlsLmlvIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE3ODkwMjQ1MDAsImV4cCI6MTc5MTYxNjUwMH0.RJdCMvi9_W2geoejsedcZ6iUAwV04YZOaqrumA8kLsg	Web Browser	web	2026-09-10 07:15:00.934067+00	2026-09-10 07:15:00.934067+00
eebe87f3-2d8d-4bf3-abf6-2537fe96fc88	439195c5-3e21-4eb6-b8fc-58a86ea95882	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQzOTE5NWM1LTNlMjEtNGViNi1iOGZjLTU4YTg2ZWE5NTg4MiIsImVtYWlsIjoidHBsbXMwNUBhdG9taWNtYWlsLmlvIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE3ODkwMjQ1MTcsImV4cCI6MTc5MTYxNjUxN30.nbSFzSitGxgRADfWm-QuPHUy0ySFvhajZFD6JxHZdiI	unknown	web	2026-09-10 07:15:17.314783+00	2026-09-10 07:15:17.314783+00
\.


--
-- Data for Name: doubt_bookings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doubt_bookings (id, slot_id, student_id, status, booked_at, cancelled_at, meeting_link, updated_at) FROM stdin;
\.


--
-- Data for Name: doubt_slots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doubt_slots (id, created_by, date, start_time, end_time, duration_minutes, max_bookings, current_bookings, status, updated_at, created_at, topic, description, meeting_link, target_type, course_id, student_id) FROM stdin;
2bab2a83-0dc1-420a-ba3b-3cbdecbe1543	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-11	13:00:00	14:00:00	60	1	0	available	2026-09-11 06:54:22.89377+00	2026-09-11 06:54:22.89377+00	Chapter-1	This is a test doubt session	http://localhost:3000	course	17f620f4-ff2a-4c63-b63b-f9bc920c99ca	\N
e9c1ee62-8709-4694-96ae-0edc68cb1f6b	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-11	13:00:00	14:00:00	60	1	0	available	2026-09-11 06:55:08.249367+00	2026-09-11 06:55:08.249367+00	Chapter-1	This is a test doubt session.	http://localhost:3000	course	17f620f4-ff2a-4c63-b63b-f9bc920c99ca	\N
\.


--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enrollments (id, student_id, course_id, enrolled_at, status, completed_at, updated_at) FROM stdin;
42e4c36d-3a76-4632-a7a4-2d938dadbdb0	2c919628-836c-4d18-abc9-2def9e21573a	b8434539-78f9-4e76-b6a7-d002cc006640	2026-09-09 09:05:14.666+00	completed	2026-09-09 09:17:55.051+00	2026-09-09 09:17:55.102062+00
c6d46e52-297e-4dab-8501-7387b118573a	2c919628-836c-4d18-abc9-2def9e21573a	17f620f4-ff2a-4c63-b63b-f9bc920c99ca	2026-09-09 11:46:36.125+00	active	\N	2026-09-09 11:46:36.354939+00
287e152a-48ed-4080-aa26-d4e6a9cd1158	439195c5-3e21-4eb6-b8fc-58a86ea95882	b8434539-78f9-4e76-b6a7-d002cc006640	2026-09-10 08:27:21.765+00	active	\N	2026-09-10 08:27:21.818151+00
bd53a2eb-b80e-40bd-a847-fe350213110a	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	b8434539-78f9-4e76-b6a7-d002cc006640	2026-09-10 12:07:01.467+00	active	\N	2026-09-10 12:39:22.397674+00
edb2e23d-7761-4098-9c01-edaa08291e32	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	17f620f4-ff2a-4c63-b63b-f9bc920c99ca	2026-09-10 14:14:04.049+00	active	\N	2026-09-10 14:14:04.143668+00
4c4d6bed-f7f2-472b-9e35-2d515db672c9	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	17f620f4-ff2a-4c63-b63b-f9bc920c99ca	2026-09-06 13:11:36.47+00	completed	2026-09-08 15:05:06.047+00	2026-09-08 15:05:06.097318+00
cb016fd4-e073-46c0-9647-c78fa4b451f0	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	b8434539-78f9-4e76-b6a7-d002cc006640	2026-09-06 10:53:20.714+00	completed	2026-09-09 05:20:01.227+00	2026-09-09 05:20:01.281803+00
\.


--
-- Data for Name: lessons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lessons (id, chapter_id, title, description, lesson_type, sort_order, is_published, duration_seconds, created_at, updated_at) FROM stdin;
57777e9a-c3e8-448d-a691-75adca51cd93	629fe62d-64a0-40c6-b2cc-46a5eff84c85	Introduction	\N	pdf	1	t	\N	2026-09-05 11:07:33.233983+00	2026-09-05 11:07:33.233983+00
597ccd87-b524-4446-a648-e397ab4fffaf	d57a0791-d98b-43ec-b40c-dcc68959488f	Video-2	\N	video	2	t	\N	2026-09-05 11:09:23.64506+00	2026-09-05 11:10:15.789711+00
4827d058-7606-4146-bea2-bc391b05a85c	d57a0791-d98b-43ec-b40c-dcc68959488f	Video-1	\N	video	1	t	\N	2026-09-05 11:08:04.785731+00	2026-09-05 11:10:15.805647+00
e82d3a0d-ff5b-4551-a376-1777f9f98c72	e4d45eb4-e03e-43e2-a580-59a376fdabca	Final Test	\N	test	1	t	\N	2026-09-05 11:16:52.33653+00	2026-09-05 11:16:52.33653+00
b7304d3b-6618-4cd4-b52f-8d8ce583244a	d57a0791-d98b-43ec-b40c-dcc68959488f	Assignment 01	\N	assignment	3	t	\N	2026-09-05 11:18:55.182407+00	2026-09-05 11:18:55.182407+00
6df80b8e-e552-4834-95a4-2c7c400435cb	ab7ae40b-4edb-47e4-8203-7f9670e7736f	Introduction to Navigations	\N	pdf	1	t	\N	2026-09-06 12:56:01.008202+00	2026-09-06 12:56:01.008202+00
c4884aea-3279-4c09-a05a-82ad980e3ae0	8850f799-f86c-4aa0-9cc1-f2c210e7d8b0	Nav-Assignment	\N	assignment	3	t	\N	2026-09-06 13:00:17.108453+00	2026-09-06 13:00:17.108453+00
decf63f1-f42d-48a4-b0cd-9d0f05971a7a	8850f799-f86c-4aa0-9cc1-f2c210e7d8b0	NAV-Vid-1	<p><strong>Important:</strong> the product UI above is not the exact configuration I recommend; the exact best-value model is the <strong>ASUS Gaming V16 V3607VM-RP057WS</strong> below.</p><p><strong>ASUS Gaming V16 V3607VM-RP057WS</strong></p><ul class="list-disc list-outside ml-4 space-y-1"><li><p><strong>₹1,09,990</strong> on ASUS India</p></li><li><p><strong>Intel Core 7 240H</strong> — 10 cores / 16 threads, up to 5.2 GHz</p></li><li><p><strong>RTX 5060 Laptop GPU, 8GB GDDR7</strong></p></li><li><p><strong>16GB DDR5-5600</strong>, upgradeable to <strong>32GB</strong></p></li><li><p>512GB PCIe 4.0 SSD</p></li><li><p>16" 1920×1200 144Hz IPS</p></li><li><p>300 nits</p></li><li><p>1.95 kg</p></li><li><p>Windows 11 + Office Home 2024</p></li><li><p>63Wh battery</p></li><li><p>150W adapter</p></li></ul><p>ASUS itself currently lists it at <strong>₹1,09,990</strong> and shows it as an orderable product with free shipping; delivery eligibility is checked by entering the PIN code at checkout.</p>	video	1	t	\N	2026-09-06 12:57:21.700265+00	2026-09-07 14:41:08.236574+00
adaf23e3-ad60-417b-98b7-b63e7d9efe7c	8850f799-f86c-4aa0-9cc1-f2c210e7d8b0	NAV-Vid-1 Notes	<p>LMS stands for Learning Management System.</p><p>It is a software platform used to create, manage, and deliver online learning.</p><p>For example, a school or college might use an LMS to:</p><p>Share study materials and videos</p><p>Give assignments and quizzes</p><p>Track students’ progress</p><p>Conduct online classes</p><p>Manage grades and certificates</p><p>Examples: Moodle, Google Classroom, and Canvas.</p><p>In simple words, an LMS is like a digital classroom.</p>	pdf	2	t	\N	2026-09-06 12:58:13.736713+00	2026-09-08 02:10:39.148035+00
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, recipient_id, type, title, body, metadata, is_read, created_at) FROM stdin;
eee96e96-d5ab-4e67-995a-04807f5d39ec	2c919628-836c-4d18-abc9-2def9e21573a	doubt_session	Doubt Session: Navigation-Part-I (Chapter-1)	A doubt clearing session for "Navigation-Part-I" is scheduled on 2026-09-11 at 13:00. Book your slot now!	{}	f	2026-09-11 06:54:24.188361+00
103d325b-e4bd-4bf4-a8b5-324c672600b0	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	doubt_session	Doubt Session: Navigation-Part-I (Chapter-1)	A doubt clearing session for "Navigation-Part-I" is scheduled on 2026-09-11 at 13:00. Book your slot now!	{}	f	2026-09-11 06:54:24.188361+00
f4cf1860-9d89-4cf3-b158-22a7c648b65e	2c919628-836c-4d18-abc9-2def9e21573a	doubt_session	Doubt Session: Navigation-Part-I (Chapter-1)	A doubt clearing session for "Navigation-Part-I" is scheduled on 2026-09-11 at 13:00. Book your slot now!	{}	f	2026-09-11 06:55:09.708912+00
e409f2fe-7909-4d04-b0c0-4be1d208109f	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	doubt_session	Doubt Session: Navigation-Part-I (Chapter-1)	A doubt clearing session for "Navigation-Part-I" is scheduled on 2026-09-11 at 13:00. Book your slot now!	{}	f	2026-09-11 06:55:09.708912+00
0fb5a064-e81e-4dd1-a9a2-3a86343a8abc	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	query_reply	Reply to: This is a test message	Hello.!	{"query_id": "97e95d70-81b1-409d-8a75-c176181ded23"}	t	2026-09-06 12:35:17.966434+00
26de0a41-5ec0-435a-9d11-00792db7a9e1	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	query_reply	Reply to: Extra attempt request: Assignment 01	Approved. You have been granted 1 additional attempt.	{"query_id": "2a797c15-d7e6-4611-a837-a1902456a5df"}	t	2026-09-06 12:34:53.692829+00
53dec21c-cdc9-40b7-85fc-26fac7239056	c7412dd5-8f70-4716-aa60-ac597baf36d7	extra_attempt_request	Extra Attempt Request #Q-30317	Student requested an extra attempt for Assignment 01.	{"query_id": "2a797c15-d7e6-4611-a837-a1902456a5df", "student_id": "53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c", "query_number": "Q-30317"}	t	2026-09-06 11:20:14.436264+00
cb9a8b2e-9f9c-4bd1-b865-eeb14ad3b5fd	c7412dd5-8f70-4716-aa60-ac597baf36d7	student_query	New Student Query #Q-63994	Student: This is a test message	{"query_id": "97e95d70-81b1-409d-8a75-c176181ded23", "student_id": "53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c", "query_number": "Q-63994"}	t	2026-09-06 11:39:24.069831+00
80335092-1eaa-4270-8a95-a2f6cbad470d	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	doubt_session	Doubt Session: Testing-Phase-I (Chatper-1)	A doubt clearing session for "Testing-Phase-I" is scheduled on 2026-09-07 at 15:35. Book your slot now!	{}	t	2026-09-07 10:05:13.152155+00
e2611fa2-88e2-480a-a994-11a8fc33dcc1	c7412dd5-8f70-4716-aa60-ac597baf36d7	doubt_booking	New Doubt Session Booked	Student booked a session for 2026-09-07 at 15:35 (Chatper-1).	{"slot_id": "3292e001-7e4d-4f46-acfd-4c6b40b5cb0e", "booking_id": "6666de76-4c92-4a92-94cd-93b616e1eb0d", "student_id": "53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c"}	t	2026-09-07 10:06:08.967681+00
7496c737-bd66-4d34-93f9-de91394b6a01	c7412dd5-8f70-4716-aa60-ac597baf36d7	doubt_booking	New Doubt Session Booked	Student booked a session for 2026-09-07 at 15:35 (Chatper-1).	{"slot_id": "3292e001-7e4d-4f46-acfd-4c6b40b5cb0e", "booking_id": "abca2c02-8380-44d6-a600-d196fe3c1503", "student_id": "53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c"}	t	2026-09-07 10:05:46.041944+00
b35f386b-d818-4068-8afc-ac952549cfa8	c7412dd5-8f70-4716-aa60-ac597baf36d7	contact_inquiry	Contact Request #Q-87645	New Student (9898898998): Why my access is blocked.?	{"email": "hello@hello.com", "phone": "9898898998", "query_id": "352f4584-0a9f-45e6-a099-09c30f4fd59c", "query_number": "Q-87645"}	t	2026-09-07 14:12:43.816825+00
98295834-31b4-4fe4-8459-d836d6e96c92	c7412dd5-8f70-4716-aa60-ac597baf36d7	contact_inquiry	Contact Request #Q-27461	Ramu (8080908090): I'm unaware of this platform.	{"email": "ramu@test.com", "phone": "8080908090", "query_id": "a2abe9b6-c87c-4398-8d97-fcc62e6d2067", "query_number": "Q-27461"}	t	2026-09-07 17:35:00.321652+00
30f15a18-5d5b-4fac-bbfd-53318f3c30fd	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	announcement	hi	gi	{}	t	2026-09-09 05:25:24.71593+00
0d07a7f2-4530-45c8-9802-e98a50994872	2c919628-836c-4d18-abc9-2def9e21573a	doubt_session	Doubt Session: Navigation-Part-I (Navigation Chapter Queries)	A doubt clearing session for "Navigation-Part-I" is scheduled on 2026-09-10 at 18:15. Book your slot now!	{}	f	2026-09-10 12:43:12.131625+00
98af2ee9-4301-4626-b152-d6984a7df13b	8c8120cb-92f7-4e9e-95f8-1eea5821d3ef	doubt_session	Doubt Session: All students	A doubt clearing session is scheduled on 2026-09-10 at 18:16. Book your slot now!	{}	f	2026-09-10 12:44:54.187817+00
e5e2a582-5338-420a-9bc7-f02e2f2ce929	439195c5-3e21-4eb6-b8fc-58a86ea95882	doubt_session	Doubt Session: All students	A doubt clearing session is scheduled on 2026-09-10 at 18:16. Book your slot now!	{}	f	2026-09-10 12:44:54.187817+00
7bf74299-775f-4718-b2a3-8045e23f5f8b	2c919628-836c-4d18-abc9-2def9e21573a	doubt_session	Doubt Session: All students	A doubt clearing session is scheduled on 2026-09-10 at 18:16. Book your slot now!	{}	f	2026-09-10 12:44:54.187817+00
fda9fc44-fe27-4bfb-9893-f037d4391488	027fe0b1-5d20-4543-aa20-22843b83e39d	doubt_session	Doubt Session: All students	A doubt clearing session is scheduled on 2026-09-10 at 18:16. Book your slot now!	{}	f	2026-09-10 12:44:54.187817+00
23113a30-8bdf-4ac9-a21e-179b27762806	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	doubt_session	Doubt Session: All students	A doubt clearing session is scheduled on 2026-09-10 at 18:16. Book your slot now!	{}	t	2026-09-10 12:44:54.187817+00
d71bc249-fe93-41fd-8a8e-06e35e70a249	c7412dd5-8f70-4716-aa60-ac597baf36d7	doubt_booking	New Doubt Session Booked	Student booked a session for 2026-09-10 at 18:16 (All students).	{"slot_id": "e2d64b0e-eac2-4b66-b7d8-97b71c1213c6", "booking_id": "8e0fc13a-49cf-4a3b-b1ac-955cf3282978", "student_id": "53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c"}	f	2026-09-10 12:45:23.728567+00
a4df5fb1-7b63-4b43-b9f7-347b7d5bedc6	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	doubt_session	Doubt Session: All students	A doubt clearing session is scheduled on 2026-09-10 at 18:16. Book your slot now!	{}	t	2026-09-10 12:44:54.187817+00
528e9220-c4fb-412f-bcc0-5fd970c70523	027fe0b1-5d20-4543-aa20-22843b83e39d	contact_inquiry	Contact Request #Q-24964	Audit Test (+919876543210): Audit	{"email": "audit@example.com", "phone": "+919876543210", "query_id": "2a64e737-6809-4102-86e5-e127a808d0a0", "query_number": "Q-24964"}	f	2026-09-10 14:43:19.092967+00
8d53e713-9a91-4156-845a-668b1c932d02	c7412dd5-8f70-4716-aa60-ac597baf36d7	contact_inquiry	Contact Request #Q-24964	Audit Test (+919876543210): Audit	{"email": "audit@example.com", "phone": "+919876543210", "query_id": "2a64e737-6809-4102-86e5-e127a808d0a0", "query_number": "Q-24964"}	f	2026-09-10 14:43:19.092967+00
9fa71c3a-ca6e-4cc0-8ab4-8326d983472d	027fe0b1-5d20-4543-aa20-22843b83e39d	contact_inquiry	Contact Request #Q-57099	Auditor (+919876543210): Audit	{"email": "auditor@test.com", "phone": "+919876543210", "query_id": "84169f8d-d541-44d2-bc70-d2da426e44c8", "query_number": "Q-57099"}	f	2026-09-10 14:44:15.417251+00
e13b8bef-7831-4a2d-aa4a-98066b640534	c7412dd5-8f70-4716-aa60-ac597baf36d7	contact_inquiry	Contact Request #Q-57099	Auditor (+919876543210): Audit	{"email": "auditor@test.com", "phone": "+919876543210", "query_id": "84169f8d-d541-44d2-bc70-d2da426e44c8", "query_number": "Q-57099"}	f	2026-09-10 14:44:15.417251+00
9ca755d7-3c9c-4059-9bc2-db614ef0d266	ac16bf89-3b9f-4dff-9229-6ceea67c483c	doubt_session	Doubt Session: All students	A doubt clearing session is scheduled on 2026-09-10 at 18:16. Book your slot now!	{}	t	2026-09-10 12:44:54.187817+00
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, student_id, course_id, amount, discount_amount, razorpay_order_id, razorpay_payment_id, razorpay_signature, status, refund_reason, invoice_number, created_at, updated_at, coupon_code) FROM stdin;
bf7ac66d-2940-4abe-9b95-27765f7eafa9	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	b8434539-78f9-4e76-b6a7-d002cc006640	499.00	500.00	order_TYj0BiGHLmzXfH	pay_TYj0ayBHx69qro	d6813872c04bc29f000d97d3c561bf5afac23727d0adbdacd8d7a9e852dc89cf	completed	\N	INV-1788691956904-6EYR58	2026-09-06 10:52:36.966269+00	2026-09-06 10:53:20.646935+00	\N
b00a848a-1768-4e2a-a930-6b12337a8f95	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	17f620f4-ff2a-4c63-b63b-f9bc920c99ca	15000.00	5000.00	order_TYlMamX8voCK7b	pay_TYlMhpGuSePsA5	8be0d1c77fd0222a028da552263cb1aca428563ac518ecc4fabc16273549f554	completed	\N	INV-1788700272695-Z49TVZ	2026-09-06 13:11:12.756489+00	2026-09-06 13:11:36.418874+00	\N
acb9f99f-2a7f-45c5-bf82-58dd1b5ca243	2c919628-836c-4d18-abc9-2def9e21573a	b8434539-78f9-4e76-b6a7-d002cc006640	499.00	500.00	order_TZslWFBpLvZOWG	pay_TZsloRpQa2x0x6	2a7c42ea53c12a93858f1ac954c2f76e96aad1835481edcb0009152d12d36ffb	completed	\N	INV-1788944679951-O8SAA9	2026-09-09 09:04:40.003985+00	2026-09-09 09:05:14.60091+00	\N
6f681c41-fbe8-4f3c-8e0e-30f8f8687cc2	2c919628-836c-4d18-abc9-2def9e21573a	17f620f4-ff2a-4c63-b63b-f9bc920c99ca	15000.00	5000.00	order_TZvW4MNcDW4L4x	pay_TZvWGXpFmC9F6E	cad9773beb361949dc01bca2f4620e691d9be119a75ef3585a2c63b0ff8522c1	completed	\N	INV-1788954367252-HSQXGR	2026-09-09 11:46:07.340794+00	2026-09-09 11:46:36.048881+00	\N
d5c4c061-16df-470a-8943-2cda53e85442	439195c5-3e21-4eb6-b8fc-58a86ea95882	b8434539-78f9-4e76-b6a7-d002cc006640	499.00	500.00	order_TaGeV7nv5waoo9	pay_TaGes8NCas71po	e19c34ca69408d702e52e51da87dd519b5e075421e94e7305a2f37fee4f459b9	completed	\N	INV-1789028800081-PPZHO3	2026-09-10 08:26:40.150567+00	2026-09-10 08:27:21.689586+00	\N
4477372a-ff8b-4618-9de5-b503e48eb165	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	17f620f4-ff2a-4c63-b63b-f9bc920c99ca	15000.00	5000.00	order_TaKGP6UpIsAjcT	\N	\N	pending	\N	INV-1789041517859-831YKD	2026-09-10 11:58:37.955073+00	2026-09-10 11:58:37.955073+00	\N
8cb6a958-771b-4508-b94a-082feb4e45ff	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	b8434539-78f9-4e76-b6a7-d002cc006640	499.00	500.00	order_TaKOL0vlwgC3Uj	pay_TaKOwFrt8mydZg	6e29cefe5578c5e437251c0dd3900b3f92e3ad634390815f7312c131685e11f8	completed	\N	INV-1789041968459-1U9VQ4	2026-09-10 12:06:08.532594+00	2026-09-10 12:07:01.39473+00	\N
293c3553-4cae-4346-96a3-b2cdca22968f	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	17f620f4-ff2a-4c63-b63b-f9bc920c99ca	15000.00	5000.00	order_TaMYZCMjKhhXGt	pay_TaMZAXY98CCSOd	0e3a75b5fe4bd6e9e02815dd18d3658415803ee26e977cb909150db4eaab91ed	completed	\N	INV-1789049592671-U5BMX0	2026-09-10 14:13:12.775623+00	2026-09-10 14:14:03.939444+00	\N
\.


--
-- Data for Name: pdf_notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pdf_notes (id, lesson_id, file_path, file_size_bytes, page_count, created_at, updated_at) FROM stdin;
37c5b8ad-9a4f-4ee2-aead-8f6f67b87cf5	57777e9a-c3e8-448d-a691-75adca51cd93	testing-phase-i/introduction-session/introduction.pdf	13264	\N	2026-09-05 11:07:34.8372+00	2026-09-05 11:07:34.8372+00
36dfe604-e3a6-4be5-a013-b23a97112479	6df80b8e-e552-4834-95a4-2c7c400435cb	navigation-part-i/chapter-1/introduction-to-navigations.pdf	160436	\N	2026-09-06 12:56:04.501963+00	2026-09-06 12:56:04.501963+00
d7b4efd4-f647-481d-97f7-208ea66e74aa	adaf23e3-ad60-417b-98b7-b63e7d9efe7c	navigation-part-i/videos-sessions/nav-vid-1-notes.pdf	18810	\N	2026-09-06 12:58:16.559872+00	2026-09-06 12:58:16.559872+00
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profiles (id, email, role, full_name, phone, avatar_url, is_active, created_at, updated_at, referral_code, referred_by) FROM stdin;
ac16bf89-3b9f-4dff-9229-6ceea67c483c	tplms03@atomicmail.io	student	Technical Pilot 03	9889097898	\N	t	2026-09-10 07:09:49.675676+00	2026-09-11 07:31:48.159175+00	TPKDZLV2	\N
8c8120cb-92f7-4e9e-95f8-1eea5821d3ef	tplms04@atomicmail.io	student	Technical Pilot 04	9809909809	\N	t	2026-09-10 07:11:49.45116+00	2026-09-11 07:31:48.159175+00	TPPU7PPJ	\N
439195c5-3e21-4eb6-b8fc-58a86ea95882	tplms05@atomicmail.io	student	Qwerty@1	9889988899	\N	t	2026-09-10 07:13:38.858581+00	2026-09-11 07:31:48.159175+00	TPNLA96B	\N
027fe0b1-5d20-4543-aa20-22843b83e39d	tplms02@atomicmail.io	sub_admin	Technical Pilot 02	9889878909	\N	t	2026-09-10 07:08:15.433687+00	2026-09-11 07:31:48.159175+00	TPFQPUQF	\N
c7412dd5-8f70-4716-aa60-ac597baf36d7	technicalpilot@atomicmail.io	admin	Admin LMS	9876543210	\N	t	2026-08-23 13:01:58.216853+00	2026-09-11 07:31:48.159175+00	TPCYPYCN	\N
53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	luck28kudida@atomicmail.io	student	Student	9898656598	\N	t	2026-09-06 10:24:24.756663+00	2026-09-11 07:31:48.159175+00	TPUKP29D	\N
2c919628-836c-4d18-abc9-2def9e21573a	mohan819.tp@gmail.com	student	Mohan	9878767898	https://lh3.googleusercontent.com/a/ACg8ocJbq4bwrWsjaBn_HPrZk1KTYdsZr-LkD2EPcAFL4PO1N_yQLQ=s96-c	t	2026-09-09 05:22:23.5441+00	2026-09-11 07:31:48.159175+00	TPU6W94A	\N
b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	tplms01@atomicmail.io	student	Technical Pilot 01	9898878776	\N	t	2026-09-10 06:57:24.4559+00	2026-09-11 07:31:48.159175+00	TP4G72HX	\N
\.


--
-- Data for Name: progress; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.progress (id, student_id, lesson_id, status, progress_percent, last_position_seconds, completed_at, updated_at) FROM stdin;
c974554e-93c6-4bd2-a6e9-67b198800ab1	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	6df80b8e-e552-4834-95a4-2c7c400435cb	completed	100	0	2026-09-06 13:11:54.961+00	2026-09-06 13:11:55.012235+00
2931cae6-4f0f-4dc8-88aa-d89c562e74c5	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	4827d058-7606-4146-bea2-bc391b05a85c	completed	100	11	2026-09-10 12:33:42.522+00	2026-09-10 12:33:42.676787+00
5ac066bc-553a-4a75-9814-1240468f3f32	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	c4884aea-3279-4c09-a05a-82ad980e3ae0	completed	100	0	2026-09-08 15:04:06.471+00	2026-09-08 15:04:06.522456+00
ccba6ad7-defe-4d50-98ee-bafcb9fee440	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	adaf23e3-ad60-417b-98b7-b63e7d9efe7c	completed	100	0	2026-09-08 15:05:05.619+00	2026-09-08 15:05:05.68238+00
b7193b64-ad1e-4e75-acb4-7a798bf5f74f	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	e82d3a0d-ff5b-4551-a376-1777f9f98c72	completed	100	0	2026-09-09 05:20:03.59+00	2026-09-09 05:20:03.681748+00
3336b29a-8c61-4e53-b3ae-060159cbdf47	2c919628-836c-4d18-abc9-2def9e21573a	57777e9a-c3e8-448d-a691-75adca51cd93	completed	100	0	2026-09-09 09:06:37.853+00	2026-09-09 09:06:37.901026+00
76f89fc0-755a-44da-abcd-85ccbf0f5c61	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	b7304d3b-6618-4cd4-b52f-8d8ce583244a	completed	100	0	2026-09-07 09:53:29.851+00	2026-09-07 09:53:30.038043+00
6f3bc546-b7c7-40b5-9628-e300394caf08	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	57777e9a-c3e8-448d-a691-75adca51cd93	completed	100	0	2026-09-06 10:59:20.88+00	2026-09-06 10:59:20.966065+00
87e5f941-f466-4e1b-96f0-34d9bd5e9d74	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	4827d058-7606-4146-bea2-bc391b05a85c	completed	100	11	2026-09-08 12:52:09.605+00	2026-09-08 12:52:09.713554+00
6d7b5e30-ca82-457d-ba3f-0719c5a1cafc	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	b7304d3b-6618-4cd4-b52f-8d8ce583244a	completed	100	0	2026-09-10 12:38:42.265+00	2026-09-10 12:38:42.318696+00
14a66eee-8bb7-49d7-b2e3-6f273ad472a3	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	e82d3a0d-ff5b-4551-a376-1777f9f98c72	in_progress	0	0	\N	2026-09-10 12:39:21.865134+00
d6a0c04f-5416-4f54-b95e-67a74a03f567	2c919628-836c-4d18-abc9-2def9e21573a	4827d058-7606-4146-bea2-bc391b05a85c	completed	100	11	2026-09-09 09:14:33.017+00	2026-09-09 09:14:33.066238+00
a0db5de0-affd-4667-bba6-a7e3100d3f0b	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	597ccd87-b524-4446-a648-e397ab4fffaf	completed	100	11	2026-09-11 06:51:56.473+00	2026-09-11 06:51:56.62352+00
0cb33985-b339-4d32-8abd-57712be35eca	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	decf63f1-f42d-48a4-b0cd-9d0f05971a7a	completed	100	11	2026-09-11 06:23:33.871+00	2026-09-11 06:23:34.021062+00
a815b685-bb58-4bbf-92e2-7f90d9e65829	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	597ccd87-b524-4446-a648-e397ab4fffaf	completed	100	11	2026-09-11 06:24:40.031+00	2026-09-11 06:24:40.186153+00
a3719857-12e1-4aea-beb9-ba81aea6e2c4	2c919628-836c-4d18-abc9-2def9e21573a	597ccd87-b524-4446-a648-e397ab4fffaf	completed	100	11	2026-09-09 09:15:30.788+00	2026-09-09 09:15:30.836142+00
b91b8bb6-a8f7-4698-8dfc-3afbd3f00932	2c919628-836c-4d18-abc9-2def9e21573a	b7304d3b-6618-4cd4-b52f-8d8ce583244a	completed	100	0	2026-09-09 09:16:05.654+00	2026-09-09 09:16:05.706199+00
e870c071-2703-4eaa-91d8-848296d61817	2c919628-836c-4d18-abc9-2def9e21573a	e82d3a0d-ff5b-4551-a376-1777f9f98c72	completed	100	0	2026-09-09 09:17:56.095+00	2026-09-09 09:17:56.149196+00
31c90a55-719a-4f76-a4a8-b9bc71777fb8	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	57777e9a-c3e8-448d-a691-75adca51cd93	completed	100	0	2026-09-10 12:30:11.663+00	2026-09-10 12:30:11.741531+00
\.


--
-- Data for Name: question_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.question_options (id, question_id, option_text, is_correct, sort_order, created_at, updated_at) FROM stdin;
3c2dcade-e5d0-492c-ae9f-137504e2f5f6	cab5da0f-d2d6-48b5-96e4-8e7c12aa6b85	Atlantic Ocean	f	1	2026-09-05 11:19:22.715922+00	2026-09-05 11:19:22.715922+00
833ff5f4-f8a2-4313-ae69-81a06227c377	cab5da0f-d2d6-48b5-96e4-8e7c12aa6b85	Indian Ocean	f	2	2026-09-05 11:19:22.715922+00	2026-09-05 11:19:22.715922+00
d57ff595-756d-4b29-ad36-b337f54e3337	cab5da0f-d2d6-48b5-96e4-8e7c12aa6b85	Arctic Ocean	f	3	2026-09-05 11:19:22.715922+00	2026-09-05 11:19:22.715922+00
76e4f992-b232-40da-9d86-c39676a8dc74	cab5da0f-d2d6-48b5-96e4-8e7c12aa6b85	Pacific Ocean	t	4	2026-09-05 11:19:22.715922+00	2026-09-05 11:19:22.715922+00
e49d5f2d-89c9-4e09-89c2-95c0275c9de0	c7843572-832d-488b-9716-72da95e7a05f	Asia	t	1	2026-09-05 11:19:23.042927+00	2026-09-05 11:19:23.042927+00
dc951b57-5492-4996-84cc-76a906aece35	c7843572-832d-488b-9716-72da95e7a05f	Africa	t	2	2026-09-05 11:19:23.042927+00	2026-09-05 11:19:23.042927+00
3b612389-727c-4166-b66d-2f3e2f951158	c7843572-832d-488b-9716-72da95e7a05f	Europe	t	3	2026-09-05 11:19:23.042927+00	2026-09-05 11:19:23.042927+00
c09536ee-4d84-47f0-bea6-d7399edc7ebb	c7843572-832d-488b-9716-72da95e7a05f	Amazon	f	4	2026-09-05 11:19:23.042927+00	2026-09-05 11:19:23.042927+00
76ba5e4e-1ed7-407e-bf52-99dad811f47a	8a90113a-7744-491b-8ae8-587e3cf39b68	2	t	1	2026-09-05 11:19:23.558558+00	2026-09-05 11:19:23.558558+00
76d85922-3007-442a-90a3-4749f5be50c1	8a90113a-7744-491b-8ae8-587e3cf39b68	5	f	2	2026-09-05 11:19:23.558558+00	2026-09-05 11:19:23.558558+00
fb75cce3-38d9-4d7c-85dd-dd6aeb337c00	8a90113a-7744-491b-8ae8-587e3cf39b68	8	t	3	2026-09-05 11:19:23.558558+00	2026-09-05 11:19:23.558558+00
4a6e7d1a-2f1c-4b89-838b-b2fb665bfcca	8a90113a-7744-491b-8ae8-587e3cf39b68	11	f	4	2026-09-05 11:19:23.558558+00	2026-09-05 11:19:23.558558+00
d9a8c28c-51db-44c2-8fa7-65a213911ad4	ef3d7e2c-2442-411a-9755-4aeda126fa61	13	f	1	2026-09-05 11:19:23.884449+00	2026-09-05 11:19:23.884449+00
de9b6d07-d1da-4783-b9cf-678bb511014d	ef3d7e2c-2442-411a-9755-4aeda126fa61	20	f	2	2026-09-05 11:19:23.884449+00	2026-09-05 11:19:23.884449+00
ab259f7d-7d50-4120-a415-9ef80e1876a0	ef3d7e2c-2442-411a-9755-4aeda126fa61	30	t	3	2026-09-05 11:19:23.884449+00	2026-09-05 11:19:23.884449+00
e6f01b1c-a651-4932-a457-1f207385503a	ef3d7e2c-2442-411a-9755-4aeda126fa61	40	f	4	2026-09-05 11:19:23.884449+00	2026-09-05 11:19:23.884449+00
8e40afbd-5d6c-405a-b3ec-591692354180	18f8dec6-ee39-48e8-b86f-f72a16b8f164	Earth	f	1	2026-09-05 11:19:24.191238+00	2026-09-05 11:19:24.191238+00
8ffee2ad-af24-44a0-a15d-abc6ba64eb47	18f8dec6-ee39-48e8-b86f-f72a16b8f164	Mars	t	2	2026-09-05 11:19:24.191238+00	2026-09-05 11:19:24.191238+00
b767d507-d629-419e-ab37-8b06be8e291b	18f8dec6-ee39-48e8-b86f-f72a16b8f164	Jupiter	f	3	2026-09-05 11:19:24.191238+00	2026-09-05 11:19:24.191238+00
7eb0ed35-86dd-4313-9d0f-18d2f5bb3ccb	18f8dec6-ee39-48e8-b86f-f72a16b8f164	Venus	f	4	2026-09-05 11:19:24.191238+00	2026-09-05 11:19:24.191238+00
c29d229c-8470-4e5a-8bf8-cda297106f24	2de2a35a-0004-4a91-b9eb-063c19c2781c	Solid	t	1	2026-09-05 11:19:24.497518+00	2026-09-05 11:19:24.497518+00
60b1ab2b-8505-44a1-b38f-f585c29f051a	2de2a35a-0004-4a91-b9eb-063c19c2781c	Liquid	t	2	2026-09-05 11:19:24.497518+00	2026-09-05 11:19:24.497518+00
4c98a702-3420-4dd5-baca-bba3a79cba1d	2de2a35a-0004-4a91-b9eb-063c19c2781c	Gas	t	3	2026-09-05 11:19:24.497518+00	2026-09-05 11:19:24.497518+00
073955f6-326a-4d2d-89ee-bd6c476d8d52	2de2a35a-0004-4a91-b9eb-063c19c2781c	Wood	f	4	2026-09-05 11:19:24.497518+00	2026-09-05 11:19:24.497518+00
eacb5fe9-44e9-4043-a11e-d30f456c0eb4	f0e46421-2c0a-4350-9f36-1a6255379041	4	f	1	2026-09-05 11:19:25.155071+00	2026-09-05 11:19:25.155071+00
bcb8291d-3613-4377-916f-86c971a4fd5c	f0e46421-2c0a-4350-9f36-1a6255379041	6	f	2	2026-09-05 11:19:25.155071+00	2026-09-05 11:19:25.155071+00
80a2fbf6-6d40-4b42-89df-56b06e2aea85	f0e46421-2c0a-4350-9f36-1a6255379041	8	t	3	2026-09-05 11:19:25.155071+00	2026-09-05 11:19:25.155071+00
52038280-7ab0-4cba-b167-0d2074177b17	f0e46421-2c0a-4350-9f36-1a6255379041	10	f	4	2026-09-05 11:19:25.155071+00	2026-09-05 11:19:25.155071+00
794985b6-f885-4cd5-85c8-6951dbc97ab9	9a43bb41-73b9-4d00-908f-ab712619510a	Delhi	f	1	2026-09-05 11:19:51.643581+00	2026-09-05 11:19:51.643581+00
a5fae483-5697-4d16-8ec5-cfaa423316d9	9a43bb41-73b9-4d00-908f-ab712619510a	New York	f	2	2026-09-05 11:19:51.643581+00	2026-09-05 11:19:51.643581+00
310f04cd-7842-48da-92fe-89d5d44b3c6a	9a43bb41-73b9-4d00-908f-ab712619510a	Paris	t	3	2026-09-05 11:19:51.643581+00	2026-09-05 11:19:51.643581+00
46f222c2-4d33-42d0-af6f-588ab6822c90	9a43bb41-73b9-4d00-908f-ab712619510a	London	f	4	2026-09-05 11:19:51.643581+00	2026-09-05 11:19:51.643581+00
67bdb87a-e317-43f9-bfbf-1186147b02bc	cb41b946-0a52-41fb-80b0-ad706821db26	Atlantic Ocean	f	1	2026-09-05 11:19:51.943193+00	2026-09-05 11:19:51.943193+00
3114fbf4-7550-4ecd-8a11-75165186c6ab	cb41b946-0a52-41fb-80b0-ad706821db26	Indian Ocean	f	2	2026-09-05 11:19:51.943193+00	2026-09-05 11:19:51.943193+00
57e2041b-8eee-465f-830a-5f502f80ca3e	cb41b946-0a52-41fb-80b0-ad706821db26	Arctic Ocean	f	3	2026-09-05 11:19:51.943193+00	2026-09-05 11:19:51.943193+00
bb8cdedd-340b-4b02-bc23-06216af20d3b	cb41b946-0a52-41fb-80b0-ad706821db26	Pacific Ocean	t	4	2026-09-05 11:19:51.943193+00	2026-09-05 11:19:51.943193+00
7a88457e-5a38-4ac0-8330-29edb72c72a9	1d587a56-6aa5-450c-b698-97c4cb693357	Asia	t	1	2026-09-05 11:19:52.221988+00	2026-09-05 11:19:52.221988+00
87979854-c955-4216-8f71-ec85fc2ac4f6	1d587a56-6aa5-450c-b698-97c4cb693357	Africa	t	2	2026-09-05 11:19:52.221988+00	2026-09-05 11:19:52.221988+00
c297b4e4-c508-4c9c-8844-99839b715c81	1d587a56-6aa5-450c-b698-97c4cb693357	Europe	t	3	2026-09-05 11:19:52.221988+00	2026-09-05 11:19:52.221988+00
be52bdc4-c463-447d-b3b5-28939e43bbe5	1d587a56-6aa5-450c-b698-97c4cb693357	Amazon	f	4	2026-09-05 11:19:52.221988+00	2026-09-05 11:19:52.221988+00
3ff8fd29-0b79-4d5b-9cbd-0f90e0d871e0	36c1b110-8246-406b-9f84-73cc155bb257	2	t	1	2026-09-05 11:19:52.67947+00	2026-09-05 11:19:52.67947+00
94fb3284-0b43-411f-afd2-5d0438671464	36c1b110-8246-406b-9f84-73cc155bb257	5	f	2	2026-09-05 11:19:52.67947+00	2026-09-05 11:19:52.67947+00
8b094773-697b-4a5c-abba-d58513199276	36c1b110-8246-406b-9f84-73cc155bb257	8	t	3	2026-09-05 11:19:52.67947+00	2026-09-05 11:19:52.67947+00
de181b97-4303-4e18-bd95-232ac136f00b	36c1b110-8246-406b-9f84-73cc155bb257	11	f	4	2026-09-05 11:19:52.67947+00	2026-09-05 11:19:52.67947+00
2cc4d7ce-7736-43ff-8ef1-7be56fd0f463	c8fe27d4-edb8-4627-bf9b-77095753bcd2	13	f	1	2026-09-05 11:19:52.960109+00	2026-09-05 11:19:52.960109+00
e407e163-8362-4c24-b648-5cb027ab9c53	c8fe27d4-edb8-4627-bf9b-77095753bcd2	20	f	2	2026-09-05 11:19:52.960109+00	2026-09-05 11:19:52.960109+00
08ae02c7-b33a-40f9-bbe0-bc6eed26909d	c8fe27d4-edb8-4627-bf9b-77095753bcd2	30	t	3	2026-09-05 11:19:52.960109+00	2026-09-05 11:19:52.960109+00
46701023-677c-4b83-bd46-dd3a3d1d09b0	c8fe27d4-edb8-4627-bf9b-77095753bcd2	40	f	4	2026-09-05 11:19:52.960109+00	2026-09-05 11:19:52.960109+00
56b60a60-4967-44ea-9ba0-1fe51e00f0bd	0865b103-4e8a-4cc2-acbf-026f7482e56b	Earth	f	1	2026-09-05 11:19:53.239855+00	2026-09-05 11:19:53.239855+00
f6f1ad40-2d7d-4c48-a8b8-7e643e7c197e	0865b103-4e8a-4cc2-acbf-026f7482e56b	Mars	t	2	2026-09-05 11:19:53.239855+00	2026-09-05 11:19:53.239855+00
f7b62f7d-77ce-469a-9e53-e20c6560e029	0865b103-4e8a-4cc2-acbf-026f7482e56b	Jupiter	f	3	2026-09-05 11:19:53.239855+00	2026-09-05 11:19:53.239855+00
f8cc0a1b-b95d-4427-b193-7729443f045d	0865b103-4e8a-4cc2-acbf-026f7482e56b	Venus	f	4	2026-09-05 11:19:53.239855+00	2026-09-05 11:19:53.239855+00
882c784c-45be-4335-9c2c-c45de3333081	ecb41a27-6f6e-4816-be2b-daf6059473af	Solid	t	1	2026-09-05 11:19:53.528827+00	2026-09-05 11:19:53.528827+00
6b77ef7d-f5ea-4a1d-9925-64d053ae52a0	ecb41a27-6f6e-4816-be2b-daf6059473af	Liquid	t	2	2026-09-05 11:19:53.528827+00	2026-09-05 11:19:53.528827+00
fbcd6965-516a-451e-a934-7b0970f1a3ef	ecb41a27-6f6e-4816-be2b-daf6059473af	Gas	t	3	2026-09-05 11:19:53.528827+00	2026-09-05 11:19:53.528827+00
d18d5b56-7ab7-4a22-8277-16e50e4da28c	ecb41a27-6f6e-4816-be2b-daf6059473af	Wood	f	4	2026-09-05 11:19:53.528827+00	2026-09-05 11:19:53.528827+00
8dba1997-3635-4535-9e34-68889b0cc717	c5255c53-96c3-4e7a-94ed-19e72a9cc636	4	f	1	2026-09-05 11:19:53.991798+00	2026-09-05 11:19:53.991798+00
1204c8f8-4e03-43bf-897d-93328d23a9b4	c5255c53-96c3-4e7a-94ed-19e72a9cc636	6	f	2	2026-09-05 11:19:53.991798+00	2026-09-05 11:19:53.991798+00
36483da6-e7ce-4f6c-b5de-3bb39b3424e2	c5255c53-96c3-4e7a-94ed-19e72a9cc636	8	t	3	2026-09-05 11:19:53.991798+00	2026-09-05 11:19:53.991798+00
d6defa27-8adb-4ac7-a054-cc69c8a03a48	c5255c53-96c3-4e7a-94ed-19e72a9cc636	10	f	4	2026-09-05 11:19:53.991798+00	2026-09-05 11:19:53.991798+00
ba28b9ed-74fd-4540-80ab-2aa8f1573a64	ded771fc-dc86-47d0-9492-72c60784f9d6	Delhi	f	1	2026-09-06 13:10:20.118954+00	2026-09-06 13:10:20.118954+00
05452d28-a5b7-4c35-9651-b529719eb322	ded771fc-dc86-47d0-9492-72c60784f9d6	New York	f	2	2026-09-06 13:10:20.118954+00	2026-09-06 13:10:20.118954+00
3bd5bbd1-496f-412f-9dd0-6820253ebb23	ded771fc-dc86-47d0-9492-72c60784f9d6	Paris	t	3	2026-09-06 13:10:20.118954+00	2026-09-06 13:10:20.118954+00
4ee5c089-32be-4661-a4d9-ff7e6ebe38c0	ded771fc-dc86-47d0-9492-72c60784f9d6	London	f	4	2026-09-06 13:10:20.118954+00	2026-09-06 13:10:20.118954+00
9af923d2-888f-4d25-bea6-da96ebd1cfcd	cf0f1f2d-3be6-4e49-a2cb-11209f655bfe	Atlantic Ocean	f	1	2026-09-06 13:10:20.448225+00	2026-09-06 13:10:20.448225+00
d2736ece-cc65-4329-9a97-79bbe9aaed85	cf0f1f2d-3be6-4e49-a2cb-11209f655bfe	Indian Ocean	f	2	2026-09-06 13:10:20.448225+00	2026-09-06 13:10:20.448225+00
91f0c49e-b5e2-40a6-ae04-a98725c70287	cf0f1f2d-3be6-4e49-a2cb-11209f655bfe	Arctic Ocean	f	3	2026-09-06 13:10:20.448225+00	2026-09-06 13:10:20.448225+00
9c260cc0-0844-4d6c-ba76-92059f5160bc	cf0f1f2d-3be6-4e49-a2cb-11209f655bfe	Pacific Ocean	t	4	2026-09-06 13:10:20.448225+00	2026-09-06 13:10:20.448225+00
bc83e07a-9607-48e4-9e48-153bb09916f6	d13c05b9-738a-4a13-8be2-520c223fd8c0	Asia	t	1	2026-09-06 13:10:20.84346+00	2026-09-06 13:10:20.84346+00
7bce92ca-93e6-43f7-9a64-463922bf9785	d13c05b9-738a-4a13-8be2-520c223fd8c0	Africa	t	2	2026-09-06 13:10:20.84346+00	2026-09-06 13:10:20.84346+00
18cb0828-c026-4b38-99de-82d0bc4f3d65	d13c05b9-738a-4a13-8be2-520c223fd8c0	Europe	t	3	2026-09-06 13:10:20.84346+00	2026-09-06 13:10:20.84346+00
6c7d973e-7902-4f88-8de7-cb2affbf880e	d13c05b9-738a-4a13-8be2-520c223fd8c0	Amazon	f	4	2026-09-06 13:10:20.84346+00	2026-09-06 13:10:20.84346+00
b8986d1c-bd0f-41e5-acc4-fd39e4c92073	652bae52-f35e-47f3-89e4-9a72f783b3d6	2	t	1	2026-09-06 13:10:21.395197+00	2026-09-06 13:10:21.395197+00
42dd3779-fa0e-4c09-bdc4-d2cbed3c7f3a	652bae52-f35e-47f3-89e4-9a72f783b3d6	5	f	2	2026-09-06 13:10:21.395197+00	2026-09-06 13:10:21.395197+00
3a734537-039a-49f8-b59b-c5f50d7ff1ed	652bae52-f35e-47f3-89e4-9a72f783b3d6	8	t	3	2026-09-06 13:10:21.395197+00	2026-09-06 13:10:21.395197+00
17a2d86e-de7f-4270-a5cd-2c7b23c5748a	652bae52-f35e-47f3-89e4-9a72f783b3d6	11	f	4	2026-09-06 13:10:21.395197+00	2026-09-06 13:10:21.395197+00
65c58ff5-1c69-4e8d-94f5-ddfa02d22325	5d77990d-36a9-4b0e-8495-953cb10c1e55	13	f	1	2026-09-06 13:10:21.751232+00	2026-09-06 13:10:21.751232+00
3745d6fb-33a5-406d-9535-dce2a697c0bf	5d77990d-36a9-4b0e-8495-953cb10c1e55	20	f	2	2026-09-06 13:10:21.751232+00	2026-09-06 13:10:21.751232+00
d3c64549-39cf-4e8e-8388-57a768efb760	5d77990d-36a9-4b0e-8495-953cb10c1e55	30	t	3	2026-09-06 13:10:21.751232+00	2026-09-06 13:10:21.751232+00
fa3367dc-a9f0-445b-af26-99643a2ee7dd	5d77990d-36a9-4b0e-8495-953cb10c1e55	40	f	4	2026-09-06 13:10:21.751232+00	2026-09-06 13:10:21.751232+00
28d7a85a-c4d8-4b04-af5a-75da6ce50964	43e2e992-3c52-4123-b593-df7f2cae4123	Earth	f	1	2026-09-06 13:10:22.051304+00	2026-09-06 13:10:22.051304+00
d0da1494-017c-4471-832d-e15254db5b8f	43e2e992-3c52-4123-b593-df7f2cae4123	Mars	t	2	2026-09-06 13:10:22.051304+00	2026-09-06 13:10:22.051304+00
44702a68-b837-47c2-b17b-439849680efb	43e2e992-3c52-4123-b593-df7f2cae4123	Jupiter	f	3	2026-09-06 13:10:22.051304+00	2026-09-06 13:10:22.051304+00
6173a256-1d96-4a71-a8ac-f790cf526174	43e2e992-3c52-4123-b593-df7f2cae4123	Venus	f	4	2026-09-06 13:10:22.051304+00	2026-09-06 13:10:22.051304+00
793d04a5-e313-4783-9b95-f6eadb83a45f	33a1d7c5-a5b9-4469-9279-3e561b009f4d	Solid	t	1	2026-09-06 13:10:22.561321+00	2026-09-06 13:10:22.561321+00
ef1f4785-7abb-472b-a9e4-b9fe0b7ff2f9	33a1d7c5-a5b9-4469-9279-3e561b009f4d	Liquid	t	2	2026-09-06 13:10:22.561321+00	2026-09-06 13:10:22.561321+00
b5ff7b30-65f9-41f5-b298-3ae7b9ef6d9a	33a1d7c5-a5b9-4469-9279-3e561b009f4d	Gas	t	3	2026-09-06 13:10:22.561321+00	2026-09-06 13:10:22.561321+00
e20cb148-13b3-448f-8f75-374d93899387	33a1d7c5-a5b9-4469-9279-3e561b009f4d	Wood	f	4	2026-09-06 13:10:22.561321+00	2026-09-06 13:10:22.561321+00
6482e867-32d9-40ed-b798-834cd2ac8e89	feb37145-7d85-42b6-b0f9-ab93dbecaeb8	4	f	1	2026-09-06 13:10:23.14462+00	2026-09-06 13:10:23.14462+00
fdc5a832-becb-49d1-8325-77a9bda2ba02	feb37145-7d85-42b6-b0f9-ab93dbecaeb8	6	f	2	2026-09-06 13:10:23.14462+00	2026-09-06 13:10:23.14462+00
691c9a9f-67dd-4cbc-9def-24532a001dec	feb37145-7d85-42b6-b0f9-ab93dbecaeb8	8	t	3	2026-09-06 13:10:23.14462+00	2026-09-06 13:10:23.14462+00
5949c23a-5609-4bda-b9e2-10e1a531e389	feb37145-7d85-42b6-b0f9-ab93dbecaeb8	10	f	4	2026-09-06 13:10:23.14462+00	2026-09-06 13:10:23.14462+00
5b58151c-a93f-4648-a37e-bc76006902d9	9550acfb-b8a0-40f3-b073-650765c557c4	New York	f	1	2026-09-09 09:38:59.576602+00	2026-09-09 09:38:59.576602+00
a0c3884e-d7c4-44e9-a663-b683f40ebc27	9550acfb-b8a0-40f3-b073-650765c557c4	Paris	t	2	2026-09-09 09:38:59.576602+00	2026-09-09 09:38:59.576602+00
42d05d31-5d1e-4d5a-91b2-22fe4e1674ad	c9256184-8ed3-4405-9474-ecd92e11f554	2	t	1	2026-09-09 09:39:29.188826+00	2026-09-09 09:39:29.188826+00
388b7270-19e1-4213-86b4-709a89c7008a	c9256184-8ed3-4405-9474-ecd92e11f554	3	t	2	2026-09-09 09:39:29.188826+00	2026-09-09 09:39:29.188826+00
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.questions (id, test_id, question_text, question_type, points, explanation, sort_order, created_at, updated_at, assignment_id, question_number, correct_text_answer, topic) FROM stdin;
cab5da0f-d2d6-48b5-96e4-8e7c12aa6b85	\N	Which is the largest ocean in the world?	mcq	1	The Pacific Ocean is the largest ocean on Earth.	2	2026-09-05 11:19:22.4887+00	2026-09-05 11:19:22.4887+00	6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0	2	\N	Geography
c7843572-832d-488b-9716-72da95e7a05f	\N	Which of these are continents?	msq	1	Asia, Africa, and Europe are continents. The Amazon is a river and rainforest region.	3	2026-09-05 11:19:22.828343+00	2026-09-05 11:19:22.828343+00	6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0	3	\N	Geography
b18e4b8e-c340-4254-be60-32aac90f0716	\N	What is 5 + 7?	text	2	5 + 7 = 12.	4	2026-09-05 11:19:23.147626+00	2026-09-05 11:19:23.147626+00	6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0	4	12	Mathematics
8a90113a-7744-491b-8ae8-587e3cf39b68	\N	Which of these are even numbers?	msq	1	2 and 8 are even numbers because they are divisible by 2.	5	2026-09-05 11:19:23.348694+00	2026-09-05 11:19:23.348694+00	6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0	5	\N	Mathematics
ef3d7e2c-2442-411a-9755-4aeda126fa61	\N	What is 10 × 3?	mcq	1	10 × 3 = 30.	6	2026-09-05 11:19:23.662675+00	2026-09-05 11:19:23.662675+00	6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0	6	\N	Mathematics
18f8dec6-ee39-48e8-b86f-f72a16b8f164	\N	Which planet is known as the Red Planet?	mcq	1	Mars is called the Red Planet because of its reddish appearance.	7	2026-09-05 11:19:23.982133+00	2026-09-05 11:19:23.982133+00	6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0	7	\N	Science
2de2a35a-0004-4a91-b9eb-063c19c2781c	\N	Which of these are states of matter?	msq	1	Solid, liquid, and gas are common states of matter. Wood is a material, not a state of matter.	8	2026-09-05 11:19:24.298986+00	2026-09-05 11:19:24.298986+00	6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0	8	\N	Science
e407af5e-97bc-4e6c-8e86-88536f1e0fac	\N	What gas do humans need to breathe?	text	2	Humans need oxygen for respiration and energy production.	9	2026-09-05 11:19:24.604944+00	2026-09-05 11:19:24.604944+00	6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0	9	Oxygen	Science
f0e46421-2c0a-4350-9f36-1a6255379041	\N	How many legs does a spider have?	mcq	1	A spider has eight legs.	10	2026-09-05 11:19:24.814295+00	2026-09-05 11:19:24.814295+00	6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0	10	\N	Science
9a43bb41-73b9-4d00-908f-ab712619510a	bd505e3d-b811-4212-87a8-0521b4a42385	What is the capital of France?	mcq	1	Paris is the capital city of France.	1	2026-09-05 11:19:51.446732+00	2026-09-05 11:19:51.446732+00	\N	1	\N	Geography
cb41b946-0a52-41fb-80b0-ad706821db26	bd505e3d-b811-4212-87a8-0521b4a42385	Which is the largest ocean in the world?	mcq	1	The Pacific Ocean is the largest ocean on Earth.	2	2026-09-05 11:19:51.747655+00	2026-09-05 11:19:51.747655+00	\N	2	\N	Geography
1d587a56-6aa5-450c-b698-97c4cb693357	bd505e3d-b811-4212-87a8-0521b4a42385	Which of these are continents?	msq	1	Asia, Africa, and Europe are continents. The Amazon is a river and rainforest region.	3	2026-09-05 11:19:52.034499+00	2026-09-05 11:19:52.034499+00	\N	3	\N	Geography
9ad2bf73-f76c-4efb-9be5-8fbd1c1ac36a	bd505e3d-b811-4212-87a8-0521b4a42385	What is 5 + 7?	text	2	5 + 7 = 12.	4	2026-09-05 11:19:52.311593+00	2026-09-05 11:19:52.311593+00	\N	4	12	Mathematics
36c1b110-8246-406b-9f84-73cc155bb257	bd505e3d-b811-4212-87a8-0521b4a42385	Which of these are even numbers?	msq	1	2 and 8 are even numbers because they are divisible by 2.	5	2026-09-05 11:19:52.494624+00	2026-09-05 11:19:52.494624+00	\N	5	\N	Mathematics
c8fe27d4-edb8-4627-bf9b-77095753bcd2	bd505e3d-b811-4212-87a8-0521b4a42385	What is 10 × 3?	mcq	1	10 × 3 = 30.	6	2026-09-05 11:19:52.768578+00	2026-09-05 11:19:52.768578+00	\N	6	\N	Mathematics
0865b103-4e8a-4cc2-acbf-026f7482e56b	bd505e3d-b811-4212-87a8-0521b4a42385	Which planet is known as the Red Planet?	mcq	1	Mars is called the Red Planet because of its reddish appearance.	7	2026-09-05 11:19:53.052033+00	2026-09-05 11:19:53.052033+00	\N	7	\N	Science
ecb41a27-6f6e-4816-be2b-daf6059473af	bd505e3d-b811-4212-87a8-0521b4a42385	Which of these are states of matter?	msq	1	Solid, liquid, and gas are common states of matter. Wood is a material, not a state of matter.	8	2026-09-05 11:19:53.338171+00	2026-09-05 11:19:53.338171+00	\N	8	\N	Science
b46beaed-b02f-47fd-86d3-f592b4cde43e	bd505e3d-b811-4212-87a8-0521b4a42385	What gas do humans need to breathe?	text	2	Humans need oxygen for respiration and energy production.	9	2026-09-05 11:19:53.619073+00	2026-09-05 11:19:53.619073+00	\N	9	Oxygen	Science
c5255c53-96c3-4e7a-94ed-19e72a9cc636	bd505e3d-b811-4212-87a8-0521b4a42385	How many legs does a spider have?	mcq	1	A spider has eight legs.	10	2026-09-05 11:19:53.803472+00	2026-09-05 11:19:53.803472+00	\N	10	\N	Science
280bc8d8-bbc7-4ce2-aaf6-24ee254c193f	\N	What is 5 + 7?	text	2	5 + 7 = 12.	4	2026-09-06 13:10:20.952762+00	2026-09-06 13:10:20.952762+00	4d8bdb1b-579b-4d1b-a590-dc1e9d060dc8	4	12	Mathematics
ded771fc-dc86-47d0-9492-72c60784f9d6	\N	What is the capital of France?	mcq	1	Paris is the capital city of France.	1	2026-09-06 13:10:19.899469+00	2026-09-06 13:10:19.899469+00	4d8bdb1b-579b-4d1b-a590-dc1e9d060dc8	1	\N	Geography
cf0f1f2d-3be6-4e49-a2cb-11209f655bfe	\N	Which is the largest ocean in the world?	mcq	1	The Pacific Ocean is the largest ocean on Earth.	2	2026-09-06 13:10:20.224433+00	2026-09-06 13:10:20.224433+00	4d8bdb1b-579b-4d1b-a590-dc1e9d060dc8	2	\N	Geography
d13c05b9-738a-4a13-8be2-520c223fd8c0	\N	Which of these are continents?	msq	1	Asia, Africa, and Europe are continents. The Amazon is a river and rainforest region.	3	2026-09-06 13:10:20.598346+00	2026-09-06 13:10:20.598346+00	4d8bdb1b-579b-4d1b-a590-dc1e9d060dc8	3	\N	Geography
652bae52-f35e-47f3-89e4-9a72f783b3d6	\N	Which of these are even numbers?	msq	1	2 and 8 are even numbers because they are divisible by 2.	5	2026-09-06 13:10:21.194897+00	2026-09-06 13:10:21.194897+00	4d8bdb1b-579b-4d1b-a590-dc1e9d060dc8	5	\N	Mathematics
5d77990d-36a9-4b0e-8495-953cb10c1e55	\N	What is 10 × 3?	mcq	1	10 × 3 = 30.	6	2026-09-06 13:10:21.502225+00	2026-09-06 13:10:21.502225+00	4d8bdb1b-579b-4d1b-a590-dc1e9d060dc8	6	\N	Mathematics
43e2e992-3c52-4123-b593-df7f2cae4123	\N	Which planet is known as the Red Planet?	mcq	1	Mars is called the Red Planet because of its reddish appearance.	7	2026-09-06 13:10:21.854278+00	2026-09-06 13:10:21.854278+00	4d8bdb1b-579b-4d1b-a590-dc1e9d060dc8	7	\N	Science
33a1d7c5-a5b9-4469-9279-3e561b009f4d	\N	Which of these are states of matter?	msq	1	Solid, liquid, and gas are common states of matter. Wood is a material, not a state of matter.	8	2026-09-06 13:10:22.152758+00	2026-09-06 13:10:22.152758+00	4d8bdb1b-579b-4d1b-a590-dc1e9d060dc8	8	\N	Science
3153127c-d24d-4a58-8f8c-bc06650016ed	\N	What gas do humans need to breathe?	text	2	Humans need oxygen for respiration and energy production.	9	2026-09-06 13:10:22.668694+00	2026-09-06 13:10:22.668694+00	4d8bdb1b-579b-4d1b-a590-dc1e9d060dc8	9	Oxygen	Science
feb37145-7d85-42b6-b0f9-ab93dbecaeb8	\N	How many legs does a spider have?	mcq	1	A spider has eight legs.	10	2026-09-06 13:10:22.922853+00	2026-09-06 13:10:22.922853+00	4d8bdb1b-579b-4d1b-a590-dc1e9d060dc8	10	\N	Science
9550acfb-b8a0-40f3-b073-650765c557c4	\N	What is the capital of France?	mcq	1	Paris has been the capital since the 12th century.	11	2026-09-09 09:38:59.18847+00	2026-09-09 09:38:59.18847+00	4d8bdb1b-579b-4d1b-a590-dc1e9d060dc8	11	\N	Geography
09f14687-c1fa-48a5-882b-b3f9d067cfb6	\N	What is 2+2=?	text	2	2+2 = 4	13	2026-09-09 09:39:00.301631+00	2026-09-09 09:39:00.301631+00	4d8bdb1b-579b-4d1b-a590-dc1e9d060dc8	13	4	Mathematics
c9256184-8ed3-4405-9474-ecd92e11f554	\N	Which of these are prime numbers?	msq	1	2 and 5 are prime	12	2026-09-09 09:38:59.69712+00	2026-09-09 09:39:28.943613+00	4d8bdb1b-579b-4d1b-a590-dc1e9d060dc8	12	\N	Mathematics
\.


--
-- Data for Name: referral_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.referral_settings (id, referee_discount_percentage, referrer_reward_percentage, points_per_rupee, min_withdrawal_points, is_active, updated_at, updated_by) FROM stdin;
1	20.00	10.00	5.00	500	t	2026-09-11 07:31:48.159175+00	\N
\.


--
-- Data for Name: referrals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.referrals (id, referrer_id, referee_id, referral_code, status, total_purchases_count, total_purchased_amount, total_points_awarded, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: student_queries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_queries (id, student_id, subject, body, status, admin_reply, replied_by, replied_at, created_at, updated_at, type, metadata) FROM stdin;
2a797c15-d7e6-4611-a837-a1902456a5df	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	Extra attempt request: Assignment 01	All attempts have been used without a passing score. Requesting one additional attempt.	answered	Approved. You have been granted 1 additional attempt.	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-06 12:34:53.525+00	2026-09-06 11:20:14.091174+00	2026-09-06 12:34:53.57132+00	extra_attempt_request	{"lesson_id": "b7304d3b-6618-4cd4-b52f-8d8ce583244a", "query_number": "Q-30317", "assignment_id": "6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0", "attempts_used": 1, "assessment_type": "assignment"}
97e95d70-81b1-409d-8a75-c176181ded23	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	This is a test message	Hi Sir.!	answered	Hello.!	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-06 12:35:17.795+00	2026-09-06 11:39:23.594407+00	2026-09-06 12:35:17.849268+00	general	{"query_number": "Q-63994"}
a2abe9b6-c87c-4398-8d97-fcc62e6d2067	\N	I'm unaware of this platform.	Please guide me through the platform.	answered	Ok	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-08 02:08:07.89+00	2026-09-07 17:34:59.665617+00	2026-09-08 02:08:07.946186+00	contact_form	{"is_guest": true, "guest_name": "Ramu", "guest_email": "ramu@test.com", "guest_phone": "8080908090", "query_number": "Q-27461"}
352f4584-0a9f-45e6-a099-09c30f4fd59c	\N	Why my access is blocked.?	Please reply.	answered	Ok	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-08 02:08:15.088+00	2026-09-07 14:12:43.324645+00	2026-09-08 02:08:15.146601+00	contact_form	{"is_guest": true, "guest_name": "New Student", "guest_email": "hello@hello.com", "guest_phone": "9898898998", "query_number": "Q-87645"}
2a64e737-6809-4102-86e5-e127a808d0a0	\N	Audit	Hello	open	\N	\N	\N	2026-09-10 14:43:18.482635+00	2026-09-10 14:43:18.482635+00	contact_form	{"is_guest": true, "guest_name": "Audit Test", "guest_email": "audit@example.com", "guest_phone": "+919876543210", "query_number": "Q-24964"}
84169f8d-d541-44d2-bc70-d2da426e44c8	\N	Audit	Automated test	open	\N	\N	\N	2026-09-10 14:44:14.79936+00	2026-09-10 14:44:14.79936+00	contact_form	{"is_guest": true, "guest_name": "Auditor", "guest_email": "auditor@test.com", "guest_phone": "+919876543210", "query_number": "Q-57099"}
\.


--
-- Data for Name: sub_admin_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sub_admin_permissions (id, user_id, permissions, granted_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: test_answer_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.test_answer_options (id, test_answer_id, option_id, created_at) FROM stdin;
\.


--
-- Data for Name: test_answers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.test_answers (id, attempt_id, question_id, selected_option_id, text_answer, is_correct, time_spent_seconds, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: test_attempts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.test_attempts (id, test_id, student_id, started_at, completed_at, score, max_score, time_spent_seconds, created_at, updated_at) FROM stdin;
f0bdd232-e8a7-4afa-8e15-178cfb95d4ed	bd505e3d-b811-4212-87a8-0521b4a42385	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	2026-09-09 05:19:19.106+00	2026-09-09 05:19:58.087+00	12	12	39	2026-09-09 05:19:19.18362+00	2026-09-09 05:19:58.642334+00
8f55bfc7-9475-4118-ae5f-e87c57eff071	bd505e3d-b811-4212-87a8-0521b4a42385	2c919628-836c-4d18-abc9-2def9e21573a	2026-09-09 09:17:23.002+00	2026-09-09 09:17:52.528+00	12	12	30	2026-09-09 09:17:23.046117+00	2026-09-09 09:17:53.026421+00
1e7bccf7-a80a-4e88-a645-96cf8af60360	bd505e3d-b811-4212-87a8-0521b4a42385	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	2026-09-10 12:39:16.668+00	2026-09-10 12:39:19.885+00	0	12	3	2026-09-10 12:39:16.736791+00	2026-09-10 12:39:20.225298+00
\.


--
-- Data for Name: tests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tests (id, lesson_id, title, time_limit_seconds, passing_score_percent, max_attempts, created_at, updated_at) FROM stdin;
bd505e3d-b811-4212-87a8-0521b4a42385	e82d3a0d-ff5b-4551-a376-1777f9f98c72	Final Test	120	75	1	2026-09-05 11:19:42.5594+00	2026-09-05 11:19:42.5594+00
\.


--
-- Data for Name: user_wallets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_wallets (id, user_id, current_balance, total_earned, total_redeemed, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: video_lessons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.video_lessons (id, lesson_id, vdocipher_video_id, duration_seconds, thumbnail_url, created_at, updated_at) FROM stdin;
741b99de-5824-478c-97c0-d52c0c581b99	4827d058-7606-4146-bea2-bc391b05a85c	a958b263d5864763a7f567efde5f5221	\N	\N	2026-09-05 11:08:10.987783+00	2026-09-05 11:09:00.424894+00
46680f36-d073-466b-b368-c06d3f8405fa	597ccd87-b524-4446-a648-e397ab4fffaf	fd778b64448b4afcb2100b794fd5fccc	\N	\N	2026-09-05 11:09:26.615899+00	2026-09-05 11:09:26.615899+00
2d000a97-2088-42fb-9db2-d5c089d9bcf0	decf63f1-f42d-48a4-b0cd-9d0f05971a7a	f192641d1e144c8580e13ac6084ccc6f	\N	https://emoqhomxasfusolkppzr.supabase.co/storage/v1/object/public/course-media/video-thumbnails/decf63f1-f42d-48a4-b0cd-9d0f05971a7a.jpeg	2026-09-06 12:57:27.327262+00	2026-09-08 13:33:37.09968+00
\.


--
-- Data for Name: video_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.video_sessions (id, user_id, lesson_id, ip_address, user_agent, created_at, expires_at) FROM stdin;
780fe4c5-a14b-496c-9f82-d3cb82facd0d	2c919628-836c-4d18-abc9-2def9e21573a	4827d058-7606-4146-bea2-bc391b05a85c	136.226.244.100,100.30.201.22, 172.70.174.234, 10.24.8.245	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:154.0) Gecko/20100101 Firefox/154.0	2026-09-09 09:13:44.326058+00	2026-09-09 09:28:44.274+00
6379165d-b3d5-470c-be37-b926cfcb1d18	2c919628-836c-4d18-abc9-2def9e21573a	597ccd87-b524-4446-a648-e397ab4fffaf	136.226.244.100,3.87.155.243, 172.71.124.247, 10.30.43.217	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:154.0) Gecko/20100101 Firefox/154.0	2026-09-09 09:14:34.503636+00	2026-09-09 09:29:34.115+00
9a02dba3-840a-4ee5-bb0c-27b138e527f0	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	decf63f1-f42d-48a4-b0cd-9d0f05971a7a	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:154.0) Gecko/20100101 Firefox/154.0	2026-09-11 06:19:55.578592+00	2026-09-11 06:34:55.344+00
e9988aef-5431-4005-b3d5-4d00348697e8	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	597ccd87-b524-4446-a648-e397ab4fffaf	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:154.0) Gecko/20100101 Firefox/154.0	2026-09-11 06:23:46.734121+00	2026-09-11 06:38:46.578+00
1e2f1139-7e99-464d-9fb1-ca622e771b1a	b9d170ae-a9e0-4dab-87ad-8cd4ac82b3e9	597ccd87-b524-4446-a648-e397ab4fffaf	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:154.0) Gecko/20100101 Firefox/154.0	2026-09-11 06:23:56.649746+00	2026-09-11 06:38:56.497+00
fa7f01b2-9304-4407-9c70-0ab2cf908cf8	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	597ccd87-b524-4446-a648-e397ab4fffaf	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:154.0) Gecko/20100101 Firefox/154.0	2026-09-11 06:24:47.556117+00	2026-09-11 06:39:47.403+00
\.


--
-- Data for Name: wallet_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wallet_transactions (id, wallet_id, user_id, type, points, balance_after, reference_id, source_user_id, description, metadata, created_at) FROM stdin;
\.


--
-- Name: assessment_attempt_grants assessment_attempt_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_attempt_grants
    ADD CONSTRAINT assessment_attempt_grants_pkey PRIMARY KEY (id);


--
-- Name: assignment_answer_options assignment_answer_options_assignment_answer_id_option_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_answer_options
    ADD CONSTRAINT assignment_answer_options_assignment_answer_id_option_id_key UNIQUE (assignment_answer_id, option_id);


--
-- Name: assignment_answer_options assignment_answer_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_answer_options
    ADD CONSTRAINT assignment_answer_options_pkey PRIMARY KEY (id);


--
-- Name: assignment_answers assignment_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_answers
    ADD CONSTRAINT assignment_answers_pkey PRIMARY KEY (id);


--
-- Name: assignment_attempts assignment_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_attempts
    ADD CONSTRAINT assignment_attempts_pkey PRIMARY KEY (id);


--
-- Name: assignments assignments_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_lesson_id_key UNIQUE (lesson_id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cash_conversion_requests cash_conversion_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_conversion_requests
    ADD CONSTRAINT cash_conversion_requests_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: chapter_starts chapter_starts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_starts
    ADD CONSTRAINT chapter_starts_pkey PRIMARY KEY (id);


--
-- Name: chapter_starts chapter_starts_student_id_chapter_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_starts
    ADD CONSTRAINT chapter_starts_student_id_chapter_id_key UNIQUE (student_id, chapter_id);


--
-- Name: chapters chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: courses courses_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_slug_key UNIQUE (slug);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: doubt_bookings doubt_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doubt_bookings
    ADD CONSTRAINT doubt_bookings_pkey PRIMARY KEY (id);


--
-- Name: doubt_slots doubt_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doubt_slots
    ADD CONSTRAINT doubt_slots_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_student_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_student_id_course_id_key UNIQUE (student_id, course_id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payments payments_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_number_key UNIQUE (invoice_number);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: pdf_notes pdf_notes_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_notes
    ADD CONSTRAINT pdf_notes_lesson_id_key UNIQUE (lesson_id);


--
-- Name: pdf_notes pdf_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_notes
    ADD CONSTRAINT pdf_notes_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);


--
-- Name: progress progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress
    ADD CONSTRAINT progress_pkey PRIMARY KEY (id);


--
-- Name: progress progress_student_id_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress
    ADD CONSTRAINT progress_student_id_lesson_id_key UNIQUE (student_id, lesson_id);


--
-- Name: question_options question_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_options
    ADD CONSTRAINT question_options_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: referral_settings referral_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_settings
    ADD CONSTRAINT referral_settings_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_referee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referee_id_key UNIQUE (referee_id);


--
-- Name: student_queries student_queries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_queries
    ADD CONSTRAINT student_queries_pkey PRIMARY KEY (id);


--
-- Name: sub_admin_permissions sub_admin_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_admin_permissions
    ADD CONSTRAINT sub_admin_permissions_pkey PRIMARY KEY (id);


--
-- Name: test_answer_options test_answer_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_answer_options
    ADD CONSTRAINT test_answer_options_pkey PRIMARY KEY (id);


--
-- Name: test_answer_options test_answer_options_test_answer_id_option_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_answer_options
    ADD CONSTRAINT test_answer_options_test_answer_id_option_id_key UNIQUE (test_answer_id, option_id);


--
-- Name: test_answers test_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_answers
    ADD CONSTRAINT test_answers_pkey PRIMARY KEY (id);


--
-- Name: test_attempts test_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_attempts
    ADD CONSTRAINT test_attempts_pkey PRIMARY KEY (id);


--
-- Name: tests tests_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tests
    ADD CONSTRAINT tests_lesson_id_key UNIQUE (lesson_id);


--
-- Name: tests tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tests
    ADD CONSTRAINT tests_pkey PRIMARY KEY (id);


--
-- Name: wallet_transactions unique_reference_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT unique_reference_type UNIQUE (reference_id, type);


--
-- Name: user_wallets user_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_pkey PRIMARY KEY (id);


--
-- Name: user_wallets user_wallets_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_user_id_key UNIQUE (user_id);


--
-- Name: video_lessons video_lessons_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_lessons
    ADD CONSTRAINT video_lessons_lesson_id_key UNIQUE (lesson_id);


--
-- Name: video_lessons video_lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_lessons
    ADD CONSTRAINT video_lessons_pkey PRIMARY KEY (id);


--
-- Name: video_sessions video_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_sessions
    ADD CONSTRAINT video_sessions_pkey PRIMARY KEY (id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: idx_assignment_answer_options_answer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_answer_options_answer ON public.assignment_answer_options USING btree (assignment_answer_id);


--
-- Name: idx_assignment_answers_attempt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_answers_attempt ON public.assignment_answers USING btree (attempt_id);


--
-- Name: idx_assignment_answers_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_answers_question ON public.assignment_answers USING btree (question_id);


--
-- Name: idx_assignment_attempts_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_attempts_assignment ON public.assignment_attempts USING btree (assignment_id);


--
-- Name: idx_assignment_attempts_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_attempts_student ON public.assignment_attempts USING btree (student_id);


--
-- Name: idx_assignments_lesson_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_lesson_id ON public.assignments USING btree (lesson_id);


--
-- Name: idx_attempt_grants_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_attempt_grants_assignment ON public.assessment_attempt_grants USING btree (student_id, assignment_id) WHERE (assignment_id IS NOT NULL);


--
-- Name: idx_attempt_grants_test; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_attempt_grants_test ON public.assessment_attempt_grants USING btree (student_id, test_id) WHERE (test_id IS NOT NULL);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_cash_conv_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_conv_status ON public.cash_conversion_requests USING btree (status);


--
-- Name: idx_cash_conv_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_conv_user_id ON public.cash_conversion_requests USING btree (user_id);


--
-- Name: idx_chapter_starts_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chapter_starts_chapter ON public.chapter_starts USING btree (chapter_id);


--
-- Name: idx_chapter_starts_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chapter_starts_student ON public.chapter_starts USING btree (student_id);


--
-- Name: idx_chapters_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chapters_course_id ON public.chapters USING btree (course_id);


--
-- Name: idx_coupons_applicable_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupons_applicable_user ON public.coupons USING btree (applicable_user_id);


--
-- Name: idx_coupons_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupons_code ON public.coupons USING btree (code);


--
-- Name: idx_courses_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_category_id ON public.courses USING btree (category_id);


--
-- Name: idx_courses_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_created_by ON public.courses USING btree (created_by);


--
-- Name: idx_courses_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_status ON public.courses USING btree (status);


--
-- Name: idx_devices_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_devices_user_id ON public.devices USING btree (user_id);


--
-- Name: idx_doubt_bookings_slot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doubt_bookings_slot_id ON public.doubt_bookings USING btree (slot_id);


--
-- Name: idx_doubt_bookings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doubt_bookings_status ON public.doubt_bookings USING btree (status);


--
-- Name: idx_doubt_bookings_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doubt_bookings_student_id ON public.doubt_bookings USING btree (student_id);


--
-- Name: idx_doubt_slots_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doubt_slots_course_id ON public.doubt_slots USING btree (course_id);


--
-- Name: idx_doubt_slots_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doubt_slots_created_by ON public.doubt_slots USING btree (created_by);


--
-- Name: idx_doubt_slots_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doubt_slots_date ON public.doubt_slots USING btree (date);


--
-- Name: idx_doubt_slots_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doubt_slots_status ON public.doubt_slots USING btree (status);


--
-- Name: idx_doubt_slots_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doubt_slots_student_id ON public.doubt_slots USING btree (student_id);


--
-- Name: idx_doubt_slots_target_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doubt_slots_target_type ON public.doubt_slots USING btree (target_type);


--
-- Name: idx_enrollments_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enrollments_course_id ON public.enrollments USING btree (course_id);


--
-- Name: idx_enrollments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enrollments_status ON public.enrollments USING btree (status);


--
-- Name: idx_enrollments_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enrollments_student_id ON public.enrollments USING btree (student_id);


--
-- Name: idx_lessons_chapter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_chapter_id ON public.lessons USING btree (chapter_id);


--
-- Name: idx_notifications_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_id);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (recipient_id) WHERE (is_read = false);


--
-- Name: idx_payments_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_course_id ON public.payments USING btree (course_id);


--
-- Name: idx_payments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_created_at ON public.payments USING btree (created_at DESC);


--
-- Name: idx_payments_razorpay_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_razorpay_order_id ON public.payments USING btree (razorpay_order_id);


--
-- Name: idx_payments_razorpay_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_razorpay_payment_id ON public.payments USING btree (razorpay_payment_id);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: idx_payments_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_student_id ON public.payments USING btree (student_id);


--
-- Name: idx_pdf_notes_lesson_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdf_notes_lesson_id ON public.pdf_notes USING btree (lesson_id);


--
-- Name: idx_profiles_referral_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_referral_code ON public.profiles USING btree (referral_code);


--
-- Name: idx_profiles_referred_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_referred_by ON public.profiles USING btree (referred_by);


--
-- Name: idx_progress_lesson_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_progress_lesson_id ON public.progress USING btree (lesson_id);


--
-- Name: idx_progress_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_progress_status ON public.progress USING btree (status);


--
-- Name: idx_progress_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_progress_student_id ON public.progress USING btree (student_id);


--
-- Name: idx_question_options_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_options_question_id ON public.question_options USING btree (question_id);


--
-- Name: idx_questions_assignment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_assignment_id ON public.questions USING btree (assignment_id);


--
-- Name: idx_questions_test_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_test_id ON public.questions USING btree (test_id);


--
-- Name: idx_referrals_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_code ON public.referrals USING btree (referral_code);


--
-- Name: idx_referrals_referee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_referee_id ON public.referrals USING btree (referee_id);


--
-- Name: idx_referrals_referrer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_referrer_id ON public.referrals USING btree (referrer_id);


--
-- Name: idx_student_queries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_queries_status ON public.student_queries USING btree (status);


--
-- Name: idx_student_queries_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_queries_student ON public.student_queries USING btree (student_id);


--
-- Name: idx_student_queries_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_queries_type ON public.student_queries USING btree (type);


--
-- Name: idx_sub_admin_permissions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_admin_permissions_user_id ON public.sub_admin_permissions USING btree (user_id);


--
-- Name: idx_test_answer_options_answer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_answer_options_answer ON public.test_answer_options USING btree (test_answer_id);


--
-- Name: idx_test_answers_attempt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_answers_attempt_id ON public.test_answers USING btree (attempt_id);


--
-- Name: idx_test_attempts_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_attempts_student_id ON public.test_attempts USING btree (student_id);


--
-- Name: idx_test_attempts_test_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_attempts_test_id ON public.test_attempts USING btree (test_id);


--
-- Name: idx_tests_lesson_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tests_lesson_id ON public.tests USING btree (lesson_id);


--
-- Name: idx_user_wallets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_wallets_user_id ON public.user_wallets USING btree (user_id);


--
-- Name: idx_video_lessons_lesson_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_lessons_lesson_id ON public.video_lessons USING btree (lesson_id);


--
-- Name: idx_wallet_tx_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_tx_reference ON public.wallet_transactions USING btree (reference_id, type);


--
-- Name: idx_wallet_tx_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_tx_user_id ON public.wallet_transactions USING btree (user_id);


--
-- Name: idx_wallet_tx_wallet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_tx_wallet_id ON public.wallet_transactions USING btree (wallet_id);


--
-- Name: video_sessions_user_id_lesson_id_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX video_sessions_user_id_lesson_id_expires_at_idx ON public.video_sessions USING btree (user_id, lesson_id, expires_at);


--
-- Name: assignments assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: chapters chapters_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER chapters_updated_at BEFORE UPDATE ON public.chapters FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: courses courses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: doubt_bookings doubt_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER doubt_bookings_updated_at BEFORE UPDATE ON public.doubt_bookings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: doubt_slots doubt_slots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER doubt_slots_updated_at BEFORE UPDATE ON public.doubt_slots FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: enrollments enrollments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enrollments_updated_at BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: lessons lessons_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: payments payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: pdf_notes pdf_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pdf_notes_updated_at BEFORE UPDATE ON public.pdf_notes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: profiles profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: progress progress_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER progress_updated_at BEFORE UPDATE ON public.progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: question_options question_options_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER question_options_updated_at BEFORE UPDATE ON public.question_options FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: questions questions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: sub_admin_permissions set_sub_admin_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_sub_admin_permissions_updated_at BEFORE UPDATE ON public.sub_admin_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: student_queries student_queries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER student_queries_updated_at BEFORE UPDATE ON public.student_queries FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: sub_admin_permissions sub_admin_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sub_admin_permissions_updated_at BEFORE UPDATE ON public.sub_admin_permissions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: test_answers test_answers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER test_answers_updated_at BEFORE UPDATE ON public.test_answers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: test_attempts test_attempts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER test_attempts_updated_at BEFORE UPDATE ON public.test_attempts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: tests tests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tests_updated_at BEFORE UPDATE ON public.tests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: profiles trg_set_profile_referral_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_profile_referral_code BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_profile_referral_code();


--
-- Name: video_lessons video_lessons_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER video_lessons_updated_at BEFORE UPDATE ON public.video_lessons FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: assessment_attempt_grants assessment_attempt_grants_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_attempt_grants
    ADD CONSTRAINT assessment_attempt_grants_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- Name: assessment_attempt_grants assessment_attempt_grants_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_attempt_grants
    ADD CONSTRAINT assessment_attempt_grants_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: assessment_attempt_grants assessment_attempt_grants_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_attempt_grants
    ADD CONSTRAINT assessment_attempt_grants_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: assessment_attempt_grants assessment_attempt_grants_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_attempt_grants
    ADD CONSTRAINT assessment_attempt_grants_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE;


--
-- Name: assignment_answer_options assignment_answer_options_assignment_answer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_answer_options
    ADD CONSTRAINT assignment_answer_options_assignment_answer_id_fkey FOREIGN KEY (assignment_answer_id) REFERENCES public.assignment_answers(id) ON DELETE CASCADE;


--
-- Name: assignment_answer_options assignment_answer_options_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_answer_options
    ADD CONSTRAINT assignment_answer_options_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.question_options(id) ON DELETE CASCADE;


--
-- Name: assignment_answers assignment_answers_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_answers
    ADD CONSTRAINT assignment_answers_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.assignment_attempts(id) ON DELETE CASCADE;


--
-- Name: assignment_answers assignment_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_answers
    ADD CONSTRAINT assignment_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: assignment_attempts assignment_attempts_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_attempts
    ADD CONSTRAINT assignment_attempts_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: cash_conversion_requests cash_conversion_requests_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_conversion_requests
    ADD CONSTRAINT cash_conversion_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.profiles(id);


--
-- Name: cash_conversion_requests cash_conversion_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_conversion_requests
    ADD CONSTRAINT cash_conversion_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: chapter_starts chapter_starts_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapter_starts
    ADD CONSTRAINT chapter_starts_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: chapters chapters_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: coupons coupons_applicable_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_applicable_user_id_fkey FOREIGN KEY (applicable_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: courses courses_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: courses courses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: devices devices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: doubt_bookings doubt_bookings_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doubt_bookings
    ADD CONSTRAINT doubt_bookings_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.doubt_slots(id) ON DELETE CASCADE;


--
-- Name: doubt_bookings doubt_bookings_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doubt_bookings
    ADD CONSTRAINT doubt_bookings_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: doubt_slots doubt_slots_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doubt_slots
    ADD CONSTRAINT doubt_slots_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;


--
-- Name: doubt_slots doubt_slots_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doubt_slots
    ADD CONSTRAINT doubt_slots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: doubt_slots doubt_slots_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doubt_slots
    ADD CONSTRAINT doubt_slots_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: enrollments enrollments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: enrollments enrollments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: lessons lessons_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: payments payments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: payments payments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: pdf_notes pdf_notes_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_notes
    ADD CONSTRAINT pdf_notes_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: progress progress_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress
    ADD CONSTRAINT progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: progress progress_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress
    ADD CONSTRAINT progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: question_options question_options_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_options
    ADD CONSTRAINT question_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: questions questions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- Name: questions questions_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE;


--
-- Name: referral_settings referral_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_settings
    ADD CONSTRAINT referral_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);


--
-- Name: referrals referrals_referee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referee_id_fkey FOREIGN KEY (referee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: student_queries student_queries_replied_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_queries
    ADD CONSTRAINT student_queries_replied_by_fkey FOREIGN KEY (replied_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: student_queries student_queries_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_queries
    ADD CONSTRAINT student_queries_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: sub_admin_permissions sub_admin_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_admin_permissions
    ADD CONSTRAINT sub_admin_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: sub_admin_permissions sub_admin_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_admin_permissions
    ADD CONSTRAINT sub_admin_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: test_answer_options test_answer_options_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_answer_options
    ADD CONSTRAINT test_answer_options_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.question_options(id) ON DELETE CASCADE;


--
-- Name: test_answer_options test_answer_options_test_answer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_answer_options
    ADD CONSTRAINT test_answer_options_test_answer_id_fkey FOREIGN KEY (test_answer_id) REFERENCES public.test_answers(id) ON DELETE CASCADE;


--
-- Name: test_answers test_answers_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_answers
    ADD CONSTRAINT test_answers_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.test_attempts(id) ON DELETE CASCADE;


--
-- Name: test_answers test_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_answers
    ADD CONSTRAINT test_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: test_answers test_answers_selected_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_answers
    ADD CONSTRAINT test_answers_selected_option_id_fkey FOREIGN KEY (selected_option_id) REFERENCES public.question_options(id);


--
-- Name: test_attempts test_attempts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_attempts
    ADD CONSTRAINT test_attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: test_attempts test_attempts_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_attempts
    ADD CONSTRAINT test_attempts_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE;


--
-- Name: tests tests_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tests
    ADD CONSTRAINT tests_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: user_wallets user_wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: video_lessons video_lessons_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_lessons
    ADD CONSTRAINT video_lessons_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: video_sessions video_sessions_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_sessions
    ADD CONSTRAINT video_sessions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: video_sessions video_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_sessions
    ADD CONSTRAINT video_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_source_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_source_user_id_fkey FOREIGN KEY (source_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: wallet_transactions wallet_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.user_wallets(id) ON DELETE CASCADE;


--
-- Name: assignments Admin manages assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manages assignments" ON public.assignments FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: categories Admin manages categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manages categories" ON public.categories FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: chapters Admin manages chapters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manages chapters" ON public.chapters USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: courses Admin manages courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manages courses" ON public.courses USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: doubt_bookings Admin manages doubt bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manages doubt bookings" ON public.doubt_bookings FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: doubt_slots Admin manages doubt slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manages doubt slots" ON public.doubt_slots FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: enrollments Admin manages enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manages enrollments" ON public.enrollments FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: lessons Admin manages lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manages lessons" ON public.lessons USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: payments Admin manages payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manages payments" ON public.payments FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: pdf_notes Admin manages pdf notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manages pdf notes" ON public.pdf_notes USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: question_options Admin manages question options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manages question options" ON public.question_options FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: questions Admin manages questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manages questions" ON public.questions FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: sub_admin_permissions Admin manages sub admin permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manages sub admin permissions" ON public.sub_admin_permissions FOR SELECT USING ((public.get_my_role() = 'admin'::public.user_role));


--
-- Name: tests Admin manages tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manages tests" ON public.tests FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: video_lessons Admin manages video lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manages video lessons" ON public.video_lessons USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: test_answers Admin reads all answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all answers" ON public.test_answers FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: assignment_answer_options Admin reads all assignment answer options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all assignment answer options" ON public.assignment_answer_options FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: assignment_answers Admin reads all assignment answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all assignment answers" ON public.assignment_answers FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: assignment_attempts Admin reads all assignment attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all assignment attempts" ON public.assignment_attempts FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: assessment_attempt_grants Admin reads all attempt grants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all attempt grants" ON public.assessment_attempt_grants FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: test_attempts Admin reads all attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all attempts" ON public.test_attempts FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: chapter_starts Admin reads all chapter starts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all chapter starts" ON public.chapter_starts FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: devices Admin reads all devices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all devices" ON public.devices FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: notifications Admin reads all notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all notifications" ON public.notifications FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: profiles Admin reads all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all profiles" ON public.profiles FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: progress Admin reads all progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all progress" ON public.progress FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: student_queries Admin reads all queries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all queries" ON public.student_queries FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: test_answer_options Admin reads all test answer options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all test answer options" ON public.test_answer_options FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: audit_logs Admin reads audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads audit logs" ON public.audit_logs FOR SELECT USING ((public.get_my_role() = 'admin'::public.user_role));


--
-- Name: profiles Admin update any profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin update any profile" ON public.profiles FOR UPDATE USING ((public.get_my_role() = 'admin'::public.user_role));


--
-- Name: cash_conversion_requests Admins can manage conversion requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage conversion requests" ON public.cash_conversion_requests TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: referral_settings Anyone can read referral settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read referral settings" ON public.referral_settings FOR SELECT TO authenticated USING (true);


--
-- Name: categories Anyone reads active categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads active categories" ON public.categories FOR SELECT USING ((is_active = true));


--
-- Name: doubt_slots Anyone reads available slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads available slots" ON public.doubt_slots FOR SELECT USING ((status = 'available'::text));


--
-- Name: courses Anyone reads published courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads published courses" ON public.courses FOR SELECT USING ((status = 'published'::public.course_status));


--
-- Name: assignments Enrolled students read assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enrolled students read assignments" ON public.assignments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.lessons l
     JOIN public.chapters ch ON ((ch.id = l.chapter_id)))
     JOIN public.enrollments e ON ((e.course_id = ch.course_id)))
  WHERE ((l.id = assignments.lesson_id) AND (e.student_id = auth.uid()) AND (e.status = 'active'::public.enrollment_status)))));


--
-- Name: pdf_notes Enrolled students read pdf notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enrolled students read pdf notes" ON public.pdf_notes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.lessons l
     JOIN public.chapters ch ON ((ch.id = l.chapter_id)))
     JOIN public.enrollments e ON ((e.course_id = ch.course_id)))
  WHERE ((l.id = pdf_notes.lesson_id) AND (e.student_id = auth.uid()) AND (e.status = 'active'::public.enrollment_status)))));


--
-- Name: chapters Enrolled students read published chapters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enrolled students read published chapters" ON public.chapters FOR SELECT USING (((is_published = true) AND (EXISTS ( SELECT 1
   FROM (public.enrollments e
     JOIN public.courses c ON ((c.id = e.course_id)))
  WHERE ((e.student_id = auth.uid()) AND (e.status = 'active'::public.enrollment_status) AND (c.id = e.course_id))))));


--
-- Name: lessons Enrolled students read published lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enrolled students read published lessons" ON public.lessons FOR SELECT USING (((is_published = true) AND (EXISTS ( SELECT 1
   FROM ((public.enrollments e
     JOIN public.courses c ON ((c.id = e.course_id)))
     JOIN public.chapters ch ON ((ch.course_id = c.id)))
  WHERE ((e.student_id = auth.uid()) AND (e.status = 'active'::public.enrollment_status) AND (ch.id = lessons.chapter_id))))));


--
-- Name: question_options Enrolled students read question options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enrolled students read question options" ON public.question_options FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ((((public.questions q
     JOIN public.tests t ON ((t.id = q.test_id)))
     JOIN public.lessons l ON ((l.id = t.lesson_id)))
     JOIN public.chapters ch ON ((ch.id = l.chapter_id)))
     JOIN public.enrollments e ON ((e.course_id = ch.course_id)))
  WHERE ((q.id = question_options.question_id) AND (e.student_id = auth.uid()) AND (e.status = 'active'::public.enrollment_status)))) OR (EXISTS ( SELECT 1
   FROM ((((public.questions q
     JOIN public.assignments a ON ((a.id = q.assignment_id)))
     JOIN public.lessons l ON ((l.id = a.lesson_id)))
     JOIN public.chapters ch ON ((ch.id = l.chapter_id)))
     JOIN public.enrollments e ON ((e.course_id = ch.course_id)))
  WHERE ((q.id = question_options.question_id) AND (e.student_id = auth.uid()) AND (e.status = 'active'::public.enrollment_status))))));


--
-- Name: questions Enrolled students read questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enrolled students read questions" ON public.questions FOR SELECT USING (((EXISTS ( SELECT 1
   FROM (((public.tests t
     JOIN public.lessons l ON ((l.id = t.lesson_id)))
     JOIN public.chapters ch ON ((ch.id = l.chapter_id)))
     JOIN public.enrollments e ON ((e.course_id = ch.course_id)))
  WHERE ((t.id = questions.test_id) AND (e.student_id = auth.uid()) AND (e.status = 'active'::public.enrollment_status)))) OR (EXISTS ( SELECT 1
   FROM (((public.assignments a
     JOIN public.lessons l ON ((l.id = a.lesson_id)))
     JOIN public.chapters ch ON ((ch.id = l.chapter_id)))
     JOIN public.enrollments e ON ((e.course_id = ch.course_id)))
  WHERE ((a.id = questions.assignment_id) AND (e.student_id = auth.uid()) AND (e.status = 'active'::public.enrollment_status))))));


--
-- Name: tests Enrolled students read tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enrolled students read tests" ON public.tests FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.lessons l
     JOIN public.chapters ch ON ((ch.id = l.chapter_id)))
     JOIN public.enrollments e ON ((e.course_id = ch.course_id)))
  WHERE ((l.id = tests.lesson_id) AND (e.student_id = auth.uid()) AND (e.status = 'active'::public.enrollment_status)))));


--
-- Name: video_lessons Enrolled students read video lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enrolled students read video lessons" ON public.video_lessons FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.lessons l
     JOIN public.chapters ch ON ((ch.id = l.chapter_id)))
     JOIN public.enrollments e ON ((e.course_id = ch.course_id)))
  WHERE ((l.id = video_lessons.lesson_id) AND (e.student_id = auth.uid()) AND (e.status = 'active'::public.enrollment_status)))));


--
-- Name: referral_settings Only admins can update referral settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update referral settings" ON public.referral_settings TO authenticated USING ((public.get_my_role() = 'admin'::public.user_role));


--
-- Name: referrals Referrers can view their referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Referrers can view their referrals" ON public.referrals FOR SELECT TO authenticated USING (((referrer_id = auth.uid()) OR (public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role]))));


--
-- Name: video_sessions Service role manages video sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages video sessions" ON public.video_sessions USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: test_answers Students insert own answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students insert own answers" ON public.test_answers FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.test_attempts ta
  WHERE ((ta.id = test_answers.attempt_id) AND (ta.student_id = auth.uid())))));


--
-- Name: assignment_answers Students insert own assignment answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students insert own assignment answers" ON public.assignment_answers FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.assignment_attempts aa
  WHERE ((aa.id = assignment_answers.attempt_id) AND (aa.student_id = auth.uid())))));


--
-- Name: assignment_attempts Students insert own assignment attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students insert own assignment attempts" ON public.assignment_attempts FOR INSERT WITH CHECK ((auth.uid() = student_id));


--
-- Name: test_attempts Students insert own attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students insert own attempts" ON public.test_attempts FOR INSERT WITH CHECK ((auth.uid() = student_id));


--
-- Name: doubt_bookings Students insert own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students insert own bookings" ON public.doubt_bookings FOR INSERT WITH CHECK ((auth.uid() = student_id));


--
-- Name: chapter_starts Students insert own chapter starts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students insert own chapter starts" ON public.chapter_starts FOR INSERT WITH CHECK ((auth.uid() = student_id));


--
-- Name: progress Students insert own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students insert own progress" ON public.progress FOR INSERT WITH CHECK ((auth.uid() = student_id));


--
-- Name: student_queries Students insert own queries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students insert own queries" ON public.student_queries FOR INSERT WITH CHECK ((student_id = auth.uid()));


--
-- Name: assignment_answer_options Students manage own assignment answer options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students manage own assignment answer options" ON public.assignment_answer_options USING ((EXISTS ( SELECT 1
   FROM (public.assignment_answers aa
     JOIN public.assignment_attempts a ON ((a.id = aa.attempt_id)))
  WHERE ((aa.id = assignment_answer_options.assignment_answer_id) AND (a.student_id = auth.uid())))));


--
-- Name: assignment_attempts Students manage own assignment attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students manage own assignment attempts" ON public.assignment_attempts USING ((auth.uid() = student_id));


--
-- Name: test_attempts Students manage own attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students manage own attempts" ON public.test_attempts USING ((auth.uid() = student_id));


--
-- Name: chapter_starts Students manage own chapter starts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students manage own chapter starts" ON public.chapter_starts USING ((auth.uid() = student_id));


--
-- Name: test_answer_options Students manage own test answer options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students manage own test answer options" ON public.test_answer_options USING ((EXISTS ( SELECT 1
   FROM (public.test_answers ta
     JOIN public.test_attempts t ON ((t.id = ta.attempt_id)))
  WHERE ((ta.id = test_answer_options.test_answer_id) AND (t.student_id = auth.uid())))));


--
-- Name: assessment_attempt_grants Students read own attempt grants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students read own attempt grants" ON public.assessment_attempt_grants FOR SELECT USING ((student_id = auth.uid()));


--
-- Name: notifications Students read own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students read own notifications" ON public.notifications FOR SELECT USING ((recipient_id = auth.uid()));


--
-- Name: student_queries Students read own queries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students read own queries" ON public.student_queries FOR SELECT USING ((student_id = auth.uid()));


--
-- Name: video_sessions Students read own video sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students read own video sessions" ON public.video_sessions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: test_answers Students select own answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students select own answers" ON public.test_answers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.test_attempts ta
  WHERE ((ta.id = test_answers.attempt_id) AND (ta.student_id = auth.uid())))));


--
-- Name: assignment_answers Students select own assignment answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students select own assignment answers" ON public.assignment_answers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.assignment_attempts aa
  WHERE ((aa.id = assignment_answers.attempt_id) AND (aa.student_id = auth.uid())))));


--
-- Name: test_attempts Students select own attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students select own attempts" ON public.test_attempts FOR SELECT USING ((auth.uid() = student_id));


--
-- Name: doubt_bookings Students select own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students select own bookings" ON public.doubt_bookings FOR SELECT USING ((auth.uid() = student_id));


--
-- Name: progress Students select own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students select own progress" ON public.progress FOR SELECT USING ((auth.uid() = student_id));


--
-- Name: test_answers Students update own answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students update own answers" ON public.test_answers FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.test_attempts ta
  WHERE ((ta.id = test_answers.attempt_id) AND (ta.student_id = auth.uid())))));


--
-- Name: assignment_answers Students update own assignment answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students update own assignment answers" ON public.assignment_answers FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.assignment_attempts aa
  WHERE ((aa.id = assignment_answers.attempt_id) AND (aa.student_id = auth.uid())))));


--
-- Name: test_attempts Students update own attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students update own attempts" ON public.test_attempts FOR UPDATE USING ((auth.uid() = student_id));


--
-- Name: doubt_bookings Students update own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students update own bookings" ON public.doubt_bookings FOR UPDATE USING ((auth.uid() = student_id));


--
-- Name: progress Students update own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students update own progress" ON public.progress FOR UPDATE USING ((auth.uid() = student_id));


--
-- Name: sub_admin_permissions Sub admin reads own permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sub admin reads own permissions" ON public.sub_admin_permissions FOR SELECT USING (((auth.uid() = user_id) AND (public.get_my_role() = 'sub_admin'::public.user_role)));


--
-- Name: cash_conversion_requests Users can insert their own conversion requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own conversion requests" ON public.cash_conversion_requests FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: cash_conversion_requests Users can view their own conversion requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own conversion requests" ON public.cash_conversion_requests FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role]))));


--
-- Name: user_wallets Users can view their own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own wallet" ON public.user_wallets FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role]))));


--
-- Name: wallet_transactions Users can view their own wallet transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own wallet transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role]))));


--
-- Name: coupons Users can view valid coupons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view valid coupons" ON public.coupons FOR SELECT TO authenticated USING (((applicable_user_id IS NULL) OR (applicable_user_id = auth.uid()) OR (public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role]))));


--
-- Name: devices Users manage own devices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own devices" ON public.devices USING ((auth.uid() = user_id));


--
-- Name: profiles Users read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: profiles Users update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: assessment_attempt_grants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_attempt_grants ENABLE ROW LEVEL SECURITY;

--
-- Name: assignment_answer_options; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignment_answer_options ENABLE ROW LEVEL SECURITY;

--
-- Name: assignment_answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignment_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: assignment_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignment_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: cash_conversion_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cash_conversion_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: chapter_starts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chapter_starts ENABLE ROW LEVEL SECURITY;

--
-- Name: chapters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

--
-- Name: coupons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: devices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

--
-- Name: doubt_bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.doubt_bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: doubt_bookings doubt_bookings_service_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY doubt_bookings_service_all ON public.doubt_bookings USING ((auth.role() = 'service_role'::text));


--
-- Name: doubt_bookings doubt_bookings_student_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY doubt_bookings_student_select ON public.doubt_bookings FOR SELECT USING ((auth.uid() = student_id));


--
-- Name: doubt_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.doubt_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: doubt_slots doubt_slots_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY doubt_slots_read ON public.doubt_slots FOR SELECT USING (true);


--
-- Name: doubt_slots doubt_slots_service_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY doubt_slots_service_all ON public.doubt_slots USING ((auth.role() = 'service_role'::text));


--
-- Name: enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: enrollments enrollments_service_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enrollments_service_all ON public.enrollments USING ((auth.role() = 'service_role'::text));


--
-- Name: enrollments enrollments_student_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enrollments_student_select ON public.enrollments FOR SELECT USING ((auth.uid() = student_id));


--
-- Name: lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: payments payments_service_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_service_all ON public.payments USING ((auth.role() = 'service_role'::text));


--
-- Name: payments payments_student_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_student_select ON public.payments FOR SELECT USING ((auth.uid() = student_id));


--
-- Name: pdf_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pdf_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

--
-- Name: progress progress_service_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY progress_service_all ON public.progress USING ((auth.role() = 'service_role'::text));


--
-- Name: progress progress_student_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY progress_student_select ON public.progress FOR SELECT USING ((auth.uid() = student_id));


--
-- Name: progress progress_student_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY progress_student_update ON public.progress FOR UPDATE USING ((auth.uid() = student_id));


--
-- Name: question_options; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;

--
-- Name: questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: student_queries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_queries ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_admin_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sub_admin_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_admin_permissions sub_admin_permissions_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sub_admin_permissions_self_read ON public.sub_admin_permissions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: sub_admin_permissions sub_admin_permissions_service_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sub_admin_permissions_service_all ON public.sub_admin_permissions USING ((auth.role() = 'service_role'::text));


--
-- Name: test_answer_options; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_answer_options ENABLE ROW LEVEL SECURITY;

--
-- Name: test_answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: test_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: tests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

--
-- Name: user_wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: video_lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: video_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict tuWaW2NsbNyULEk5aWjGfZRSr8FvfTqVm6ZbmTseU7QkVhidOsGYKz9rmvDcwbc

