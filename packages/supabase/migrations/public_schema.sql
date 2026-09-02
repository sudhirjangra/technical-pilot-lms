--
-- PostgreSQL database dump
--

\restrict ghHtS6bnqz9wehQm7klXD70si75ltqHifRgxM3e1adwoRNqWEnIe37ZKzTIT7OB

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
-- Name: assignment_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    student_id uuid NOT NULL,
    file_path text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    score integer,
    feedback text,
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    date_of_birth date
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
5ecdb078-1617-407f-a480-03598f7922fb	4b192bfc-9b14-433d-92b5-1e275787e5f6	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-08-30 13:55:04.447+00	2026-08-30 13:55:16.448+00	4	4	12	2026-08-30 13:55:04.561374+00	2026-08-30 13:55:04.561374+00
81adbba9-67c1-4c43-8411-8e8674187d6a	4b192bfc-9b14-433d-92b5-1e275787e5f6	c9ca39a2-7b90-42b6-bec9-4a725913d208	2026-08-31 15:37:39.411+00	2026-08-31 15:37:54.093+00	4	4	15	2026-08-31 15:37:39.468552+00	2026-08-31 15:37:39.468552+00
9ecaae80-84b5-435b-a81d-70f34d1ac6b7	4b192bfc-9b14-433d-92b5-1e275787e5f6	c9ca39a2-7b90-42b6-bec9-4a725913d208	2026-09-01 04:27:56.598+00	2026-09-01 04:28:12.61+00	2	4	16	2026-09-01 04:27:56.821547+00	2026-09-01 04:27:56.821547+00
138d7f5a-2bb7-4f66-ac9c-624b077efa84	4b192bfc-9b14-433d-92b5-1e275787e5f6	c9ca39a2-7b90-42b6-bec9-4a725913d208	2026-09-01 04:31:58.476+00	2026-09-01 04:32:08.306+00	4	4	10	2026-09-01 04:31:58.53252+00	2026-09-01 04:31:58.53252+00
6d5dbc35-d51a-43ba-82b5-c836301f2b54	b5ace024-2639-4d14-99d8-c461417f3de7	c9ca39a2-7b90-42b6-bec9-4a725913d208	2026-09-01 09:22:45.736+00	2026-09-01 09:23:35.929+00	5	5	50	2026-09-01 09:22:45.923674+00	2026-09-01 09:22:45.923674+00
\.


--
-- Data for Name: assignment_submissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assignment_submissions (id, assignment_id, student_id, file_path, submitted_at, score, feedback, updated_at) FROM stdin;
\.


--
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assignments (id, lesson_id, title, instructions, max_score, created_at, updated_at, time_limit_seconds, passing_score_percent, max_attempts, due_days_after_start) FROM stdin;
4b192bfc-9b14-433d-92b5-1e275787e5f6	26b5f05f-a1d6-4fe1-8933-7a02e9440541	Test Assignment 01	What is this behavior.?	3	2026-08-30 06:31:16.858221+00	2026-08-30 08:21:29.452403+00	300	60	3	1
b5ace024-2639-4d14-99d8-c461417f3de7	9af3f441-d541-4d48-8cb6-ea3882698b93	Quiz	If you have watched this video, you must be able to answer this question.	100	2026-09-01 06:17:36.603815+00	2026-09-01 06:17:36.603815+00	120	60	1	2
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
3ff1c32a-8db8-47e9-b2ac-8766339fd33c	SSC	testing-course-2026	This is only for testin	\N	2	t
733e3e04-dd6b-43dd-ba23-8f6482181ece	HSSC	dev-phase-i	No Description	\N	1	t
88e46062-09b7-471d-bad7-0d303000ef8f	UPSC	upsc-india-2026	UPSC India	\N	3	t
\.


--
-- Data for Name: chapter_starts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chapter_starts (id, student_id, chapter_id, started_at, created_at) FROM stdin;
701c0b1f-5edc-4992-8849-ee4c04d33ecb	c7412dd5-8f70-4716-aa60-ac597baf36d7	5e2bfe9a-5c79-46e7-8a4e-10bec4c4bda7	2026-08-30 07:31:56.408318+00	2026-08-30 07:31:56.408318+00
27207d09-0d52-4e47-a9bd-08cfe621912f	c7412dd5-8f70-4716-aa60-ac597baf36d7	83a33043-f00b-45f5-83d6-c99cb2bcf91a	2026-08-30 07:32:07.113038+00	2026-08-30 07:32:07.113038+00
4dd4b88a-4bae-46c2-abf9-8d9a86ff23e1	c9ca39a2-7b90-42b6-bec9-4a725913d208	5e2bfe9a-5c79-46e7-8a4e-10bec4c4bda7	2026-08-31 15:29:36.728806+00	2026-08-31 15:29:36.728806+00
0f609de4-fb0a-486a-9dd1-0391361c0b4c	c9ca39a2-7b90-42b6-bec9-4a725913d208	83a33043-f00b-45f5-83d6-c99cb2bcf91a	2026-08-31 15:29:39.064931+00	2026-08-31 15:29:39.064931+00
0fe626b0-38ca-44f3-9978-22014b762664	c9ca39a2-7b90-42b6-bec9-4a725913d208	4eca69d2-d80e-4926-8d7e-86988cea5d96	2026-09-01 09:21:22.42684+00	2026-09-01 09:21:22.42684+00
140c877e-75b5-4bf3-88d9-37638e7f277b	c9ca39a2-7b90-42b6-bec9-4a725913d208	e1fa2b83-b26e-44f8-a831-86587212098e	2026-09-01 09:21:44.396601+00	2026-09-01 09:21:44.396601+00
\.


