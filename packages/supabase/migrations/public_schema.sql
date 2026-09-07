--
-- PostgreSQL database dump
--

\restrict 6fN1zg3l2j6s6y3fZYzxIgVl9AurtwbSIUAbGLuDSRuAgoZsKOlrYnmxriOxnhZ

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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
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
    CONSTRAINT questions_parent_xor_check CHECK ((num_nonnulls(test_id, assignment_id) = 1)),
    CONSTRAINT questions_question_type_check CHECK ((question_type = ANY (ARRAY['mcq'::text, 'msq'::text, 'text'::text])))
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
\.


--
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assignments (id, lesson_id, title, instructions, max_score, created_at, updated_at, time_limit_seconds, passing_score_percent, max_attempts, due_days_after_start) FROM stdin;
6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0	b7304d3b-6618-4cd4-b52f-8d8ce583244a	Assignment 01	No cheating	100	2026-09-05 11:19:14.20073+00	2026-09-05 11:19:14.20073+00	120	75	1	1
4d8bdb1b-579b-4d1b-a590-dc1e9d060dc8	c4884aea-3279-4c09-a05a-82ad980e3ae0	Nav-Assignment	Don't use AI	100	2026-09-06 13:02:50.093251+00	2026-09-06 13:02:50.093251+00	1200	75	1	30
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, user_id, action, resource_type, resource_id, ip_address, user_agent, metadata, created_at) FROM stdin;
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
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.courses (id, category_id, title, slug, description, thumbnail_url, price, discount_price, status, created_by, published_at, created_at, updated_at) FROM stdin;
b8434539-78f9-4e76-b6a7-d002cc006640	98a0f515-69db-4557-b50b-e948af329998	Testing-Phase-I	testing-phase-i	This is test course\nGive feedback	https://emoqhomxasfusolkppzr.supabase.co/storage/v1/object/public/course-media/courses/b8434539-78f9-4e76-b6a7-d002cc006640/thumbnail.jpeg?v=1788606290508	999.00	499.00	published	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-05 11:02:50.183+00	2026-09-05 11:02:32.770246+00	2026-09-05 11:04:57.719774+00
2caf07b4-b647-4d2a-98cd-ea6d5dc8c62d	615e7731-be3c-49d1-bf65-fcb6a4b92a42	Demo-Course-1	demo-course-1	Common Types of DemosProduct Demos: Sales presentations showing software or hardware features to potential buyers. They can be live, pre-recorded videos, or interactive trials.Teaching Demos: Trial lessons where teachers showcase their classroom skills to a hiring committee.Music & Gaming Demos: Sample recordings of songs or trial versions of video games meant to give users a taste of the final release.	https://emoqhomxasfusolkppzr.supabase.co/storage/v1/object/public/course-media/courses/2caf07b4-b647-4d2a-98cd-ea6d5dc8c62d/thumbnail.jpeg?v=1788690365117	24999.00	19999.00	published	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-06 10:23:46.144+00	2026-09-06 10:23:21.75475+00	2026-09-06 10:26:08.08569+00
17f620f4-ff2a-4c63-b63b-f9bc920c99ca	9c950693-2835-4088-8fdb-ae651820e3c0	Navigation-Part-I	navigation-part-i	\N	https://emoqhomxasfusolkppzr.supabase.co/storage/v1/object/public/course-media/courses/17f620f4-ff2a-4c63-b63b-f9bc920c99ca/thumbnail.jpeg?v=1788699209389	20000.00	15000.00	archived	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-06 13:10:48.927+00	2026-09-06 12:52:19.604544+00	2026-09-06 13:18:17.510154+00
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.devices (id, user_id, device_fingerprint, device_name, platform, last_active_at, created_at) FROM stdin;
0a9aed9b-9791-4cbf-8442-88d0206b785c	c7412dd5-8f70-4716-aa60-ac597baf36d7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM3NDEyZGQ1LThmNzAtNDcxNi1hYTYwLWFjNTk3YmFmMzZkNyIsImVtYWlsIjoidGVjaG5pY2FscGlsb3RAYXRvbWljbWFpbC5pbyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4ODc3MjQzMSwiZXhwIjoxNzkxMzY0NDMxfQ.WgJEjE622C-XJNeZ_6DwlJooilIbE2gEUMWrhr065Hc	unknown	web	2026-09-07 09:13:51.904716+00	2026-09-07 09:13:51.904716+00
1341c88f-57d7-4c51-8f01-fd396eb490d9	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUzYWM3YWM2LWUzZDQtNDQ5NS04MmNlLWM5Y2Q2NDUxYmYzYyIsImVtYWlsIjoibHVjazI4a3VkaWRhQGF0b21pY21haWwuaW8iLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc4ODc3MzA2NCwiZXhwIjoxNzkxMzY1MDY0fQ.cRhkDTHk3r1elwd3TpyvSmhml1aYRkXFZAx_NkEjj1s	unknown	web	2026-09-07 09:24:24.193116+00	2026-09-07 09:24:24.193116+00
d35ef743-40bc-4e1a-ba7a-9ebdf5e16c23	c7412dd5-8f70-4716-aa60-ac597baf36d7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM3NDEyZGQ1LThmNzAtNDcxNi1hYTYwLWFjNTk3YmFmMzZkNyIsImVtYWlsIjoidGVjaG5pY2FscGlsb3RAYXRvbWljbWFpbC5pbyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4ODc3NDgzNywiZXhwIjoxNzkxMzY2ODM3fQ._SD_ZCtgXAS0-1lq8vLHw33CAoqcyGtW-iUh5iEGeBM	unknown	web	2026-09-07 09:53:57.365071+00	2026-09-07 09:53:57.365071+00
d16c4ca5-9ee3-4a59-a70f-d65a81414acd	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUzYWM3YWM2LWUzZDQtNDQ5NS04MmNlLWM5Y2Q2NDUxYmYzYyIsImVtYWlsIjoibHVjazI4a3VkaWRhQGF0b21pY21haWwuaW8iLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc4ODc4OTAzOCwiZXhwIjoxNzkxMzgxMDM4fQ.Gr9g9sjaAXegJBHpMo_SHJgFAJG2it5pDUrtr5qCFas	unknown	web	2026-09-07 13:50:38.935223+00	2026-09-07 13:50:38.935223+00
e597c909-2c2a-4d50-9ab9-f0cf7362b61f	c7412dd5-8f70-4716-aa60-ac597baf36d7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM3NDEyZGQ1LThmNzAtNDcxNi1hYTYwLWFjNTk3YmFmMzZkNyIsImVtYWlsIjoidGVjaG5pY2FscGlsb3RAYXRvbWljbWFpbC5pbyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4ODc5MDM3MiwiZXhwIjoxNzkxMzgyMzcyfQ.P64qfuv1livX_MHG4hrkKw3obhtvHqBx64I86ZhX6bw	unknown	web	2026-09-07 14:12:52.605638+00	2026-09-07 14:12:52.605638+00
036be48c-f42b-4308-834a-05af5bfa6405	c7412dd5-8f70-4716-aa60-ac597baf36d7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM3NDEyZGQ1LThmNzAtNDcxNi1hYTYwLWFjNTk3YmFmMzZkNyIsImVtYWlsIjoidGVjaG5pY2FscGlsb3RAYXRvbWljbWFpbC5pbyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4ODc5MDY4MywiZXhwIjoxNzkxMzgyNjgzfQ.r3GRPpgG5Z5G5RcDq2ts1g_-Fddy9IW0FwUruFEQdfA	unknown	web	2026-09-07 14:18:03.751681+00	2026-09-07 14:18:03.751681+00
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
\.