--
-- Data for Name: chapters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chapters (id, course_id, title, description, sort_order, is_published, created_at, updated_at) FROM stdin;
5e2bfe9a-5c79-46e7-8a4e-10bec4c4bda7	00efcd71-bbbf-48fc-b88f-fe02bac9c8c4	Testing_Chapter_01	Okay	1	t	2026-08-30 06:24:03.986233+00	2026-08-30 06:24:03.986233+00
83a33043-f00b-45f5-83d6-c99cb2bcf91a	00efcd71-bbbf-48fc-b88f-fe02bac9c8c4	Final Test	This is your final exam.! Padhke aana.!	2	t	2026-08-30 06:38:37.180212+00	2026-08-30 06:38:37.180212+00
4eca69d2-d80e-4926-8d7e-86988cea5d96	53051803-6bf9-4c7d-a8a0-2048d3cb2d6e	Introduction Session	Introduction to the instructor	1	t	2026-09-01 06:10:13.308898+00	2026-09-01 06:10:13.308898+00
e1fa2b83-b26e-44f8-a831-86587212098e	53051803-6bf9-4c7d-a8a0-2048d3cb2d6e	Chapter-1	Phase-I	2	t	2026-09-01 06:11:48.979703+00	2026-09-01 06:11:48.979703+00
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.courses (id, category_id, title, slug, description, thumbnail_url, price, discount_price, status, created_by, published_at, created_at, updated_at) FROM stdin;
00efcd71-bbbf-48fc-b88f-fe02bac9c8c4	3ff1c32a-8db8-47e9-b2ac-8766339fd33c	Testing-Phase-I	testing-phase-i	Testing 01	\N	0.00	\N	published	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-08-30 17:30:46.964+00	2026-08-30 06:23:29.507065+00	2026-08-31 11:35:18.376546+00
53051803-6bf9-4c7d-a8a0-2048d3cb2d6e	3ff1c32a-8db8-47e9-b2ac-8766339fd33c	Quick-Revision	quick-revision-ssc	This is quick revision of SSC Hindi	\N	0.00	\N	published	c7412dd5-8f70-4716-aa60-ac597baf36d7	\N	2026-09-01 06:09:06.814341+00	2026-09-01 06:09:06.814341+00
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.devices (id, user_id, device_fingerprint, device_name, platform, last_active_at, created_at) FROM stdin;
15c64314-308b-44ac-920b-b0c0c8f419a9	c7412dd5-8f70-4716-aa60-ac597baf36d7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM3NDEyZGQ1LThmNzAtNDcxNi1hYTYwLWFjNTk3YmFmMzZkNyIsImVtYWlsIjoidGVjaG5pY2FscGlsb3RAYXRvbWljbWFpbC5pbyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4ODI0MjA0MiwiZXhwIjoxNzkwODM0MDQyfQ.2kYfDVL6Qd9SCbbLAYoHNNmH0nHNrhSLjVuLEpfxvY4	unknown	web	2026-09-01 05:54:02.709267+00	2026-09-01 05:54:02.709267+00
40e85f4e-cc38-4f4f-954c-41c53c4ad92c	c9ca39a2-7b90-42b6-bec9-4a725913d208	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM5Y2EzOWEyLTdiOTAtNDJiNi1iZWM5LTRhNzI1OTEzZDIwOCIsImVtYWlsIjoibHVjazI4a3VkaWRhQGF0b21pY21haWwuaW8iLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc4ODI1NjQ2OSwiZXhwIjoxNzkwODQ4NDY5fQ.iAqaNR61nTDfg1xtDizmjUQWE_sh2wt5WiW_oDocWO0	unknown	web	2026-09-01 09:54:29.268315+00	2026-09-01 09:54:29.268315+00
1c875ba2-6155-4f28-bece-7fb0f7425636	c7412dd5-8f70-4716-aa60-ac597baf36d7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM3NDEyZGQ1LThmNzAtNDcxNi1hYTYwLWFjNTk3YmFmMzZkNyIsImVtYWlsIjoidGVjaG5pY2FscGlsb3RAYXRvbWljbWFpbC5pbyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4ODI4Njg4NywiZXhwIjoxNzkwODc4ODg3fQ.NCwRzw1TZUqUW9O41nYOX2-D-5zZmTslL_jmJQeZLVg	K	web	2026-09-01 18:21:27.298124+00	2026-09-01 18:21:27.298124+00
c46fb0ed-db2d-4bfe-94e7-b3b80e820809	c9ca39a2-7b90-42b6-bec9-4a725913d208	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM5Y2EzOWEyLTdiOTAtNDJiNi1iZWM5LTRhNzI1OTEzZDIwOCIsImVtYWlsIjoibHVjazI4a3VkaWRhQGF0b21pY21haWwuaW8iLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc4ODI4NzE2NywiZXhwIjoxNzkwODc5MTY3fQ.h9BksocHjfgy2gMgFmAb5VpSG07jwKs2vty5bGutvf4	unknown	web	2026-09-01 18:26:07.837615+00	2026-09-01 18:26:07.837615+00
79ec0efe-5f3f-46af-8479-83df90003b25	c7412dd5-8f70-4716-aa60-ac597baf36d7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM3NDEyZGQ1LThmNzAtNDcxNi1hYTYwLWFjNTk3YmFmMzZkNyIsImVtYWlsIjoidGVjaG5pY2FscGlsb3RAYXRvbWljbWFpbC5pbyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4ODMyMzUxNSwiZXhwIjoxNzkwOTE1NTE1fQ.2BckapYhRbzhwYKTeLwN0xxluHjktqnrj-_NB3XI-to	unknown	web	2026-09-02 04:31:55.755732+00	2026-09-02 04:31:55.755732+00
c6c0a66d-5322-45c2-8c38-b24ec87e8ccd	c9ca39a2-7b90-42b6-bec9-4a725913d208	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM5Y2EzOWEyLTdiOTAtNDJiNi1iZWM5LTRhNzI1OTEzZDIwOCIsImVtYWlsIjoibHVjazI4a3VkaWRhQGF0b21pY21haWwuaW8iLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc4ODMzNTE2MCwiZXhwIjoxNzkwOTI3MTYwfQ.OhAsQ0G8u-cC6a1EdD7vmWfSABnVBWmWuyL5B-1RkV8	unknown	web	2026-09-02 07:46:00.942556+00	2026-09-02 07:46:00.942556+00
56294bb2-dab9-4194-8652-59cb683bfa2f	c7412dd5-8f70-4716-aa60-ac597baf36d7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM3NDEyZGQ1LThmNzAtNDcxNi1hYTYwLWFjNTk3YmFmMzZkNyIsImVtYWlsIjoidGVjaG5pY2FscGlsb3RAYXRvbWljbWFpbC5pbyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4ODMzODIzOCwiZXhwIjoxNzkwOTMwMjM4fQ.6HMhY5TS9EN2Ut9oloX1AFeqzUR14zOLM3x2t7UlY6I	unknown	web	2026-09-02 08:37:19.060663+00	2026-09-02 08:37:19.060663+00
d87b37c1-642d-49d9-96b6-713ec2954d7d	c9ca39a2-7b90-42b6-bec9-4a725913d208	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM5Y2EzOWEyLTdiOTAtNDJiNi1iZWM5LTRhNzI1OTEzZDIwOCIsImVtYWlsIjoibHVjazI4a3VkaWRhQGF0b21pY21haWwuaW8iLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc4ODMzODI2NSwiZXhwIjoxNzkwOTMwMjY1fQ.eEUxR3p3qfZ1uTxbd2pCgPmy9Ldsnc71Wy3wz0KelB0	unknown	web	2026-09-02 08:37:45.893461+00	2026-09-02 08:37:45.893461+00
\.


--
-- Data for Name: doubt_bookings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doubt_bookings (id, slot_id, student_id, status, booked_at, cancelled_at, meeting_link, updated_at) FROM stdin;
\.


--
-- Data for Name: doubt_slots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doubt_slots (id, created_by, date, start_time, end_time, duration_minutes, max_bookings, current_bookings, status, updated_at, created_at, topic, description) FROM stdin;
\.


--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enrollments (id, student_id, course_id, enrolled_at, status, completed_at, updated_at) FROM stdin;
eea47fc6-b3a5-443a-a5ba-d40cc3f5ba95	82d8c298-faab-4d13-a427-8597e6828be6	00efcd71-bbbf-48fc-b88f-fe02bac9c8c4	2026-08-30 13:29:36.096047+00	active	\N	2026-08-30 13:29:36.096047+00
4849e30a-0f64-43fe-a838-08f41b3d4e0c	c9ca39a2-7b90-42b6-bec9-4a725913d208	00efcd71-bbbf-48fc-b88f-fe02bac9c8c4	2026-08-30 17:30:58.623275+00	active	\N	2026-08-30 17:30:58.623275+00
203f83a9-4ea9-4b73-b57b-7324e3a3d68d	c7412dd5-8f70-4716-aa60-ac597baf36d7	00efcd71-bbbf-48fc-b88f-fe02bac9c8c4	2026-08-30 07:31:43.464745+00	active	2026-08-31 15:27:40.754+00	2026-08-31 15:28:05.353636+00
05d058a4-924e-42fa-858b-5b9123258688	c9ca39a2-7b90-42b6-bec9-4a725913d208	53051803-6bf9-4c7d-a8a0-2048d3cb2d6e	2026-09-01 09:20:46.664965+00	active	\N	2026-09-01 09:20:46.664965+00
\.