--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enrollments (id, student_id, course_id, enrolled_at, status, completed_at, updated_at) FROM stdin;
4c4d6bed-f7f2-472b-9e35-2d515db672c9	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	17f620f4-ff2a-4c63-b63b-f9bc920c99ca	2026-09-06 13:11:36.47+00	active	\N	2026-09-06 13:11:36.521672+00
00ad86c8-e707-4924-887c-a29a6c8b2e23	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	2caf07b4-b647-4d2a-98cd-ea6d5dc8c62d	2026-09-06 15:14:25.803+00	active	\N	2026-09-06 15:14:25.857478+00
cb016fd4-e073-46c0-9647-c78fa4b451f0	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	b8434539-78f9-4e76-b6a7-d002cc006640	2026-09-06 10:53:20.714+00	active	\N	2026-09-07 09:23:05.961003+00
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
adaf23e3-ad60-417b-98b7-b63e7d9efe7c	8850f799-f86c-4aa0-9cc1-f2c210e7d8b0	NAV-Vid-1 Notes	Navigation Notes	pdf	2	t	\N	2026-09-06 12:58:13.736713+00	2026-09-06 12:58:13.736713+00
decf63f1-f42d-48a4-b0cd-9d0f05971a7a	8850f799-f86c-4aa0-9cc1-f2c210e7d8b0	NAV-Vid-1	<p>MacKenzie Scott has set a new milestone in her philanthropy to historically Black colleges and universities (HBCUs), with her latest donations taking her total giving to the institutions to more than $1 billion. The former wife of Amazon founder <a target="_blank" rel="noopener noreferrer nofollow" class="text-primary underline hover:text-primary/80 cursor-pointer" href="https://timesofindia.indiatimes.com/topic/jeff-bezos">Jeff Bezos</a>, who sold about half of her Amazon stake in 2020, has given tens of millions of dollar</p>	video	1	t	\N	2026-09-06 12:57:21.700265+00	2026-09-06 12:59:50.759978+00
c4884aea-3279-4c09-a05a-82ad980e3ae0	8850f799-f86c-4aa0-9cc1-f2c210e7d8b0	Nav-Assignment	\N	assignment	3	t	\N	2026-09-06 13:00:17.108453+00	2026-09-06 13:00:17.108453+00
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, recipient_id, type, title, body, metadata, is_read, created_at) FROM stdin;
0fb5a064-e81e-4dd1-a9a2-3a86343a8abc	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	query_reply	Reply to: This is a test message	Hello.!	{"query_id": "97e95d70-81b1-409d-8a75-c176181ded23"}	t	2026-09-06 12:35:17.966434+00
26de0a41-5ec0-435a-9d11-00792db7a9e1	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	query_reply	Reply to: Extra attempt request: Assignment 01	Approved. You have been granted 1 additional attempt.	{"query_id": "2a797c15-d7e6-4611-a837-a1902456a5df"}	t	2026-09-06 12:34:53.692829+00
53dec21c-cdc9-40b7-85fc-26fac7239056	c7412dd5-8f70-4716-aa60-ac597baf36d7	extra_attempt_request	Extra Attempt Request #Q-30317	Student requested an extra attempt for Assignment 01.	{"query_id": "2a797c15-d7e6-4611-a837-a1902456a5df", "student_id": "53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c", "query_number": "Q-30317"}	t	2026-09-06 11:20:14.436264+00
cb9a8b2e-9f9c-4bd1-b865-eeb14ad3b5fd	c7412dd5-8f70-4716-aa60-ac597baf36d7	student_query	New Student Query #Q-63994	Student: This is a test message	{"query_id": "97e95d70-81b1-409d-8a75-c176181ded23", "student_id": "53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c", "query_number": "Q-63994"}	t	2026-09-06 11:39:24.069831+00
80335092-1eaa-4270-8a95-a2f6cbad470d	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	doubt_session	Doubt Session: Testing-Phase-I (Chatper-1)	A doubt clearing session for "Testing-Phase-I" is scheduled on 2026-09-07 at 15:35. Book your slot now!	{}	t	2026-09-07 10:05:13.152155+00
e2611fa2-88e2-480a-a994-11a8fc33dcc1	c7412dd5-8f70-4716-aa60-ac597baf36d7	doubt_booking	New Doubt Session Booked	Student booked a session for 2026-09-07 at 15:35 (Chatper-1).	{"slot_id": "3292e001-7e4d-4f46-acfd-4c6b40b5cb0e", "booking_id": "6666de76-4c92-4a92-94cd-93b616e1eb0d", "student_id": "53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c"}	t	2026-09-07 10:06:08.967681+00
7496c737-bd66-4d34-93f9-de91394b6a01	c7412dd5-8f70-4716-aa60-ac597baf36d7	doubt_booking	New Doubt Session Booked	Student booked a session for 2026-09-07 at 15:35 (Chatper-1).	{"slot_id": "3292e001-7e4d-4f46-acfd-4c6b40b5cb0e", "booking_id": "abca2c02-8380-44d6-a600-d196fe3c1503", "student_id": "53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c"}	t	2026-09-07 10:05:46.041944+00
b35f386b-d818-4068-8afc-ac952549cfa8	c7412dd5-8f70-4716-aa60-ac597baf36d7	contact_inquiry	Contact Request #Q-87645	New Student (9898898998): Why my access is blocked.?	{"email": "hello@hello.com", "phone": "9898898998", "query_id": "352f4584-0a9f-45e6-a099-09c30f4fd59c", "query_number": "Q-87645"}	t	2026-09-07 14:12:43.816825+00
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, student_id, course_id, amount, discount_amount, razorpay_order_id, razorpay_payment_id, razorpay_signature, status, refund_reason, invoice_number, created_at, updated_at) FROM stdin;
bf7ac66d-2940-4abe-9b95-27765f7eafa9	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	b8434539-78f9-4e76-b6a7-d002cc006640	499.00	500.00	order_TYj0BiGHLmzXfH	pay_TYj0ayBHx69qro	d6813872c04bc29f000d97d3c561bf5afac23727d0adbdacd8d7a9e852dc89cf	completed	\N	INV-1788691956904-6EYR58	2026-09-06 10:52:36.966269+00	2026-09-06 10:53:20.646935+00
b00a848a-1768-4e2a-a930-6b12337a8f95	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	17f620f4-ff2a-4c63-b63b-f9bc920c99ca	15000.00	5000.00	order_TYlMamX8voCK7b	pay_TYlMhpGuSePsA5	8be0d1c77fd0222a028da552263cb1aca428563ac518ecc4fabc16273549f554	completed	\N	INV-1788700272695-Z49TVZ	2026-09-06 13:11:12.756489+00	2026-09-06 13:11:36.418874+00
e9971116-c49a-478b-bbd1-fabdb58a9f12	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	2caf07b4-b647-4d2a-98cd-ea6d5dc8c62d	19999.00	5000.00	order_TYnS9Io2uafwbY	pay_TYnSQE8FLS9CK9	0459707bef6989b5b1faaea56d61e453c24b3f4d3a459c7d17cf5d0102b3d0fe	completed	\N	INV-1788707631553-RQXKUH	2026-09-06 15:13:51.621626+00	2026-09-06 15:14:25.701038+00
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

COPY public.profiles (id, email, role, full_name, phone, avatar_url, is_active, created_at, updated_at) FROM stdin;
c7412dd5-8f70-4716-aa60-ac597baf36d7	technicalpilot@atomicmail.io	admin	Admin LMS	9876543210	\N	t	2026-08-23 13:01:58.216853+00	2026-09-05 14:26:40.013197+00
53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	luck28kudida@atomicmail.io	student	Student	9898656598	\N	t	2026-09-06 10:24:24.756663+00	2026-09-06 12:05:15.334094+00
\.


--
-- Data for Name: progress; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.progress (id, student_id, lesson_id, status, progress_percent, last_position_seconds, completed_at, updated_at) FROM stdin;
c974554e-93c6-4bd2-a6e9-67b198800ab1	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	6df80b8e-e552-4834-95a4-2c7c400435cb	completed	100	0	2026-09-06 13:11:54.961+00	2026-09-06 13:11:55.012235+00
0cb33985-b339-4d32-8abd-57712be35eca	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	decf63f1-f42d-48a4-b0cd-9d0f05971a7a	completed	100	4	2026-09-06 13:18:56.838+00	2026-09-06 13:41:53.624837+00
76f89fc0-755a-44da-abcd-85ccbf0f5c61	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	b7304d3b-6618-4cd4-b52f-8d8ce583244a	completed	100	0	2026-09-07 09:53:29.851+00	2026-09-07 09:53:30.038043+00
6f3bc546-b7c7-40b5-9628-e300394caf08	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	57777e9a-c3e8-448d-a691-75adca51cd93	completed	100	0	2026-09-06 10:59:20.88+00	2026-09-06 10:59:20.966065+00
87e5f941-f466-4e1b-96f0-34d9bd5e9d74	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	4827d058-7606-4146-bea2-bc391b05a85c	completed	100	11	2026-09-06 11:03:28.904+00	2026-09-06 11:03:28.953505+00
a0db5de0-affd-4667-bba6-a7e3100d3f0b	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	597ccd87-b524-4446-a648-e397ab4fffaf	completed	100	11	2026-09-06 11:03:57.501+00	2026-09-06 11:03:57.537539+00
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
\.