--
-- Data for Name: lessons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lessons (id, chapter_id, title, description, lesson_type, sort_order, is_published, duration_seconds, created_at, updated_at) FROM stdin;
cc4a8782-d502-4115-a314-409470e308b8	5e2bfe9a-5c79-46e7-8a4e-10bec4c4bda7	Test_Video_01	Try playing this video	video	1	t	\N	2026-08-30 06:24:48.734067+00	2026-08-31 11:34:38.344092+00
05aab38e-a2ff-4a7e-a143-b695ac3f5a34	5e2bfe9a-5c79-46e7-8a4e-10bec4c4bda7	Test_PDF_01	Open this pdf	pdf	2	t	\N	2026-08-30 06:29:25.933841+00	2026-08-31 11:34:38.357074+00
26b5f05f-a1d6-4fe1-8933-7a02e9440541	5e2bfe9a-5c79-46e7-8a4e-10bec4c4bda7	Test Assignment 01	Complete your assignment	assignment	3	t	\N	2026-08-30 06:30:15.72297+00	2026-08-31 11:34:38.364755+00
b321571b-5f0b-428c-bc58-84eab402b175	4eca69d2-d80e-4926-8d7e-86988cea5d96	Mr. Teacher	Introduction to the instructor	pdf	1	t	\N	2026-09-01 06:10:49.070369+00	2026-09-01 06:10:49.070369+00
9ab63d20-b4b5-46b9-ba6b-621e77c4288c	e1fa2b83-b26e-44f8-a831-86587212098e	Video-1	Lesson-I Video session	video	1	t	\N	2026-09-01 06:16:16.873177+00	2026-09-01 06:16:16.873177+00
9af3f441-d541-4d48-8cb6-ea3882698b93	e1fa2b83-b26e-44f8-a831-86587212098e	Quiz	Video-1 quiz	assignment	2	t	\N	2026-09-01 06:16:53.108483+00	2026-09-01 06:16:53.108483+00
9f84b8c5-769a-4be7-b33a-0fb92191cdb1	e1fa2b83-b26e-44f8-a831-86587212098e	Video-2	Let's move further	video	3	t	\N	2026-09-01 06:54:54.744824+00	2026-09-01 06:54:54.744824+00
1b821134-a651-43ab-bf7b-84c7115edc07	e1fa2b83-b26e-44f8-a831-86587212098e	Final Test	What you learnt in this lesson	test	4	t	\N	2026-09-01 07:01:25.173098+00	2026-09-01 07:01:25.173098+00
c68844d7-8ea3-4f6e-a146-78b10d22bdba	83a33043-f00b-45f5-83d6-c99cb2bcf91a	Final Paper	Groud D	test	1	t	\N	2026-08-30 06:39:50.277038+00	2026-08-30 06:39:50.277038+00
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, student_id, course_id, amount, discount_amount, razorpay_order_id, razorpay_payment_id, razorpay_signature, status, refund_reason, invoice_number, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: pdf_notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pdf_notes (id, lesson_id, file_path, file_size_bytes, page_count, created_at, updated_at) FROM stdin;
23cb1fdb-a7bc-4353-86a4-ba4e153360c0	05aab38e-a2ff-4a7e-a143-b695ac3f5a34	testing-phase-i/testing-chapter-01/test-pdf-01.pdf	238707	\N	2026-08-30 06:29:28.500574+00	2026-08-30 06:29:28.500574+00
d2e6d797-0a8b-4481-92a9-c86b90ddc628	b321571b-5f0b-428c-bc58-84eab402b175	quick-revision-ssc/introduction-session/mr-teacher.pdf	32754	\N	2026-09-01 06:10:55.067128+00	2026-09-01 06:10:55.067128+00
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profiles (id, email, role, full_name, phone, avatar_url, is_active, created_at, updated_at, date_of_birth) FROM stdin;
c7412dd5-8f70-4716-aa60-ac597baf36d7	technicalpilot@atomicmail.io	admin	Admin LMS	9876543210	\N	t	2026-08-23 13:01:58.216853+00	2026-08-23 13:13:05.178081+00	2001-01-01
b67cd6f9-8a60-44a2-950f-dc2265a60f41	officialuse7055@gmail.com	student	Sachin Jangra	9898656565	https://lh3.googleusercontent.com/a/ACg8ocIGqJlhPNJ2d99hv3tYX7yoa6xPYEKxT8MDkmd5HIHbkTEobw=s96-c	t	2026-08-24 14:04:14.342902+00	2026-08-25 03:30:48.286541+00	2003-02-01
82d8c298-faab-4d13-a427-8597e6828be6	mohan819.tp@gmail.com	student	Mohan	9638574105	https://lh3.googleusercontent.com/a/ACg8ocJbq4bwrWsjaBn_HPrZk1KTYdsZr-LkD2EPcAFL4PO1N_yQLQ=s96-c	t	2026-08-26 11:44:03.492284+00	2026-08-26 11:44:43.525541+00	2003-02-01
c9ca39a2-7b90-42b6-bec9-4a725913d208	luck28kudida@atomicmail.io	student	luck28kudida	9898878776	\N	t	2026-08-23 03:51:52.979661+00	2026-09-01 09:52:28.36563+00	1995-06-22
\.


--
-- Data for Name: progress; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.progress (id, student_id, lesson_id, status, progress_percent, last_position_seconds, completed_at, updated_at) FROM stdin;
ff497ce9-f1c2-4af9-975d-4911dca8e8a3	c9ca39a2-7b90-42b6-bec9-4a725913d208	1b821134-a651-43ab-bf7b-84c7115edc07	completed	100	0	2026-09-01 09:58:13.843+00	2026-09-01 09:58:13.883103+00
e7c37739-ee0d-45ec-96c3-a2e80acd71cf	c9ca39a2-7b90-42b6-bec9-4a725913d208	b321571b-5f0b-428c-bc58-84eab402b175	completed	100	0	2026-09-01 09:21:36.817+00	2026-09-01 09:21:36.908715+00
69124407-1e51-4007-a9a9-32f5b3452256	c9ca39a2-7b90-42b6-bec9-4a725913d208	9af3f441-d541-4d48-8cb6-ea3882698b93	completed	100	0	2026-09-01 09:23:38.01+00	2026-09-01 09:23:38.059912+00
3707118d-0c0b-482b-b97d-742332006005	c9ca39a2-7b90-42b6-bec9-4a725913d208	cc4a8782-d502-4115-a314-409470e308b8	completed	100	98	2026-09-01 18:39:51.361+00	2026-09-01 18:39:51.408641+00
b355c653-2fee-40e3-900a-5c180538d752	c9ca39a2-7b90-42b6-bec9-4a725913d208	9ab63d20-b4b5-46b9-ba6b-621e77c4288c	completed	100	10	2026-09-02 08:37:16.696+00	2026-09-02 08:37:16.962181+00
16348fdd-dbf3-4cd8-b711-1c4503796946	c9ca39a2-7b90-42b6-bec9-4a725913d208	9f84b8c5-769a-4be7-b33a-0fb92191cdb1	completed	100	10	2026-09-01 09:57:43.128+00	2026-09-01 09:57:43.176451+00
\.


--
-- Data for Name: question_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.question_options (id, question_id, option_text, is_correct, sort_order, created_at, updated_at) FROM stdin;
57539a3e-9c72-4832-9e21-1a3f9025b7f9	ba4fce7d-f34a-4328-bd14-247ea7977a34	Jaipur	f	1	2026-08-30 06:59:11.188279+00	2026-08-30 06:59:11.188279+00
6f2fc438-d8d1-4756-950b-ed26d1fe7e00	ba4fce7d-f34a-4328-bd14-247ea7977a34	Gurugram	f	2	2026-08-30 06:59:11.188279+00	2026-08-30 06:59:11.188279+00
73fe2b69-789a-4fee-91f5-ae0bf9c5e4e8	ba4fce7d-f34a-4328-bd14-247ea7977a34	New Delhi	t	3	2026-08-30 06:59:11.188279+00	2026-08-30 06:59:11.188279+00
c56a4ae0-f576-4f25-9d12-92c3886bbd3c	ba4fce7d-f34a-4328-bd14-247ea7977a34	Ahemdabad	f	4	2026-08-30 06:59:11.188279+00	2026-08-30 06:59:11.188279+00
40bd8839-087f-4dca-b606-be2ebd5438c6	b36b7638-7c8c-4234-9f03-0e63d205c0b9	Delhi	f	1	2026-08-30 12:26:51.06526+00	2026-08-30 12:26:51.06526+00
624372ea-b2d4-43af-9891-218360b79525	b36b7638-7c8c-4234-9f03-0e63d205c0b9	New York	f	2	2026-08-30 12:26:51.06526+00	2026-08-30 12:26:51.06526+00
97760a63-1bb7-44b2-8449-f69da355ae14	b36b7638-7c8c-4234-9f03-0e63d205c0b9	Paris	t	3	2026-08-30 12:26:51.06526+00	2026-08-30 12:26:51.06526+00
95a0d6ec-c133-4c69-bf95-69d292a2e426	b36b7638-7c8c-4234-9f03-0e63d205c0b9	All of above	f	4	2026-08-30 12:26:51.06526+00	2026-08-30 12:26:51.06526+00
d67574db-95e9-43be-9312-d2fb710aedd7	e35508bf-5165-4f62-aead-f78def337dcd	2	f	1	2026-08-30 12:26:51.684452+00	2026-08-30 12:26:51.684452+00
54c3d883-b5c3-4f98-9a22-91e2f2799800	e35508bf-5165-4f62-aead-f78def337dcd	3	f	2	2026-08-30 12:26:51.684452+00	2026-08-30 12:26:51.684452+00
140e20f5-59be-430b-8ac9-24d6c4e4dd74	e35508bf-5165-4f62-aead-f78def337dcd	5	f	3	2026-08-30 12:26:51.684452+00	2026-08-30 12:26:51.684452+00
52bf33b5-3ebf-43f5-8df8-692a95b2660b	e35508bf-5165-4f62-aead-f78def337dcd	All of above	t	4	2026-08-30 12:26:51.684452+00	2026-08-30 12:26:51.684452+00
dddf5cf9-d3a3-405d-947e-ae60f0f243f4	5510efe2-332d-4ea3-b173-e1dd5a6b60b2	Delhi	f	1	2026-08-30 13:10:22.071444+00	2026-08-30 13:10:22.071444+00
6f108634-029b-4fc4-8921-604d2b628a8f	5510efe2-332d-4ea3-b173-e1dd5a6b60b2	New York	f	2	2026-08-30 13:10:22.071444+00	2026-08-30 13:10:22.071444+00
cb2b670a-289b-48f1-acdc-463fb6407298	5510efe2-332d-4ea3-b173-e1dd5a6b60b2	Paris	t	3	2026-08-30 13:10:22.071444+00	2026-08-30 13:10:22.071444+00
823f5c91-2c01-475c-bffb-5bfdbde238c4	5510efe2-332d-4ea3-b173-e1dd5a6b60b2	All of above	f	4	2026-08-30 13:10:22.071444+00	2026-08-30 13:10:22.071444+00
e83b947f-9c28-4dc2-9b32-8b7b7220d890	fdfa1f60-b70d-47fc-8776-0e9f970c48dc	2	f	1	2026-08-30 13:10:34.559428+00	2026-08-30 13:10:34.559428+00
77d43578-9c2a-45ef-9102-97e979e6896f	fdfa1f60-b70d-47fc-8776-0e9f970c48dc	3	f	2	2026-08-30 13:10:34.559428+00	2026-08-30 13:10:34.559428+00
46797dd6-457d-48bb-9234-780f9652e9ce	fdfa1f60-b70d-47fc-8776-0e9f970c48dc	5	f	3	2026-08-30 13:10:34.559428+00	2026-08-30 13:10:34.559428+00
c6194e1a-e51b-418c-bc57-0f7a8704d842	fdfa1f60-b70d-47fc-8776-0e9f970c48dc	All of above	t	4	2026-08-30 13:10:34.559428+00	2026-08-30 13:10:34.559428+00
acb874b7-3e63-4f56-98f0-ca43d5b521af	689e5aef-2e95-4343-b49e-5265184663c6	Yes	f	1	2026-09-01 06:49:07.016397+00	2026-09-01 06:49:07.016397+00
51cc31ca-ca6c-4853-9596-d2fdd3eae469	689e5aef-2e95-4343-b49e-5265184663c6	No	t	2	2026-09-01 06:49:07.016397+00	2026-09-01 06:49:07.016397+00
37c9f0e1-5b0d-476e-9e4f-48350b6a6dd4	1308d564-8d1c-4911-aa85-070b3f3b6728	Red	t	1	2026-09-01 06:49:07.613644+00	2026-09-01 06:49:07.613644+00
19866689-ce9c-49b9-a3cd-7724c4d1d451	1308d564-8d1c-4911-aa85-070b3f3b6728	Green	f	2	2026-09-01 06:49:07.613644+00	2026-09-01 06:49:07.613644+00
da1ed19e-f180-4c4f-a335-f81051fbb392	1308d564-8d1c-4911-aa85-070b3f3b6728	Yellow	f	3	2026-09-01 06:49:07.613644+00	2026-09-01 06:49:07.613644+00
83e1a4e5-ae96-4079-9864-7f2ac26907e8	1308d564-8d1c-4911-aa85-070b3f3b6728	None of above	f	4	2026-09-01 06:49:07.613644+00	2026-09-01 06:49:07.613644+00
f43e5d2a-da54-4258-b7f7-31a8af678d4a	6c839b44-a555-4ae0-aa2d-c77e17336abe	Red	f	1	2026-09-01 06:49:08.044626+00	2026-09-01 06:49:08.044626+00
3207fd86-2cf9-4175-aa69-a89414d8374e	6c839b44-a555-4ae0-aa2d-c77e17336abe	Green	f	2	2026-09-01 06:49:08.044626+00	2026-09-01 06:49:08.044626+00
5d837949-a878-4f52-9875-ca08a509e04d	6c839b44-a555-4ae0-aa2d-c77e17336abe	Yellow	t	3	2026-09-01 06:49:08.044626+00	2026-09-01 06:49:08.044626+00
cbfa0fb4-4d56-44ee-b310-02e1a748bec6	6c839b44-a555-4ae0-aa2d-c77e17336abe	None of above	f	4	2026-09-01 06:49:08.044626+00	2026-09-01 06:49:08.044626+00
43adbf8f-e783-4796-b2bb-68e4598d25a2	5b465bdc-d70a-45b5-830b-ec250d4e012c	1	t	1	2026-09-01 06:49:08.513815+00	2026-09-01 06:49:08.513815+00
92f8804a-1683-49a5-8559-4ddf1a622702	5b465bdc-d70a-45b5-830b-ec250d4e012c	2	t	2	2026-09-01 06:49:08.513815+00	2026-09-01 06:49:08.513815+00
cd5c64b0-88bf-4d5d-8662-ea57c8a27afc	5b465bdc-d70a-45b5-830b-ec250d4e012c	6	f	3	2026-09-01 06:49:08.513815+00	2026-09-01 06:49:08.513815+00
31ff69fd-ea04-4f09-9f51-7b42da153d34	5b465bdc-d70a-45b5-830b-ec250d4e012c	3	t	4	2026-09-01 06:49:08.513815+00	2026-09-01 06:49:08.513815+00
2d8c1cb1-edc6-4eae-af3d-1f0effef753e	05d0e5ba-c9b5-4fc5-911e-f4d07200d325	Yes	f	1	2026-09-01 07:02:34.736217+00	2026-09-01 07:02:34.736217+00
f674b5b9-1d22-4e13-8848-3df32d3f9ab8	05d0e5ba-c9b5-4fc5-911e-f4d07200d325	No	t	2	2026-09-01 07:02:34.736217+00	2026-09-01 07:02:34.736217+00
4396fe93-5dd1-48d7-855a-f226fdb925c2	6b650bcc-87ff-45ff-a09b-184aea3db2fc	Red	t	1	2026-09-01 07:02:35.196245+00	2026-09-01 07:02:35.196245+00
79f6d274-d559-4196-92a4-b3cb8d967842	6b650bcc-87ff-45ff-a09b-184aea3db2fc	Green	f	2	2026-09-01 07:02:35.196245+00	2026-09-01 07:02:35.196245+00
b71c2b64-5591-4cb5-a512-59a115f12a08	6b650bcc-87ff-45ff-a09b-184aea3db2fc	Yellow	f	3	2026-09-01 07:02:35.196245+00	2026-09-01 07:02:35.196245+00
bd271efb-92ba-40e4-a0ca-7891f443c592	6b650bcc-87ff-45ff-a09b-184aea3db2fc	None of above	f	4	2026-09-01 07:02:35.196245+00	2026-09-01 07:02:35.196245+00
d64565ca-4f6e-4f2d-b788-6201a6853021	5a093671-1812-49d3-83a8-7a4658d96731	Red	f	1	2026-09-01 07:02:35.663753+00	2026-09-01 07:02:35.663753+00
3f3c62c1-d589-4d81-ac09-6489461432ca	5a093671-1812-49d3-83a8-7a4658d96731	Green	f	2	2026-09-01 07:02:35.663753+00	2026-09-01 07:02:35.663753+00
37bf930e-6218-4558-a2bc-a4fddb2f5a9c	5a093671-1812-49d3-83a8-7a4658d96731	Yellow	t	3	2026-09-01 07:02:35.663753+00	2026-09-01 07:02:35.663753+00
9ab52af0-ffe4-4392-8337-9a9412d7a909	5a093671-1812-49d3-83a8-7a4658d96731	None of above	f	4	2026-09-01 07:02:35.663753+00	2026-09-01 07:02:35.663753+00
7eb57902-4124-4a8f-a242-00991230d8a3	6b38f138-76c9-447f-a8a9-29565c92550a	1	t	1	2026-09-01 07:02:36.140788+00	2026-09-01 07:02:36.140788+00
de8b4501-2756-4c3b-96b0-320e9feedf36	6b38f138-76c9-447f-a8a9-29565c92550a	2	t	2	2026-09-01 07:02:36.140788+00	2026-09-01 07:02:36.140788+00
700afd08-ff85-45be-a9bb-62775d568fbb	6b38f138-76c9-447f-a8a9-29565c92550a	6	f	3	2026-09-01 07:02:36.140788+00	2026-09-01 07:02:36.140788+00
48419137-2c00-4924-b898-565496587fb4	6b38f138-76c9-447f-a8a9-29565c92550a	3	t	4	2026-09-01 07:02:36.140788+00	2026-09-01 07:02:36.140788+00
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.questions (id, test_id, question_text, question_type, points, explanation, sort_order, created_at, updated_at, assignment_id, question_number, correct_text_answer, topic) FROM stdin;
ba4fce7d-f34a-4328-bd14-247ea7977a34	dedb8dab-29a2-45da-8c77-a7efe1813e44	India's Capital.?	mcq	1	Delhi is capital of India.	1	2026-08-30 06:58:35.472037+00	2026-08-30 06:59:10.597775+00	\N	1	\N	\N
b36b7638-7c8c-4234-9f03-0e63d205c0b9	dedb8dab-29a2-45da-8c77-a7efe1813e44	What is the capital of France?	mcq	1	Paris has been the capital since the 12th century.	2	2026-08-30 12:26:50.550205+00	2026-08-30 12:26:50.550205+00	\N	2	\N	\N
e35508bf-5165-4f62-aead-f78def337dcd	dedb8dab-29a2-45da-8c77-a7efe1813e44	Which of these are prime numbers?	msq	1	2, 3 and 5 are prime; 4 is not (divisible by 2).	3	2026-08-30 12:26:51.269076+00	2026-08-30 12:26:51.269076+00	\N	3	\N	\N
72a192c2-6bdc-4ee3-bcd6-ade09eaa8440	dedb8dab-29a2-45da-8c77-a7efe1813e44	What is 2+2=?	text	2	2+2 = 4	4	2026-08-30 12:26:51.878386+00	2026-08-30 12:26:51.878386+00	\N	4	4	\N
5510efe2-332d-4ea3-b173-e1dd5a6b60b2	\N	What is the capital of France?	mcq	1	Paris has been the capital since the 12th century.	1	2026-08-30 06:31:37.615929+00	2026-08-30 13:10:21.448186+00	4b192bfc-9b14-433d-92b5-1e275787e5f6	1	\N	Geography
fdfa1f60-b70d-47fc-8776-0e9f970c48dc	\N	Which of these are prime numbers?	msq	1	2, 3 and 5 are prime; 4 is not (divisible by 2).	2	2026-08-30 06:31:38.536543+00	2026-08-30 13:10:33.955947+00	4b192bfc-9b14-433d-92b5-1e275787e5f6	2	\N	Maths
7d284432-2399-4afc-a72f-1a7a551cfd99	\N	What is 2+2=?	text	2	2+2 = 4	3	2026-08-30 06:31:39.458447+00	2026-08-30 13:10:47.25991+00	4b192bfc-9b14-433d-92b5-1e275787e5f6	3	4	Maths
689e5aef-2e95-4343-b49e-5265184663c6	\N	Is there any person in the video.?	mcq	1	There was no person in the video	1	2026-09-01 06:49:06.458668+00	2026-09-01 06:49:06.458668+00	b5ace024-2639-4d14-99d8-c461417f3de7	1	\N	Reasoning
1308d564-8d1c-4911-aa85-070b3f3b6728	\N	What is the color of an apple?	mcq	1	I saw a red apple.	2	2026-09-01 06:49:07.277785+00	2026-09-01 06:49:07.277785+00	b5ace024-2639-4d14-99d8-c461417f3de7	2	\N	Color
6c839b44-a555-4ae0-aa2d-c77e17336abe	\N	What is the color of a banana.?	mcq	1	\N	3	2026-09-01 06:49:07.705888+00	2026-09-01 06:49:07.705888+00	b5ace024-2639-4d14-99d8-c461417f3de7	3	\N	Color
5b465bdc-d70a-45b5-830b-ec250d4e012c	\N	Which of these are <5.?	msq	1	6 is greater than 5	4	2026-09-01 06:49:08.309732+00	2026-09-01 06:49:08.309732+00	b5ace024-2639-4d14-99d8-c461417f3de7	4	\N	Reasoning
7eedca95-22ca-42c0-abe5-253bcb49b82e	\N	Correct spelling of Indiiaa country	text	1	India is the correct spelling	5	2026-09-01 06:49:08.623371+00	2026-09-01 06:49:08.623371+00	b5ace024-2639-4d14-99d8-c461417f3de7	5	India	Reasoning
05d0e5ba-c9b5-4fc5-911e-f4d07200d325	b822d5b3-09b5-4fde-83b0-f2fdd8ce88f6	Is there any person in the video.?	mcq	1	There was no person in the video	1	2026-09-01 07:02:34.355466+00	2026-09-01 07:02:34.355466+00	\N	1	\N	Reasoning
6b650bcc-87ff-45ff-a09b-184aea3db2fc	b822d5b3-09b5-4fde-83b0-f2fdd8ce88f6	What is the color of an apple?	mcq	1	I saw a red apple.	2	2026-09-01 07:02:34.8347+00	2026-09-01 07:02:34.8347+00	\N	2	\N	Color
5a093671-1812-49d3-83a8-7a4658d96731	b822d5b3-09b5-4fde-83b0-f2fdd8ce88f6	What is the color of a banana.?	mcq	1	\N	3	2026-09-01 07:02:35.305328+00	2026-09-01 07:02:35.305328+00	\N	3	\N	Color
6b38f138-76c9-447f-a8a9-29565c92550a	b822d5b3-09b5-4fde-83b0-f2fdd8ce88f6	Which of these are <5.?	msq	1	6 is greater than 5	4	2026-09-01 07:02:35.769864+00	2026-09-01 07:02:35.769864+00	\N	4	\N	Reasoning
5a5cf061-bc1a-49ba-85f5-8bed80852d1f	b822d5b3-09b5-4fde-83b0-f2fdd8ce88f6	Correct spelling of Indiiaa country	text	1	India is the correct spelling	5	2026-09-01 07:02:36.2468+00	2026-09-01 07:02:36.2468+00	\N	5	India	Reasoning
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
d92ba9d0-dda7-4174-9074-d7d99c83f696	b822d5b3-09b5-4fde-83b0-f2fdd8ce88f6	c9ca39a2-7b90-42b6-bec9-4a725913d208	2026-09-01 09:57:54.508+00	2026-09-01 09:58:12.563+00	0	5	18	2026-09-01 09:57:54.566711+00	2026-09-02 04:35:06.754399+00
81130812-535a-4811-a035-47f38fbed233	dedb8dab-29a2-45da-8c77-a7efe1813e44	c9ca39a2-7b90-42b6-bec9-4a725913d208	2026-09-01 04:34:22.424+00	2026-09-01 04:34:36.927+00	0	5	15	2026-09-01 04:34:22.48472+00	2026-09-02 04:35:16.50248+00
\.