--
-- Data for Name: student_queries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_queries (id, student_id, subject, body, status, admin_reply, replied_by, replied_at, created_at, updated_at, type, metadata) FROM stdin;
2a797c15-d7e6-4611-a837-a1902456a5df	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	Extra attempt request: Assignment 01	All attempts have been used without a passing score. Requesting one additional attempt.	answered	Approved. You have been granted 1 additional attempt.	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-06 12:34:53.525+00	2026-09-06 11:20:14.091174+00	2026-09-06 12:34:53.57132+00	extra_attempt_request	{"lesson_id": "b7304d3b-6618-4cd4-b52f-8d8ce583244a", "query_number": "Q-30317", "assignment_id": "6dcd5851-86ee-42cb-bd71-52e7f2b2d3f0", "attempts_used": 1, "assessment_type": "assignment"}
97e95d70-81b1-409d-8a75-c176181ded23	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	This is a test message	Hi Sir.!	answered	Hello.!	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-06 12:35:17.795+00	2026-09-06 11:39:23.594407+00	2026-09-06 12:35:17.849268+00	general	{"query_number": "Q-63994"}
352f4584-0a9f-45e6-a099-09c30f4fd59c	\N	Why my access is blocked.?	Please reply.	open	\N	\N	\N	2026-09-07 14:12:43.324645+00	2026-09-07 14:12:43.324645+00	contact_form	{"is_guest": true, "guest_name": "New Student", "guest_email": "hello@hello.com", "guest_phone": "9898898998", "query_number": "Q-87645"}
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
\.