--
-- Data for Name: tests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tests (id, lesson_id, title, time_limit_seconds, passing_score_percent, max_attempts, created_at, updated_at) FROM stdin;
dedb8dab-29a2-45da-8c77-a7efe1813e44	c68844d7-8ea3-4f6e-a146-78b10d22bdba	Final Paper	120	85	1	2026-08-30 06:57:14.776182+00	2026-08-30 12:26:40.925946+00
b822d5b3-09b5-4fde-83b0-f2fdd8ce88f6	1b821134-a651-43ab-bf7b-84c7115edc07	Final Test	120	80	1	2026-09-01 07:02:29.482405+00	2026-09-01 07:02:29.482405+00
\.


--
-- Data for Name: video_lessons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.video_lessons (id, lesson_id, vdocipher_video_id, duration_seconds, thumbnail_url, created_at, updated_at) FROM stdin;
126bb7c0-42c3-47f8-afd6-c7514e41e9c6	cc4a8782-d502-4115-a314-409470e308b8	5c08b14198534b7a819295904f6d62cd	\N	\N	2026-08-30 06:24:55.297115+00	2026-08-30 06:24:55.297115+00
76b92899-2d2c-47f2-83ec-58202645274f	9ab63d20-b4b5-46b9-ba6b-621e77c4288c	42ad53917e0c4c96b5c6704658696ba7	\N	\N	2026-09-01 06:16:27.476577+00	2026-09-01 06:16:27.476577+00
fd81cf58-7f01-4046-b794-c8b8ee6dedf5	9f84b8c5-769a-4be7-b33a-0fb92191cdb1	437a35fc0753469f98328f6b2fa723e0	\N	\N	2026-09-01 07:00:53.054005+00	2026-09-01 07:00:53.054005+00
\.


--
-- Data for Name: video_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.video_sessions (id, user_id, lesson_id, ip_address, user_agent, created_at, expires_at) FROM stdin;
d7a88122-b628-4113-8211-6306ae548b97	c9ca39a2-7b90-42b6-bec9-4a725913d208	9f84b8c5-769a-4be7-b33a-0fb92191cdb1	54.144.49.85, 162.158.88.141, 10.25.87.129	node	2026-09-01 09:57:02.799722+00	2026-09-01 10:57:02.733+00
82bc27eb-e465-4e34-9b5d-8c641f567bc1	c9ca39a2-7b90-42b6-bec9-4a725913d208	cc4a8782-d502-4115-a314-409470e308b8	100.31.253.53, 172.69.166.22, 10.31.168.1	node	2026-09-01 18:37:52.345046+00	2026-09-01 19:37:52.265+00
e1f363d3-9ad5-4b7f-b704-974b9750297f	c9ca39a2-7b90-42b6-bec9-4a725913d208	9ab63d20-b4b5-46b9-ba6b-621e77c4288c	13.220.213.172, 172.71.81.93, 10.31.168.1	node	2026-09-02 08:37:02.919759+00	2026-09-02 09:37:02.844+00
\.


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
-- Name: assignment_submissions assignment_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id);


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
-- Name: idx_assignment_submissions_assignment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_submissions_assignment_id ON public.assignment_submissions USING btree (assignment_id);