--
-- Data for Name: tests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tests (id, lesson_id, title, time_limit_seconds, passing_score_percent, max_attempts, created_at, updated_at) FROM stdin;
bd505e3d-b811-4212-87a8-0521b4a42385	e82d3a0d-ff5b-4551-a376-1777f9f98c72	Final Test	120	75	1	2026-09-05 11:19:42.5594+00	2026-09-05 11:19:42.5594+00
\.


--
-- Data for Name: video_lessons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.video_lessons (id, lesson_id, vdocipher_video_id, duration_seconds, thumbnail_url, created_at, updated_at) FROM stdin;
741b99de-5824-478c-97c0-d52c0c581b99	4827d058-7606-4146-bea2-bc391b05a85c	a958b263d5864763a7f567efde5f5221	\N	\N	2026-09-05 11:08:10.987783+00	2026-09-05 11:09:00.424894+00
46680f36-d073-466b-b368-c06d3f8405fa	597ccd87-b524-4446-a648-e397ab4fffaf	fd778b64448b4afcb2100b794fd5fccc	\N	\N	2026-09-05 11:09:26.615899+00	2026-09-05 11:09:26.615899+00
2d000a97-2088-42fb-9db2-d5c089d9bcf0	decf63f1-f42d-48a4-b0cd-9d0f05971a7a	f192641d1e144c8580e13ac6084ccc6f	\N	\N	2026-09-06 12:57:27.327262+00	2026-09-06 12:57:27.327262+00
\.


--
-- Data for Name: video_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.video_sessions (id, user_id, lesson_id, ip_address, user_agent, created_at, expires_at) FROM stdin;
6a0ab20c-dcf4-4713-81cf-26e984f3bfe7	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	decf63f1-f42d-48a4-b0cd-9d0f05971a7a	103.240.234.193,3.88.33.251, 104.22.66.68, 10.30.43.217	Mozilla/5.0 (X11; Linux x86_64; rv:154.0) Gecko/20100101 Firefox/154.0	2026-09-06 13:12:15.698765+00	2026-09-06 13:27:15.641+00
c4b646e8-c5ab-4354-8dfa-0c50f333be86	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	decf63f1-f42d-48a4-b0cd-9d0f05971a7a	103.240.234.193,54.87.240.41, 104.22.66.68, 10.24.8.245	Mozilla/5.0 (X11; Linux x86_64; rv:154.0) Gecko/20100101 Firefox/154.0	2026-09-06 13:12:38.108999+00	2026-09-06 13:27:38.048+00
38fe9486-53cb-42ea-9e98-3b7488ce4614	53ac7ac6-e3d4-4495-82ce-c9cd6451bf3c	decf63f1-f42d-48a4-b0cd-9d0f05971a7a	103.240.234.193,3.88.33.251, 104.22.66.68, 10.30.43.217	Mozilla/5.0 (X11; Linux x86_64; rv:154.0) Gecko/20100101 Firefox/154.0	2026-09-06 13:18:51.467425+00	2026-09-06 13:33:51.401+00
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
-- Name: idx_video_lessons_lesson_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_lessons_lesson_id ON public.video_lessons USING btree (lesson_id);


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
-- Name: video_lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: video_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict 6fN1zg3l2j6s6y3fZYzxIgVl9AurtwbSIUAbGLuDSRuAgoZsKOlrYnmxriOxnhZ