--
-- Name: idx_assignment_submissions_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_submissions_student_id ON public.assignment_submissions USING btree (student_id);


--
-- Name: idx_assignments_lesson_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_lesson_id ON public.assignments USING btree (lesson_id);


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
-- Name: assignment_submissions assignment_submissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER assignment_submissions_updated_at BEFORE UPDATE ON public.assignment_submissions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


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
-- Name: assignment_submissions assignment_submissions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- Name: assignment_submissions assignment_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


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
-- Name: doubt_slots doubt_slots_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doubt_slots
    ADD CONSTRAINT doubt_slots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


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
-- Name: profiles Admin reads all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all profiles" ON public.profiles FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: progress Admin reads all progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all progress" ON public.progress FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


--
-- Name: assignment_submissions Admin reads all submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all submissions" ON public.assignment_submissions FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


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
-- Name: assignment_submissions Students insert own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students insert own submissions" ON public.assignment_submissions FOR INSERT WITH CHECK ((auth.uid() = student_id));


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
-- Name: assignment_submissions Students manage own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students manage own submissions" ON public.assignment_submissions USING ((auth.uid() = student_id));


--
-- Name: test_answer_options Students manage own test answer options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students manage own test answer options" ON public.test_answer_options USING ((EXISTS ( SELECT 1
   FROM (public.test_answers ta
     JOIN public.test_attempts t ON ((t.id = ta.attempt_id)))
  WHERE ((ta.id = test_answer_options.test_answer_id) AND (t.student_id = auth.uid())))));


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
-- Name: assignment_submissions Students select own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students select own submissions" ON public.assignment_submissions FOR SELECT USING ((auth.uid() = student_id));


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
-- Name: assignment_submissions Students update own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students update own submissions" ON public.assignment_submissions FOR UPDATE USING ((auth.uid() = student_id));


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
-- Name: assignment_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

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

\unrestrict ghHtS6bnqz9wehQm7klXD70si75ltqHifRgxM3e1adwoRNqWEnIe37ZKzTIT7OB

