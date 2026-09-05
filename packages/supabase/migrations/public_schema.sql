--
-- PostgreSQL database dump
--

\restrict qJI0tzRQUcnho50QtT9kf9bpLUTmjgGGkiDo4Xmi0YQ7FA3w50C4b4b2hG6vOe5

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
-- Name: student_queries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_queries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
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
fe6bb0ce-0cfe-4264-a2db-0721d15d61ef	53724601-1ad3-4d8a-8c5d-1822d5edff37	\N	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	1	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-04 10:46:51.157463+00	2026-09-04 10:46:51.157463+00
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
dc1503c5-89cf-4281-9a61-2b182b87abad	604ce706-9cad-41e1-ada6-5d8c0f491b1d	28d26a6e-09ca-4b69-8344-f3bfeb3f727f	2026-09-03 16:12:55.261+00	2026-09-03 16:13:33.182+00	1	13	38	2026-09-03 16:12:55.340441+00	2026-09-03 16:12:55.340441+00
2c4beebf-853d-4961-919e-ee6f56b0419a	fa60ed95-9f3f-439d-8995-2035c2a4be66	28d26a6e-09ca-4b69-8344-f3bfeb3f727f	2026-09-03 16:14:39.223+00	2026-09-03 16:15:39.764+00	10	10	61	2026-09-03 16:14:39.315643+00	2026-09-03 16:14:39.315643+00
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
604ce706-9cad-41e1-ada6-5d8c0f491b1d	4cd21b04-b3b7-4b55-86c0-36cebaa76f01	AS-1	Don't cheat.	20	2026-09-03 09:59:43.787753+00	2026-09-03 09:59:43.787753+00	60	80	1	1
fa60ed95-9f3f-439d-8995-2035c2a4be66	53c2db7f-75ce-4542-96dd-1b7b44be6e86	AS-2 [MATH]	Don't cheat	20	2026-09-03 10:02:13.048184+00	2026-09-03 10:02:53.31761+00	120	60	1	1
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
dd5d5f94-26a6-4264-b86f-191a6dfe50a3	Development Testing	development-testing	This category is just for testing purpose only.	\N	0	t
\.


--
-- Data for Name: chapter_starts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chapter_starts (id, student_id, chapter_id, started_at, created_at) FROM stdin;
14ed38e4-3ac6-4a21-937a-3e65e7e7bf7b	53724601-1ad3-4d8a-8c5d-1822d5edff37	5ee29af4-ba07-4e95-88f5-1d6877973ff4	2026-09-03 13:53:13.536316+00	2026-09-03 13:53:13.536316+00
3c056493-e557-4d7f-98ae-bba1b2373ddb	53724601-1ad3-4d8a-8c5d-1822d5edff37	2ab14217-d33b-4773-b853-f6e5ffac0a89	2026-09-03 13:53:15.568716+00	2026-09-03 13:53:15.568716+00
962694b2-e2a2-4e32-9553-f8fbad494364	53724601-1ad3-4d8a-8c5d-1822d5edff37	b14f7b45-a07b-428f-a418-b2f00e7e9287	2026-09-03 13:53:17.821136+00	2026-09-03 13:53:17.821136+00
9e642767-d8fa-4a50-a843-b243646e4d58	53724601-1ad3-4d8a-8c5d-1822d5edff37	383bdb3b-e935-4498-9712-2757b1d99a6e	2026-09-03 13:53:19.872042+00	2026-09-03 13:53:19.872042+00
a68f4008-b419-4ad6-8c1d-5896411f1388	28d26a6e-09ca-4b69-8344-f3bfeb3f727f	5ee29af4-ba07-4e95-88f5-1d6877973ff4	2026-09-03 16:08:53.28333+00	2026-09-03 16:08:53.28333+00
4705ef1f-e4ce-407b-a6e7-5a8518793f0b	28d26a6e-09ca-4b69-8344-f3bfeb3f727f	2ab14217-d33b-4773-b853-f6e5ffac0a89	2026-09-03 16:11:07.626226+00	2026-09-03 16:11:07.626226+00
9968bae1-00d3-4c6a-a275-37332439a262	28d26a6e-09ca-4b69-8344-f3bfeb3f727f	b14f7b45-a07b-428f-a418-b2f00e7e9287	2026-09-03 16:12:47.896534+00	2026-09-03 16:12:47.896534+00
\.


--
-- Data for Name: chapters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chapters (id, course_id, title, description, sort_order, is_published, created_at, updated_at) FROM stdin;
5ee29af4-ba07-4e95-88f5-1d6877973ff4	b69ccb15-7251-4c6e-90da-36457df1e69d	Introduction	This is introduction session	1	t	2026-09-03 07:32:52.552738+00	2026-09-03 07:32:52.552738+00
2ab14217-d33b-4773-b853-f6e5ffac0a89	b69ccb15-7251-4c6e-90da-36457df1e69d	Phase-1	Getting started	2	t	2026-09-03 07:33:16.402576+00	2026-09-03 07:33:16.402576+00
383bdb3b-e935-4498-9712-2757b1d99a6e	b69ccb15-7251-4c6e-90da-36457df1e69d	Final	Let's close it up	4	t	2026-09-03 07:38:27.125569+00	2026-09-03 07:38:27.125569+00
b14f7b45-a07b-428f-a418-b2f00e7e9287	b69ccb15-7251-4c6e-90da-36457df1e69d	Assignments	Quality all the assignments	3	t	2026-09-03 07:38:11.755918+00	2026-09-03 10:03:15.641868+00
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.courses (id, category_id, title, slug, description, thumbnail_url, price, discount_price, status, created_by, published_at, created_at, updated_at) FROM stdin;
b69ccb15-7251-4c6e-90da-36457df1e69d	dd5d5f94-26a6-4264-b86f-191a6dfe50a3	Dev Test 1	dev-test-1	Course Summary\n\nThis course covers basic mathematics in a simple and easy-to-understand way. Students will learn addition, subtraction, multiplication, division, numbers, and basic problem-solving skills through simple questions and practice.	https://emoqhomxasfusolkppzr.supabase.co/storage/v1/object/public/course-media/courses/b69ccb15-7251-4c6e-90da-36457df1e69d/thumbnail.jpeg	2999.00	499.00	published	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-03 10:05:20.081+00	2026-09-03 07:31:38.522145+00	2026-09-03 10:07:29.350047+00
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.devices (id, user_id, device_fingerprint, device_name, platform, last_active_at, created_at) FROM stdin;
a11adf79-9092-455b-9b01-9fa6fed8bcde	f6099598-9bbe-4bed-97db-160f33287eff	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImY2MDk5NTk4LTliYmUtNGJlZC05N2RiLTE2MGYzMzI4N2VmZiIsImVtYWlsIjoibW9oYW44MTkudHBAZ21haWwuY29tIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE3ODg0MzM5MjksImV4cCI6MTc5MTAyNTkyOX0.tbi8xe5d4xFirwXnIVvnB_rY8etiRvJPGyx841halYA	web	web	2026-09-03 11:12:09.207741+00	2026-09-03 11:12:09.207741+00
f5a1163a-b0f4-441f-aa79-ab60cceb0499	53724601-1ad3-4d8a-8c5d-1822d5edff37	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUzNzI0NjAxLTFhZDMtNGQ4YS04YzVkLTE4MjJkNWVkZmYzNyIsImVtYWlsIjoibHVjazI4a3VkaWRhQGF0b21pY21haWwuaW8iLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc4ODQ0MTU0NywiZXhwIjoxNzkxMDMzNTQ3fQ.4NfVeLcDLTaRqGSWnNUfeVpRTZxYSBQ_13jwYDbv2CQ	unknown	web	2026-09-03 13:19:07.665765+00	2026-09-03 13:19:07.665765+00
6cf785d8-68f5-42c2-b8d7-d61a85fd438b	c7412dd5-8f70-4716-aa60-ac597baf36d7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM3NDEyZGQ1LThmNzAtNDcxNi1hYTYwLWFjNTk3YmFmMzZkNyIsImVtYWlsIjoidGVjaG5pY2FscGlsb3RAYXRvbWljbWFpbC5pbyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4ODQ1MTUxMSwiZXhwIjoxNzkxMDQzNTExfQ.0n9lgztj6AIgcLO-xA8kJ9cAHDyk-8XKzmaMrL64tCA	unknown	web	2026-09-03 16:05:11.52863+00	2026-09-03 16:05:11.52863+00
8e84b6c7-bd1e-4022-8da7-c3bcfa1012fd	28d26a6e-09ca-4b69-8344-f3bfeb3f727f	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjI4ZDI2YTZlLTA5Y2EtNGI2OS04MzQ0LWYzYmZlYjNmNzI3ZiIsImVtYWlsIjoiYmFidW1hYW5AYXRvbWljbWFpbC5pbyIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzg4NDUxNjcwLCJleHAiOjE3OTEwNDM2NzB9.wgSdOaZaQozSrSjpCeSACn1Kexhxd45RaxLj95kWmxM	unknown	web	2026-09-03 16:07:50.543081+00	2026-09-03 16:07:50.543081+00
bbeb0249-0736-4b9d-9d8d-d8aa1eacad0c	c7412dd5-8f70-4716-aa60-ac597baf36d7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM3NDEyZGQ1LThmNzAtNDcxNi1hYTYwLWFjNTk3YmFmMzZkNyIsImVtYWlsIjoidGVjaG5pY2FscGlsb3RAYXRvbWljbWFpbC5pbyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4ODUxMjQ1MywiZXhwIjoxNzkxMTA0NDUzfQ.XT0idXtso02jgC4m0-xq-kZ_0aXZ6YnVHE_28JzJs4Y	unknown	web	2026-09-04 09:00:53.339977+00	2026-09-04 09:00:53.339977+00
b8478d38-5c6d-4b3a-8c3d-e0a3ab5fdcbe	53724601-1ad3-4d8a-8c5d-1822d5edff37	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUzNzI0NjAxLTFhZDMtNGQ4YS04YzVkLTE4MjJkNWVkZmYzNyIsImVtYWlsIjoibHVjazI4a3VkaWRhQGF0b21pY21haWwuaW8iLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc4ODUxNDU1OSwiZXhwIjoxNzkxMTA2NTU5fQ.zw3SjRw2CKyg-r2BcmtkhMbuJM9CZ7AAFopmnClbsBw	unknown	web	2026-09-04 09:35:59.112296+00	2026-09-04 09:35:59.112296+00
7343ee8c-c25e-4d32-8502-6fbda72a5dc0	c7412dd5-8f70-4716-aa60-ac597baf36d7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM3NDEyZGQ1LThmNzAtNDcxNi1hYTYwLWFjNTk3YmFmMzZkNyIsImVtYWlsIjoidGVjaG5pY2FscGlsb3RAYXRvbWljbWFpbC5pbyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4ODU4NTY2OCwiZXhwIjoxNzkxMTc3NjY4fQ.U8UzQwMhCiyTSgA0X2tKdYPylKr15Sy_Fo8rf0lWtJ0	string	web	2026-09-05 05:21:09.050387+00	2026-09-05 05:21:09.050387+00
\.


--
-- Data for Name: doubt_bookings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doubt_bookings (id, slot_id, student_id, status, booked_at, cancelled_at, meeting_link, updated_at) FROM stdin;
674e638f-0f1e-4db9-a6b5-f0124b23aa7a	02ec45e2-6931-4e42-a906-9abf0cc4735e	53724601-1ad3-4d8a-8c5d-1822d5edff37	confirmed	2026-09-03 11:17:17.288011+00	\N	\N	2026-09-03 11:17:17.288011+00
\.


--
-- Data for Name: doubt_slots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doubt_slots (id, created_by, date, start_time, end_time, duration_minutes, max_bookings, current_bookings, status, updated_at, created_at, topic, description) FROM stdin;
02ec45e2-6931-4e42-a906-9abf0cc4735e	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-03	17:00:00	17:30:00	30	1	1	full	2026-09-03 11:17:17.398514+00	2026-09-03 11:17:10.577103+00	Assignment Douts	\N
\.


--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enrollments (id, student_id, course_id, enrolled_at, status, completed_at, updated_at) FROM stdin;
5a629ff9-9dce-478f-b13b-408472de4642	53724601-1ad3-4d8a-8c5d-1822d5edff37	b69ccb15-7251-4c6e-90da-36457df1e69d	2026-09-03 13:13:47.55808+00	active	\N	2026-09-03 13:13:47.55808+00
03891c45-456e-4610-a87f-25806a43916c	28d26a6e-09ca-4b69-8344-f3bfeb3f727f	b69ccb15-7251-4c6e-90da-36457df1e69d	2026-09-03 16:08:43.679176+00	active	\N	2026-09-03 16:08:43.679176+00
\.


--
-- Data for Name: lessons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lessons (id, chapter_id, title, description, lesson_type, sort_order, is_published, duration_seconds, created_at, updated_at) FROM stdin;
334a41eb-b540-4424-a28d-4fb47c2043da	5ee29af4-ba07-4e95-88f5-1d6877973ff4	Introduction	About the intructor	pdf	1	t	\N	2026-09-03 07:39:09.696307+00	2026-09-03 07:39:09.696307+00
5b5960b7-5f17-4bbe-a039-86f1ac52f214	2ab14217-d33b-4773-b853-f6e5ffac0a89	Index Video	Look what we are going to learn	video	1	t	\N	2026-09-03 07:40:48.101724+00	2026-09-03 07:46:33.923298+00
057fb8c7-9935-43f3-aac2-8ae3f2a85beb	2ab14217-d33b-4773-b853-f6e5ffac0a89	Index Video Notes	\N	pdf	2	t	\N	2026-09-03 09:57:07.643709+00	2026-09-03 09:57:07.643709+00
4cd21b04-b3b7-4b55-86c0-36cebaa76f01	b14f7b45-a07b-428f-a418-b2f00e7e9287	AS-1	\N	assignment	1	t	\N	2026-09-03 09:57:26.695625+00	2026-09-03 09:57:26.695625+00
53c2db7f-75ce-4542-96dd-1b7b44be6e86	b14f7b45-a07b-428f-a418-b2f00e7e9287	AS-2	\N	assignment	2	t	\N	2026-09-03 10:01:50.373506+00	2026-09-03 10:01:50.373506+00
1bac1f4d-ffe8-4f31-aeea-aaf1230d7ae1	383bdb3b-e935-4498-9712-2757b1d99a6e	Final Exam	Don't cheat	test	1	t	\N	2026-09-03 10:04:12.493971+00	2026-09-03 10:04:12.493971+00
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, recipient_id, type, title, body, metadata, is_read, created_at) FROM stdin;
87e13bbf-e700-443c-a1c3-b7db4ae31c78	53724601-1ad3-4d8a-8c5d-1822d5edff37	query_reply	Reply to: Not able to purchase a course.	Money follows my brother.	{"query_id": "c82e95f9-0687-4478-ace4-35ed4934d6db"}	t	2026-09-03 11:18:37.209002+00
6681b246-3216-480b-bd7b-01214b6745e2	53724601-1ad3-4d8a-8c5d-1822d5edff37	query_reply	Reply to: Extra attempt request: Final Exam	Approved	{"query_id": "8ca9405b-5dbd-4b01-a44f-b3a88cd1ac2a"}	t	2026-09-04 10:45:56.101162+00
0841d6eb-efcb-4045-aac8-ceadc5c7b11f	53724601-1ad3-4d8a-8c5d-1822d5edff37	query_reply	Reply to: Extra attempt request: Final Exam	Approved	{"query_id": "8ca9405b-5dbd-4b01-a44f-b3a88cd1ac2a"}	t	2026-09-04 10:46:14.223973+00
849e8d40-47f6-4cca-8e90-59239c8b63d7	53724601-1ad3-4d8a-8c5d-1822d5edff37	query_reply	Reply to: Extra attempt request: Final Exam	1	{"query_id": "db6c4c7f-26df-47f4-b273-a118b293fcd8"}	t	2026-09-04 10:46:51.465931+00
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, student_id, course_id, amount, discount_amount, razorpay_order_id, razorpay_payment_id, razorpay_signature, status, refund_reason, invoice_number, created_at, updated_at) FROM stdin;
390e2028-ec7d-4ade-b739-5ff60f5376e8	53724601-1ad3-4d8a-8c5d-1822d5edff37	b69ccb15-7251-4c6e-90da-36457df1e69d	499.00	2500.00	order_TXWdHZHazpYayP	\N	\N	pending	\N	INV-1788430056472-O5CLZY	2026-09-03 10:07:36.520916+00	2026-09-03 10:07:36.520916+00
01f3c714-36a2-4280-9c8a-7e6582222878	53724601-1ad3-4d8a-8c5d-1822d5edff37	b69ccb15-7251-4c6e-90da-36457df1e69d	499.00	2500.00	order_TXWdbpi5exbVcB	pay_TXWdppsX1odjCu	2d28c09c5d0c321847516fbe9886f957e4b8da826fe80d4770503b60abb9e1bf	completed	\N	INV-1788430074938-AO06CG	2026-09-03 10:07:54.995892+00	2026-09-03 10:08:28.118322+00
22ec5d9d-88cd-41fc-90f3-b8f71199cf3f	53724601-1ad3-4d8a-8c5d-1822d5edff37	b69ccb15-7251-4c6e-90da-36457df1e69d	499.00	2500.00	order_TXWfLbAp3RLyjL	pay_TXWfjADi0HYicc	885c2eddb3e500531c588b7f82d8af94223339930d29f6359435080864b94e6d	completed	\N	INV-1788430173670-75NPZP	2026-09-03 10:09:33.717371+00	2026-09-03 10:10:14.737037+00
13ecf003-c59a-426c-9cda-1305a8b206bc	53724601-1ad3-4d8a-8c5d-1822d5edff37	b69ccb15-7251-4c6e-90da-36457df1e69d	499.00	2500.00	order_TXZmgP9IM8Xsg9	\N	\N	pending	\N	INV-1788441155174-301C4S	2026-09-03 13:12:35.239777+00	2026-09-03 13:12:35.239777+00
2a72f27b-7ae3-4e0b-8cab-c6ed05ee39ad	53724601-1ad3-4d8a-8c5d-1822d5edff37	b69ccb15-7251-4c6e-90da-36457df1e69d	499.00	2500.00	order_TXZnJxJTSfFHux	pay_TXZnfBloZEpWf1	a1466cd8414791bc37e75684d9bfe4b66d28f9f571a580ee04df328e81b91964	completed	\N	INV-1788441191391-5Y2UR8	2026-09-03 13:13:11.596954+00	2026-09-03 13:13:47.398281+00
51cc5c61-529a-43e6-8326-a6413e7d45fa	28d26a6e-09ca-4b69-8344-f3bfeb3f727f	b69ccb15-7251-4c6e-90da-36457df1e69d	499.00	2500.00	order_TXcmBmiiSRluIF	pay_TXcmQaqzolsiJ6	6dad1d4fe51401a85b0b85705b4840c88a8e371c55b26627b728d355cdf7c211	completed	\N	INV-1788451691971-HLX1ZF	2026-09-03 16:08:12.020535+00	2026-09-03 16:08:43.563102+00
\.


--
-- Data for Name: pdf_notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pdf_notes (id, lesson_id, file_path, file_size_bytes, page_count, created_at, updated_at) FROM stdin;
c5361f32-7393-4482-bcc9-ced12dc26e32	334a41eb-b540-4424-a28d-4fb47c2043da	dev-test-1/introduction/introduction.pdf	13264	\N	2026-09-03 13:56:33.370429+00	2026-09-03 13:56:33.370429+00
ae18e524-be54-44dc-948a-47b76767ebb4	057fb8c7-9935-43f3-aac2-8ae3f2a85beb	dev-test-1/phase-1/index-video-notes.pdf	13264	\N	2026-09-03 13:56:43.136004+00	2026-09-03 13:56:43.136004+00
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profiles (id, email, role, full_name, phone, avatar_url, is_active, created_at, updated_at, date_of_birth) FROM stdin;
f6099598-9bbe-4bed-97db-160f33287eff	mohan819.tp@gmail.com	student	Mohan	1111111111	https://lh3.googleusercontent.com/a/ACg8ocJbq4bwrWsjaBn_HPrZk1KTYdsZr-LkD2EPcAFL4PO1N_yQLQ=s96-c	t	2026-09-03 11:12:06.289157+00	2026-09-04 16:03:09.137858+00	2001-01-01
c7412dd5-8f70-4716-aa60-ac597baf36d7	technicalpilot@atomicmail.io	admin	Admin LMS	9876543210	\N	t	2026-08-23 13:01:58.216853+00	2026-08-23 13:13:05.178081+00	2001-01-01
53724601-1ad3-4d8a-8c5d-1822d5edff37	luck28kudida@atomicmail.io	student	Student	9898878700	\N	t	2026-09-03 07:18:58.7243+00	2026-09-03 07:18:58.90874+00	2001-01-01
28d26a6e-09ca-4b69-8344-f3bfeb3f727f	babumaan@atomicmail.io	student	Babbu Maan	9890879098	\N	t	2026-09-03 16:07:06.626196+00	2026-09-03 16:07:06.815097+00	2001-01-01
\.


--
-- Data for Name: progress; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.progress (id, student_id, lesson_id, status, progress_percent, last_position_seconds, completed_at, updated_at) FROM stdin;
1aa40d39-8f71-4162-9d96-4855b022f517	53724601-1ad3-4d8a-8c5d-1822d5edff37	5b5960b7-5f17-4bbe-a039-86f1ac52f214	completed	100	10	2026-09-03 10:35:53.454+00	2026-09-03 10:35:53.502861+00
831af19a-1246-434f-8bcb-f4f8e651923e	53724601-1ad3-4d8a-8c5d-1822d5edff37	057fb8c7-9935-43f3-aac2-8ae3f2a85beb	completed	100	0	2026-09-03 10:38:19.66+00	2026-09-03 10:38:19.749888+00
f9c77d6b-ed82-4812-9022-72aaa4652f6d	53724601-1ad3-4d8a-8c5d-1822d5edff37	53c2db7f-75ce-4542-96dd-1b7b44be6e86	completed	100	0	2026-09-03 10:45:49.498+00	2026-09-03 10:45:49.555677+00
c236f36d-c158-42bb-8f1e-027b9bd47fb3	53724601-1ad3-4d8a-8c5d-1822d5edff37	4cd21b04-b3b7-4b55-86c0-36cebaa76f01	completed	100	0	2026-09-03 10:58:30.812+00	2026-09-03 10:58:30.864339+00
e1b6ea81-1a31-4d6c-885e-44a7aaf842be	53724601-1ad3-4d8a-8c5d-1822d5edff37	1bac1f4d-ffe8-4f31-aeea-aaf1230d7ae1	in_progress	0	0	\N	2026-09-03 13:06:44.431921+00
638ab752-e89c-4236-86bb-47699b885340	28d26a6e-09ca-4b69-8344-f3bfeb3f727f	334a41eb-b540-4424-a28d-4fb47c2043da	completed	100	0	2026-09-03 16:09:16.892+00	2026-09-03 16:09:16.954533+00
895ce180-2779-47fd-a572-85004be3ae3f	28d26a6e-09ca-4b69-8344-f3bfeb3f727f	5b5960b7-5f17-4bbe-a039-86f1ac52f214	completed	100	11	2026-09-03 16:12:26.788+00	2026-09-03 16:12:26.855779+00
58bfae13-d379-4517-9892-b355a1f99cc4	28d26a6e-09ca-4b69-8344-f3bfeb3f727f	057fb8c7-9935-43f3-aac2-8ae3f2a85beb	completed	100	0	2026-09-03 16:12:39.596+00	2026-09-03 16:12:39.714345+00
e9a24548-d813-4175-b321-30d9ef09d7bb	28d26a6e-09ca-4b69-8344-f3bfeb3f727f	53c2db7f-75ce-4542-96dd-1b7b44be6e86	completed	100	0	2026-09-03 16:15:41.581+00	2026-09-03 16:15:41.737698+00
8737a009-5a8a-4e15-8d18-515543f8db89	53724601-1ad3-4d8a-8c5d-1822d5edff37	334a41eb-b540-4424-a28d-4fb47c2043da	completed	100	0	2026-09-03 10:31:40.523+00	2026-09-03 10:31:40.750162+00
\.


--
-- Data for Name: question_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.question_options (id, question_id, option_text, is_correct, sort_order, created_at, updated_at) FROM stdin;
3067d2c5-2151-40ba-8b3c-64526e0d1785	aea5fab9-9e44-4811-a371-c17299a3e606	Earth	f	1	2026-09-03 10:00:09.442374+00	2026-09-03 10:00:09.442374+00
e59b6c20-a4c6-4cf6-92fd-e5e06b4ab3c8	aea5fab9-9e44-4811-a371-c17299a3e606	Mars	t	2	2026-09-03 10:00:09.442374+00	2026-09-03 10:00:09.442374+00
2a65bba3-80bc-493b-9eab-3f492381f36f	aea5fab9-9e44-4811-a371-c17299a3e606	Jupiter	f	3	2026-09-03 10:00:09.442374+00	2026-09-03 10:00:09.442374+00
b1e02357-1341-4536-85cd-861bf68d8642	aea5fab9-9e44-4811-a371-c17299a3e606	Venus	f	4	2026-09-03 10:00:09.442374+00	2026-09-03 10:00:09.442374+00
a0ff7d12-fb26-4244-92f4-20cc0988bf26	1398a651-d743-4ccd-804a-a62dfbd97c57	Red	t	1	2026-09-03 10:00:09.74453+00	2026-09-03 10:00:09.74453+00
5a5d2258-fa1e-4415-83d6-7fe3473012b5	1398a651-d743-4ccd-804a-a62dfbd97c57	Blue	t	2	2026-09-03 10:00:09.74453+00	2026-09-03 10:00:09.74453+00
257fa75c-05ce-4b6b-9f4e-4051a097773b	1398a651-d743-4ccd-804a-a62dfbd97c57	Yellow	t	3	2026-09-03 10:00:09.74453+00	2026-09-03 10:00:09.74453+00
3d69a595-853f-40ba-89fd-f61e2ae8b576	1398a651-d743-4ccd-804a-a62dfbd97c57	Green	f	4	2026-09-03 10:00:09.74453+00	2026-09-03 10:00:09.74453+00
bf2c4d03-870b-4af6-bf7a-4e3951b764bc	2ed73770-908c-4276-9d20-9a21d0e0ec67	William Shakespeare	t	1	2026-09-03 10:00:10.233306+00	2026-09-03 10:00:10.233306+00
b9308a63-06bb-4fe4-96c2-77ed72096095	2ed73770-908c-4276-9d20-9a21d0e0ec67	Charles Dickens	f	2	2026-09-03 10:00:10.233306+00	2026-09-03 10:00:10.233306+00
6010af7f-2aa0-4531-81ab-41f907ff8ea0	2ed73770-908c-4276-9d20-9a21d0e0ec67	Mark Twain	f	3	2026-09-03 10:00:10.233306+00	2026-09-03 10:00:10.233306+00
64655673-9db9-41b9-ab63-74485f6c3f16	2ed73770-908c-4276-9d20-9a21d0e0ec67	Leo Tolstoy	f	4	2026-09-03 10:00:10.233306+00	2026-09-03 10:00:10.233306+00
2f1a02c9-c961-4db8-80d2-0f5eef40e6ac	ee83c331-5351-49ef-9941-eabe4befcffe	Dolphin	t	1	2026-09-03 10:00:10.57411+00	2026-09-03 10:00:10.57411+00
216c8d45-5bbd-4c58-bf96-0d9872688613	ee83c331-5351-49ef-9941-eabe4befcffe	Whale	t	2	2026-09-03 10:00:10.57411+00	2026-09-03 10:00:10.57411+00
4725ce4c-8d0d-4866-8a60-169eeb8b0214	ee83c331-5351-49ef-9941-eabe4befcffe	Shark	f	3	2026-09-03 10:00:10.57411+00	2026-09-03 10:00:10.57411+00
73ee9696-6a77-4ade-ae17-e59a207901de	ee83c331-5351-49ef-9941-eabe4befcffe	Bat	t	4	2026-09-03 10:00:10.57411+00	2026-09-03 10:00:10.57411+00
6be9d4ed-514d-4b49-a340-409df021330b	0d7da159-99ba-4947-9913-4c7b211a4768	Atlantic Ocean	f	1	2026-09-03 10:00:11.098161+00	2026-09-03 10:00:11.098161+00
e3220c22-44b1-4460-806b-9b64d2e7432a	0d7da159-99ba-4947-9913-4c7b211a4768	Indian Ocean	f	2	2026-09-03 10:00:11.098161+00	2026-09-03 10:00:11.098161+00
2c363ff5-f2a4-4a5f-87c9-6e18f576e170	0d7da159-99ba-4947-9913-4c7b211a4768	Pacific Ocean	t	3	2026-09-03 10:00:11.098161+00	2026-09-03 10:00:11.098161+00
21ae4fe6-3235-446f-a03d-e25e6a7ef2ea	0d7da159-99ba-4947-9913-4c7b211a4768	Arctic Ocean	f	4	2026-09-03 10:00:11.098161+00	2026-09-03 10:00:11.098161+00
a96da89e-1995-4ed2-b587-820af17d72d3	9bfd6548-3317-40f9-b932-9224298f67eb	12	t	1	2026-09-03 10:00:11.597672+00	2026-09-03 10:00:11.597672+00
746f59c9-11c4-40cd-aeb2-6ddf7b35a8a8	9bfd6548-3317-40f9-b932-9224298f67eb	17	f	2	2026-09-03 10:00:11.597672+00	2026-09-03 10:00:11.597672+00
8a9377d0-b188-4d99-9c56-8cd94c1f7356	9bfd6548-3317-40f9-b932-9224298f67eb	24	t	3	2026-09-03 10:00:11.597672+00	2026-09-03 10:00:11.597672+00
d2002b6b-d5db-43e7-95de-04fb346c902d	9bfd6548-3317-40f9-b932-9224298f67eb	30	t	4	2026-09-03 10:00:11.597672+00	2026-09-03 10:00:11.597672+00
c753ceb2-0e73-49cc-8c83-4bc6027e2ddd	577342ac-0921-4a70-af69-51dd51c16cc5	Carbon dioxide	f	1	2026-09-03 10:00:12.104352+00	2026-09-03 10:00:12.104352+00
d3afe42c-4b81-4202-aa4a-f506fda51831	577342ac-0921-4a70-af69-51dd51c16cc5	Oxygen	t	2	2026-09-03 10:00:12.104352+00	2026-09-03 10:00:12.104352+00
1ef41e80-98cb-4895-827b-f43036ce8f20	577342ac-0921-4a70-af69-51dd51c16cc5	Nitrogen	f	3	2026-09-03 10:00:12.104352+00	2026-09-03 10:00:12.104352+00
9192e759-76ec-468e-9476-0ed78ac44eba	577342ac-0921-4a70-af69-51dd51c16cc5	Hydrogen	f	4	2026-09-03 10:00:12.104352+00	2026-09-03 10:00:12.104352+00
658a0d0a-7158-45b8-b899-4711787bd4cc	a2ad7818-86a4-4427-964e-7aaa7c982fc1	6	f	1	2026-09-03 10:02:57.027917+00	2026-09-03 10:02:57.027917+00
2db18292-2c0c-423a-8509-453c47ff83e1	a2ad7818-86a4-4427-964e-7aaa7c982fc1	7	f	2	2026-09-03 10:02:57.027917+00	2026-09-03 10:02:57.027917+00
7f458630-4f5e-4182-a550-818db001e218	a2ad7818-86a4-4427-964e-7aaa7c982fc1	8	t	3	2026-09-03 10:02:57.027917+00	2026-09-03 10:02:57.027917+00
02715643-185b-451b-a998-c2d45e645e4c	a2ad7818-86a4-4427-964e-7aaa7c982fc1	9	f	4	2026-09-03 10:02:57.027917+00	2026-09-03 10:02:57.027917+00
a652798f-36bc-458e-8f8f-95f38f08bfe5	688be0e9-e7c6-4225-b961-9d6558dafee8	5	f	1	2026-09-03 10:02:57.357756+00	2026-09-03 10:02:57.357756+00
5e3b96ae-4b27-43d7-9ab9-14d589a87617	688be0e9-e7c6-4225-b961-9d6558dafee8	6	t	2	2026-09-03 10:02:57.357756+00	2026-09-03 10:02:57.357756+00
584daa4a-c509-4448-bbf7-22a36d6b8731	688be0e9-e7c6-4225-b961-9d6558dafee8	7	f	3	2026-09-03 10:02:57.357756+00	2026-09-03 10:02:57.357756+00
4f38b746-220a-4f1f-9f22-9c459e6717f0	688be0e9-e7c6-4225-b961-9d6558dafee8	8	f	4	2026-09-03 10:02:57.357756+00	2026-09-03 10:02:57.357756+00
d38b9cf5-e449-406c-b301-bc44b379aeb4	5de2753f-bca2-4fc0-bcc6-991b9b5317ca	10	f	1	2026-09-03 10:02:57.674476+00	2026-09-03 10:02:57.674476+00
e8fb152a-0dff-441d-b240-cbae5e7fd818	5de2753f-bca2-4fc0-bcc6-991b9b5317ca	12	t	2	2026-09-03 10:02:57.674476+00	2026-09-03 10:02:57.674476+00
8e2492b9-7f08-4074-8868-30018c42e3d7	5de2753f-bca2-4fc0-bcc6-991b9b5317ca	14	f	3	2026-09-03 10:02:57.674476+00	2026-09-03 10:02:57.674476+00
2c6bd051-e9af-4783-8b94-5d42fae09a58	5de2753f-bca2-4fc0-bcc6-991b9b5317ca	16	f	4	2026-09-03 10:02:57.674476+00	2026-09-03 10:02:57.674476+00
47a233bc-a2a9-4910-a341-4e456c554ab3	229afdbe-64c4-4843-b794-02f80c5de2da	2	f	1	2026-09-03 10:02:58.014577+00	2026-09-03 10:02:58.014577+00
44524eee-1d32-4ad0-8bcc-6164b491a0fa	229afdbe-64c4-4843-b794-02f80c5de2da	3	f	2	2026-09-03 10:02:58.014577+00	2026-09-03 10:02:58.014577+00
bbdce7c0-553d-4e9d-9227-4ea0e6ebff27	229afdbe-64c4-4843-b794-02f80c5de2da	4	t	3	2026-09-03 10:02:58.014577+00	2026-09-03 10:02:58.014577+00
65cf1464-2e69-4ccc-acf7-7353187ea933	229afdbe-64c4-4843-b794-02f80c5de2da	5	f	4	2026-09-03 10:02:58.014577+00	2026-09-03 10:02:58.014577+00
047cd70d-f57d-4bef-949b-bcf6d168755d	32048560-1e98-4079-b0f5-79cd3cb887ea	2	t	1	2026-09-03 10:02:58.771836+00	2026-09-03 10:02:58.771836+00
24f19573-f4e0-4cbe-9b70-b1d2624e7dfe	32048560-1e98-4079-b0f5-79cd3cb887ea	5	f	2	2026-09-03 10:02:58.771836+00	2026-09-03 10:02:58.771836+00
1f0fb9a1-e63e-46b6-b3e0-5c4b44051e61	32048560-1e98-4079-b0f5-79cd3cb887ea	8	t	3	2026-09-03 10:02:58.771836+00	2026-09-03 10:02:58.771836+00
d2bd37f1-72c6-4d94-9ff7-463fb8a00418	32048560-1e98-4079-b0f5-79cd3cb887ea	11	f	4	2026-09-03 10:02:58.771836+00	2026-09-03 10:02:58.771836+00
3aa474cc-fc41-4b1a-ac2e-b2a935459e4b	248133bc-ddcd-4877-be32-4335e8127b5c	4	f	1	2026-09-03 10:02:59.335704+00	2026-09-03 10:02:59.335704+00
2e6974b1-7b45-441d-99de-cc9ff37ec9ae	248133bc-ddcd-4877-be32-4335e8127b5c	5	f	2	2026-09-03 10:02:59.335704+00	2026-09-03 10:02:59.335704+00
7154111d-775b-46c5-bbe0-32af0f907800	248133bc-ddcd-4877-be32-4335e8127b5c	6	t	3	2026-09-03 10:02:59.335704+00	2026-09-03 10:02:59.335704+00
d1c88723-1de4-473f-a34d-ad8a804264dc	248133bc-ddcd-4877-be32-4335e8127b5c	7	f	4	2026-09-03 10:02:59.335704+00	2026-09-03 10:02:59.335704+00
3216b32f-d9a1-4d16-99a9-ce06d41d88fa	f606e7e2-272d-42e3-a62c-f6c0f2f4cfd7	10	f	1	2026-09-03 10:04:45.980459+00	2026-09-03 10:04:45.980459+00
f8453014-4b26-4955-af40-8cd1d8b2563b	f606e7e2-272d-42e3-a62c-f6c0f2f4cfd7	11	f	2	2026-09-03 10:04:45.980459+00	2026-09-03 10:04:45.980459+00
0f585f4d-15ba-4bcf-aad7-070e96790b73	f606e7e2-272d-42e3-a62c-f6c0f2f4cfd7	12	t	3	2026-09-03 10:04:45.980459+00	2026-09-03 10:04:45.980459+00
bf443366-b219-44e9-8a1e-a484f52844fd	f606e7e2-272d-42e3-a62c-f6c0f2f4cfd7	13	f	4	2026-09-03 10:04:45.980459+00	2026-09-03 10:04:45.980459+00
125997e5-7bb8-40e1-9661-0606c8492429	546dc101-fd21-4957-b3b5-be211bc0fa85	7	f	1	2026-09-03 10:04:46.294223+00	2026-09-03 10:04:46.294223+00
e37d4366-42b4-499b-91ce-0b0962e9162b	546dc101-fd21-4957-b3b5-be211bc0fa85	8	f	2	2026-09-03 10:04:46.294223+00	2026-09-03 10:04:46.294223+00
b4dff906-0afd-48c5-85a6-eeea7032cfa6	546dc101-fd21-4957-b3b5-be211bc0fa85	9	t	3	2026-09-03 10:04:46.294223+00	2026-09-03 10:04:46.294223+00
11d1a839-bed5-4334-9ac2-ba3be76efd56	546dc101-fd21-4957-b3b5-be211bc0fa85	10	f	4	2026-09-03 10:04:46.294223+00	2026-09-03 10:04:46.294223+00
f41de920-e9dc-4620-9395-376dcff4bc31	c52b4d37-5873-4955-9f45-d09289520f74	10	f	1	2026-09-03 10:04:46.609103+00	2026-09-03 10:04:46.609103+00
fe5ae987-0f03-4324-847f-2057d8bf67ce	c52b4d37-5873-4955-9f45-d09289520f74	12	t	2	2026-09-03 10:04:46.609103+00	2026-09-03 10:04:46.609103+00
0a93509a-5eba-4ec9-ba2e-8a959f55c1ec	c52b4d37-5873-4955-9f45-d09289520f74	14	f	3	2026-09-03 10:04:46.609103+00	2026-09-03 10:04:46.609103+00
eb13ca28-261f-44a6-a7e3-4bbb726a1926	c52b4d37-5873-4955-9f45-d09289520f74	16	f	4	2026-09-03 10:04:46.609103+00	2026-09-03 10:04:46.609103+00
d36f4bef-01f5-4e61-83d3-47f0dfb46ca8	aca23b43-a16f-4ffa-83a4-85ead9c45283	4	f	1	2026-09-03 10:04:46.928733+00	2026-09-03 10:04:46.928733+00
ef1c4074-742f-4a5b-9e82-6e3a746f2f5d	aca23b43-a16f-4ffa-83a4-85ead9c45283	5	t	2	2026-09-03 10:04:46.928733+00	2026-09-03 10:04:46.928733+00
c18b5acc-413d-479e-80b2-c032abba3261	aca23b43-a16f-4ffa-83a4-85ead9c45283	6	f	3	2026-09-03 10:04:46.928733+00	2026-09-03 10:04:46.928733+00
aba3c3f4-02d5-4052-99ff-f0d8fc38ef0b	aca23b43-a16f-4ffa-83a4-85ead9c45283	8	f	4	2026-09-03 10:04:46.928733+00	2026-09-03 10:04:46.928733+00
6f8730f9-0c8d-4134-ae30-0c38a1fe7a37	b4935fd9-5023-48c1-8353-f01d91773605	20	f	1	2026-09-03 10:04:47.693209+00	2026-09-03 10:04:47.693209+00
7e87b91e-2d2c-4081-aeea-163226ef8dc0	b4935fd9-5023-48c1-8353-f01d91773605	25	t	2	2026-09-03 10:04:47.693209+00	2026-09-03 10:04:47.693209+00
d24e4879-dbb9-42a6-8cca-094b02c7f186	b4935fd9-5023-48c1-8353-f01d91773605	30	f	3	2026-09-03 10:04:47.693209+00	2026-09-03 10:04:47.693209+00
850d96ce-4cf0-448f-bd4d-b73a003f565c	b4935fd9-5023-48c1-8353-f01d91773605	35	f	4	2026-09-03 10:04:47.693209+00	2026-09-03 10:04:47.693209+00
5c82044c-7bbc-4fec-a8a9-73fc8193d387	053401b6-102d-4e5b-aecd-ca70daa4a1cc	4	t	1	2026-09-03 10:04:48.230352+00	2026-09-03 10:04:48.230352+00
cf8b112e-6a12-4b7c-beef-81f37ad23da8	053401b6-102d-4e5b-aecd-ca70daa4a1cc	7	f	2	2026-09-03 10:04:48.230352+00	2026-09-03 10:04:48.230352+00
24d84ffd-8542-49a9-bba6-84efa9c6d00f	053401b6-102d-4e5b-aecd-ca70daa4a1cc	10	t	3	2026-09-03 10:04:48.230352+00	2026-09-03 10:04:48.230352+00
e97dabdd-7ad1-4806-952d-1b48d71ff0af	053401b6-102d-4e5b-aecd-ca70daa4a1cc	13	f	4	2026-09-03 10:04:48.230352+00	2026-09-03 10:04:48.230352+00
3c54e632-059a-4d8e-9522-8603c3e069b6	319b0b73-4da9-46b3-a405-17f9b53b9214	20	f	1	2026-09-03 10:04:48.534593+00	2026-09-03 10:04:48.534593+00
68161ab8-d130-429b-8954-43adf7e66910	319b0b73-4da9-46b3-a405-17f9b53b9214	25	t	2	2026-09-03 10:04:48.534593+00	2026-09-03 10:04:48.534593+00
317dff52-6386-414e-8433-f912336bfd68	319b0b73-4da9-46b3-a405-17f9b53b9214	30	f	3	2026-09-03 10:04:48.534593+00	2026-09-03 10:04:48.534593+00
ac371d61-31b5-418f-94b5-a16346aac3ff	319b0b73-4da9-46b3-a405-17f9b53b9214	35	f	4	2026-09-03 10:04:48.534593+00	2026-09-03 10:04:48.534593+00
55970999-daff-4d3c-be30-116f0071ead6	f830a89f-b422-45c0-ab0b-0065f5be046a	16	f	1	2026-09-03 10:04:48.850567+00	2026-09-03 10:04:48.850567+00
a90268fd-9985-4536-a15d-a87c0b5ce5e7	f830a89f-b422-45c0-ab0b-0065f5be046a	17	f	2	2026-09-03 10:04:48.850567+00	2026-09-03 10:04:48.850567+00
89f0bc45-102e-4af9-9698-3b8ea74948fe	f830a89f-b422-45c0-ab0b-0065f5be046a	18	t	3	2026-09-03 10:04:48.850567+00	2026-09-03 10:04:48.850567+00
f344db97-586c-4005-a648-d8ce40d32f8d	f830a89f-b422-45c0-ab0b-0065f5be046a	19	f	4	2026-09-03 10:04:48.850567+00	2026-09-03 10:04:48.850567+00
d7e2f4d5-c12a-401e-9f35-5545e6888807	51ad3e29-5c74-485b-affb-36d30fc487ac	7	f	1	2026-09-03 10:04:49.442503+00	2026-09-03 10:04:49.442503+00
543fb623-2172-49e4-87e9-02939c025472	51ad3e29-5c74-485b-affb-36d30fc487ac	8	f	2	2026-09-03 10:04:49.442503+00	2026-09-03 10:04:49.442503+00
308e1bbf-da94-4223-91f6-2c266e45f0a3	51ad3e29-5c74-485b-affb-36d30fc487ac	9	t	3	2026-09-03 10:04:49.442503+00	2026-09-03 10:04:49.442503+00
6fc29da9-a1c9-4950-b039-c2f00505a877	51ad3e29-5c74-485b-affb-36d30fc487ac	10	f	4	2026-09-03 10:04:49.442503+00	2026-09-03 10:04:49.442503+00
08d098b2-6c13-4faa-b4a7-795130a70ec4	489e7145-dd22-44b9-8e96-cc7cfaa59268	3	t	1	2026-09-03 10:04:50.008015+00	2026-09-03 10:04:50.008015+00
607188b0-34dc-4e47-b608-05747d468d13	489e7145-dd22-44b9-8e96-cc7cfaa59268	6	f	2	2026-09-03 10:04:50.008015+00	2026-09-03 10:04:50.008015+00
3a297573-c895-4fc6-8230-8d4766bda1b5	489e7145-dd22-44b9-8e96-cc7cfaa59268	9	t	3	2026-09-03 10:04:50.008015+00	2026-09-03 10:04:50.008015+00
3f525bf8-8e50-4fe4-93b4-08f9831bb834	489e7145-dd22-44b9-8e96-cc7cfaa59268	12	f	4	2026-09-03 10:04:50.008015+00	2026-09-03 10:04:50.008015+00
d57c5a1b-ecd3-435c-ba14-00f0f5527df5	9468f037-cea9-415a-89e0-7316dfe640b0	20	f	1	2026-09-03 10:04:50.322643+00	2026-09-03 10:04:50.322643+00
ff363a47-0fdf-4214-bd12-548edace03aa	9468f037-cea9-415a-89e0-7316dfe640b0	25	t	2	2026-09-03 10:04:50.322643+00	2026-09-03 10:04:50.322643+00
acf4faa1-52e7-4aac-9ef3-a2cc89611303	9468f037-cea9-415a-89e0-7316dfe640b0	30	f	3	2026-09-03 10:04:50.322643+00	2026-09-03 10:04:50.322643+00
6be60e58-87d7-4580-8fa3-b48474062a68	9468f037-cea9-415a-89e0-7316dfe640b0	35	f	4	2026-09-03 10:04:50.322643+00	2026-09-03 10:04:50.322643+00
142be33d-375e-488b-acea-8c5910dafd71	2caad995-85aa-4682-b19c-699cb807df0f	18	f	1	2026-09-03 10:04:51.162656+00	2026-09-03 10:04:51.162656+00
efa2b0c2-8917-41f1-9287-4409fc6e29ec	2caad995-85aa-4682-b19c-699cb807df0f	19	f	2	2026-09-03 10:04:51.162656+00	2026-09-03 10:04:51.162656+00
9904ab5f-dde7-4ee6-8594-35fd2a8f8ad8	2caad995-85aa-4682-b19c-699cb807df0f	20	t	3	2026-09-03 10:04:51.162656+00	2026-09-03 10:04:51.162656+00
f20275cf-155c-437f-9a3e-539353691cf1	2caad995-85aa-4682-b19c-699cb807df0f	21	f	4	2026-09-03 10:04:51.162656+00	2026-09-03 10:04:51.162656+00
5806f74d-cd6a-4450-897c-43c6f847cbc9	f59745bb-da32-42f4-9290-a957fca9e7ac	12	f	1	2026-09-03 10:04:50.641236+00	2026-09-03 10:04:50.641236+00
2140bbdd-5723-4ce6-a828-46995bcdfd2e	f59745bb-da32-42f4-9290-a957fca9e7ac	14	t	2	2026-09-03 10:04:50.641236+00	2026-09-03 10:04:50.641236+00
0d808e95-664b-4137-8ba8-cdd680de4078	f59745bb-da32-42f4-9290-a957fca9e7ac	16	f	3	2026-09-03 10:04:50.641236+00	2026-09-03 10:04:50.641236+00
d672c9f0-60d8-41bd-91aa-4de8d5a045d4	f59745bb-da32-42f4-9290-a957fca9e7ac	18	f	4	2026-09-03 10:04:50.641236+00	2026-09-03 10:04:50.641236+00
0a322b2a-f51f-4e87-a502-90353712b8f2	92e236cc-2ec9-4048-84ce-eb16758b8653	12	f	1	2026-09-03 10:04:51.666497+00	2026-09-03 10:04:51.666497+00
37e8d359-8a1c-4e7e-b289-b708d53b71ee	92e236cc-2ec9-4048-84ce-eb16758b8653	18	t	2	2026-09-03 10:04:51.666497+00	2026-09-03 10:04:51.666497+00
6338192b-c87a-425e-b67a-72cc5bb284d7	92e236cc-2ec9-4048-84ce-eb16758b8653	15	f	3	2026-09-03 10:04:51.666497+00	2026-09-03 10:04:51.666497+00
84caf120-4db3-4324-ba7f-998b1cdf50da	92e236cc-2ec9-4048-84ce-eb16758b8653	10	f	4	2026-09-03 10:04:51.666497+00	2026-09-03 10:04:51.666497+00
7377b3a2-1a4c-4dc1-a314-93db8f497de0	6e815844-2d32-4ffe-aec8-2657945fab3c	2	f	1	2026-09-03 10:04:52.52389+00	2026-09-03 10:04:52.52389+00
fd0a1463-67e7-4a82-bee6-2aaa0b331abc	6e815844-2d32-4ffe-aec8-2657945fab3c	4	f	2	2026-09-03 10:04:52.52389+00	2026-09-03 10:04:52.52389+00
8734905a-d737-40d0-a46b-1b6c4fae57ae	6e815844-2d32-4ffe-aec8-2657945fab3c	5	t	3	2026-09-03 10:04:52.52389+00	2026-09-03 10:04:52.52389+00
17f7707d-38e2-4f6d-88a4-805d31ab4879	6e815844-2d32-4ffe-aec8-2657945fab3c	6	f	4	2026-09-03 10:04:52.52389+00	2026-09-03 10:04:52.52389+00
9c9f1b0a-f6db-41d1-bf63-2a6bf8972df7	ca985c56-dc6a-4ec2-a245-16c5dded4098	2	f	1	2026-09-03 10:04:52.208635+00	2026-09-03 10:04:52.208635+00
2970fcc1-2294-422a-8d60-5a055dade1fc	ca985c56-dc6a-4ec2-a245-16c5dded4098	3	f	2	2026-09-03 10:04:52.208635+00	2026-09-03 10:04:52.208635+00
623c231d-dc5c-4bd6-93d1-1778017b6fea	ca985c56-dc6a-4ec2-a245-16c5dded4098	4	t	3	2026-09-03 10:04:52.208635+00	2026-09-03 10:04:52.208635+00
e268d66a-b68b-4a87-9a51-75b4ed3cf882	ca985c56-dc6a-4ec2-a245-16c5dded4098	5	f	4	2026-09-03 10:04:52.208635+00	2026-09-03 10:04:52.208635+00
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.questions (id, test_id, question_text, question_type, points, explanation, sort_order, created_at, updated_at, assignment_id, question_number, correct_text_answer, topic) FROM stdin;
5de2753f-bca2-4fc0-bcc6-991b9b5317ca	\N	What is 6 × 2?	mcq	1	6 × 2 = 12.	3	2026-09-03 10:02:57.465384+00	2026-09-03 10:02:57.465384+00	fa60ed95-9f3f-439d-8995-2035c2a4be66	3	\N	Multiplication
229afdbe-64c4-4843-b794-02f80c5de2da	\N	What is 20 ÷ 5?	mcq	1	20 ÷ 5 = 4.	4	2026-09-03 10:02:57.78343+00	2026-09-03 10:02:57.78343+00	fa60ed95-9f3f-439d-8995-2035c2a4be66	4	\N	Division
4c20995b-a65e-43fd-8c3c-7bb8da845a5f	\N	What is 7 + 6?	text	1	7 + 6 = 13.	5	2026-09-03 10:02:58.125251+00	2026-09-03 10:02:58.125251+00	fa60ed95-9f3f-439d-8995-2035c2a4be66	5	13	Addition
d805e6a2-de60-46c9-9aaf-876c34c7bae6	\N	What is 15 - 7?	text	1	15 - 7 = 8.	6	2026-09-03 10:02:58.334122+00	2026-09-03 10:02:58.334122+00	fa60ed95-9f3f-439d-8995-2035c2a4be66	6	8	Subtraction
32048560-1e98-4079-b0f5-79cd3cb887ea	\N	Which of these numbers are even?	msq	1	2 and 8 are even numbers because they are divisible by 2.	7	2026-09-03 10:02:58.55479+00	2026-09-03 10:02:58.55479+00	fa60ed95-9f3f-439d-8995-2035c2a4be66	7	\N	Numbers
db837c56-8ac1-4d21-b451-9beeef6f6af7	\N	What is 3 × 5?	text	1	3 × 5 = 15.	8	2026-09-03 10:02:58.882626+00	2026-09-03 10:02:58.882626+00	fa60ed95-9f3f-439d-8995-2035c2a4be66	8	15	Multiplication
248133bc-ddcd-4877-be32-4335e8127b5c	\N	What is 18 ÷ 3?	mcq	1	18 ÷ 3 = 6.	9	2026-09-03 10:02:59.12634+00	2026-09-03 10:02:59.12634+00	fa60ed95-9f3f-439d-8995-2035c2a4be66	9	\N	Division
4ac5b110-47bf-4868-89f5-ac8c438b720f	\N	What is 9 + 10?	text	1	9 + 10 = 19.	10	2026-09-03 10:02:59.440673+00	2026-09-03 10:02:59.440673+00	fa60ed95-9f3f-439d-8995-2035c2a4be66	10	19	Addition
f606e7e2-272d-42e3-a62c-f6c0f2f4cfd7	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 7 + 5?	mcq	1	7 + 5 = 12.	1	2026-09-03 10:04:45.776129+00	2026-09-03 10:04:45.776129+00	\N	1	\N	Addition
aea5fab9-9e44-4811-a371-c17299a3e606	\N	Which planet is known as the Red Planet?	mcq	1	Mars is called the Red Planet because of its reddish appearance caused by iron oxide on its surface.	1	2026-09-03 10:00:09.229183+00	2026-09-03 10:00:09.229183+00	604ce706-9cad-41e1-ada6-5d8c0f491b1d	1	\N	Science
1398a651-d743-4ccd-804a-a62dfbd97c57	\N	Which of the following are primary colors?	msq	1	In the traditional RYB color model, red, blue, and yellow are primary colors.	2	2026-09-03 10:00:09.549294+00	2026-09-03 10:00:09.549294+00	604ce706-9cad-41e1-ada6-5d8c0f491b1d	2	\N	Art
b0e6adc8-0582-4611-ab34-9051bdc4c37f	\N	What is 15 × 4?	text	2	15 multiplied by 4 equals 60.	3	2026-09-03 10:00:09.845052+00	2026-09-03 10:00:09.845052+00	604ce706-9cad-41e1-ada6-5d8c0f491b1d	3	60	Mathematics
2ed73770-908c-4276-9d20-9a21d0e0ec67	\N	Who wrote the play Romeo and Juliet?	mcq	1	William Shakespeare wrote the famous tragedy Romeo and Juliet.	4	2026-09-03 10:00:10.038665+00	2026-09-03 10:00:10.038665+00	604ce706-9cad-41e1-ada6-5d8c0f491b1d	4	\N	Literature
ee83c331-5351-49ef-9941-eabe4befcffe	\N	Which of these are mammals?	msq	1	Dolphins, whales, and bats are mammals. Sharks are fish.	5	2026-09-03 10:00:10.331654+00	2026-09-03 10:00:10.331654+00	604ce706-9cad-41e1-ada6-5d8c0f491b1d	5	\N	Biology
76b5147d-51aa-4aed-855e-c4b0023a4261	\N	What is the chemical symbol for water?	text	2	Water is made up of two hydrogen atoms and one oxygen atom, giving it the formula H2O.	6	2026-09-03 10:00:10.68098+00	2026-09-03 10:00:10.68098+00	604ce706-9cad-41e1-ada6-5d8c0f491b1d	6	H2O	Chemistry
0d7da159-99ba-4947-9913-4c7b211a4768	\N	Which is the largest ocean on Earth?	mcq	1	The Pacific Ocean is the largest and deepest ocean on Earth.	7	2026-09-03 10:00:10.870862+00	2026-09-03 10:00:10.870862+00	604ce706-9cad-41e1-ada6-5d8c0f491b1d	7	\N	Geography
9bfd6548-3317-40f9-b932-9224298f67eb	\N	Which numbers are even?	msq	1	Even numbers are divisible by 2 without a remainder. 12, 24, and 30 are even.	8	2026-09-03 10:00:11.304034+00	2026-09-03 10:00:11.304034+00	604ce706-9cad-41e1-ada6-5d8c0f491b1d	8	\N	Mathematics
577342ac-0921-4a70-af69-51dd51c16cc5	\N	What gas do humans primarily breathe in to survive?	mcq	1	Humans need oxygen for cellular respiration and energy production.	9	2026-09-03 10:00:11.863051+00	2026-09-03 10:00:11.863051+00	604ce706-9cad-41e1-ada6-5d8c0f491b1d	9	\N	Biology
7f1f8226-2483-4187-ae76-a6f662eae25e	\N	What is the capital of India?	text	2	New Delhi is the capital city of India.	10	2026-09-03 10:00:12.340995+00	2026-09-03 10:00:12.340995+00	604ce706-9cad-41e1-ada6-5d8c0f491b1d	10	New Delhi	Geography
a2ad7818-86a4-4427-964e-7aaa7c982fc1	\N	What is 5 + 3?	mcq	1	5 + 3 = 8.	1	2026-09-03 10:02:56.797575+00	2026-09-03 10:02:56.797575+00	fa60ed95-9f3f-439d-8995-2035c2a4be66	1	\N	Addition
688be0e9-e7c6-4225-b961-9d6558dafee8	\N	What is 10 - 4?	mcq	1	10 - 4 = 6.	2	2026-09-03 10:02:57.132806+00	2026-09-03 10:02:57.132806+00	fa60ed95-9f3f-439d-8995-2035c2a4be66	2	\N	Subtraction
546dc101-fd21-4957-b3b5-be211bc0fa85	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 15 - 6?	mcq	1	15 - 6 = 9.	2	2026-09-03 10:04:46.087118+00	2026-09-03 10:04:46.087118+00	\N	2	\N	Subtraction
c52b4d37-5873-4955-9f45-d09289520f74	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 4 × 3?	mcq	1	4 × 3 = 12.	3	2026-09-03 10:04:46.408637+00	2026-09-03 10:04:46.408637+00	\N	3	\N	Multiplication
aca23b43-a16f-4ffa-83a4-85ead9c45283	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 20 ÷ 4?	mcq	1	20 ÷ 4 = 5.	4	2026-09-03 10:04:46.721954+00	2026-09-03 10:04:46.721954+00	\N	4	\N	Division
21e093ac-1a04-493d-b250-d100456f5a1c	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 9 + 8?	text	1	9 + 8 = 17.	5	2026-09-03 10:04:47.029379+00	2026-09-03 10:04:47.029379+00	\N	5	17	Addition
364aef29-db0d-489c-b22c-092845aaaa02	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 18 - 9?	text	1	18 - 9 = 9.	6	2026-09-03 10:04:47.246948+00	2026-09-03 10:04:47.246948+00	\N	6	9	Subtraction
b4935fd9-5023-48c1-8353-f01d91773605	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 5 × 5?	mcq	1	5 × 5 = 25.	7	2026-09-03 10:04:47.456774+00	2026-09-03 10:04:47.456774+00	\N	7	\N	Multiplication
450c6d0e-f1aa-4739-ad99-dd185b347152	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 36 ÷ 6?	text	1	36 ÷ 6 = 6.	8	2026-09-03 10:04:47.812766+00	2026-09-03 10:04:47.812766+00	\N	8	6	Division
053401b6-102d-4e5b-aecd-ca70daa4a1cc	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	Which numbers are even?	msq	1	4 and 10 are even numbers.	9	2026-09-03 10:04:48.01125+00	2026-09-03 10:04:48.01125+00	\N	9	\N	Numbers
319b0b73-4da9-46b3-a405-17f9b53b9214	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 10 + 15?	mcq	1	10 + 15 = 25.	10	2026-09-03 10:04:48.327165+00	2026-09-03 10:04:48.327165+00	\N	10	\N	Addition
f830a89f-b422-45c0-ab0b-0065f5be046a	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 30 - 12?	mcq	1	30 - 12 = 18.	11	2026-09-03 10:04:48.641866+00	2026-09-03 10:04:48.641866+00	\N	11	\N	Subtraction
8af996f9-0e06-488c-bb3a-a330cf7eb998	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 6 × 4?	text	1	6 × 4 = 24.	12	2026-09-03 10:04:48.98611+00	2026-09-03 10:04:48.98611+00	\N	12	24	Multiplication
51ad3e29-5c74-485b-affb-36d30fc487ac	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 45 ÷ 5?	mcq	1	45 ÷ 5 = 9.	13	2026-09-03 10:04:49.224743+00	2026-09-03 10:04:49.224743+00	\N	13	\N	Division
c4ff60df-b925-4b76-8f6b-a4761758bf10	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 25 + 25?	text	1	25 + 25 = 50.	14	2026-09-03 10:04:49.542714+00	2026-09-03 10:04:49.542714+00	\N	14	50	Addition
489e7145-dd22-44b9-8e96-cc7cfaa59268	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	Which numbers are odd?	msq	1	3 and 9 are odd numbers.	15	2026-09-03 10:04:49.770365+00	2026-09-03 10:04:49.770365+00	\N	15	\N	Numbers
9468f037-cea9-415a-89e0-7316dfe640b0	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 40 - 15?	mcq	1	40 - 15 = 25.	16	2026-09-03 10:04:50.116163+00	2026-09-03 10:04:50.116163+00	\N	16	\N	Subtraction
f59745bb-da32-42f4-9290-a957fca9e7ac	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 7 × 2?	mcq	1	7 × 2 = 14.	17	2026-09-03 10:04:50.433954+00	2026-09-03 10:04:50.433954+00	\N	17	\N	Multiplication
8736db98-8221-4678-9f9d-75e235ec2180	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 50 ÷ 10?	text	1	50 ÷ 10 = 5.	18	2026-09-03 10:04:50.759251+00	2026-09-03 10:04:50.759251+00	\N	18	5	Division
2caad995-85aa-4682-b19c-699cb807df0f	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 11 + 9?	mcq	1	11 + 9 = 20.	19	2026-09-03 10:04:50.959622+00	2026-09-03 10:04:50.959622+00	\N	19	\N	Addition
71856755-1079-4bbe-99ad-769ef7025f4d	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 27 - 7?	text	1	27 - 7 = 20.	20	2026-09-03 10:04:51.266237+00	2026-09-03 10:04:51.266237+00	\N	20	20	Subtraction
92e236cc-2ec9-4048-84ce-eb16758b8653	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	Which number is greater?	mcq	1	18 is greater than 12, 15, and 10.	21	2026-09-03 10:04:51.472915+00	2026-09-03 10:04:51.472915+00	\N	21	\N	Numbers
6f08f949-5f4a-45aa-82d0-87252b499fe7	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 3 × 8?	text	1	3 × 8 = 24.	22	2026-09-03 10:04:51.770609+00	2026-09-03 10:04:51.770609+00	\N	22	24	Multiplication
ca985c56-dc6a-4ec2-a245-16c5dded4098	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 32 ÷ 8?	mcq	1	32 ÷ 8 = 4.	23	2026-09-03 10:04:52.011287+00	2026-09-03 10:04:52.011287+00	\N	23	\N	Division
6e815844-2d32-4ffe-aec8-2657945fab3c	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is half of 10?	mcq	1	Half of 10 is 5.	24	2026-09-03 10:04:52.31208+00	2026-09-03 10:04:52.31208+00	\N	24	\N	Fractions
bb5248cd-fcf5-4881-aefc-8e826b70ca09	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	What is 100 - 50?	text	1	100 - 50 = 50.	25	2026-09-03 10:04:52.633904+00	2026-09-03 10:04:52.633904+00	\N	25	50	Subtraction
\.


--
-- Data for Name: student_queries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_queries (id, student_id, subject, body, status, admin_reply, replied_by, replied_at, created_at, updated_at, type, metadata) FROM stdin;
c82e95f9-0687-4478-ace4-35ed4934d6db	53724601-1ad3-4d8a-8c5d-1822d5edff37	Not able to purchase a course.	How to bypass purchasing.	answered	Money follows my brother.	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-03 11:18:37.047+00	2026-09-03 11:18:15.379013+00	2026-09-03 11:18:37.095819+00	general	{}
8ca9405b-5dbd-4b01-a44f-b3a88cd1ac2a	53724601-1ad3-4d8a-8c5d-1822d5edff37	Extra attempt request: Final Exam	All attempts have been used without a passing score. Requesting one additional attempt.	answered	Approved	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-04 10:46:14.033+00	2026-09-04 10:45:20.262114+00	2026-09-04 10:46:14.087271+00	extra_attempt_request	{"test_id": "24b1ad10-e1a9-413a-ac3a-eda72cd0d77a", "lesson_id": "1bac1f4d-ffe8-4f31-aeea-aaf1230d7ae1", "attempts_used": 2, "assessment_type": "test"}
db6c4c7f-26df-47f4-b273-a118b293fcd8	53724601-1ad3-4d8a-8c5d-1822d5edff37	Extra attempt request: Final Exam	All attempts have been used without a passing score. Requesting one additional attempt.	answered	1	c7412dd5-8f70-4716-aa60-ac597baf36d7	2026-09-04 10:46:51.308+00	2026-09-04 10:46:30.788635+00	2026-09-04 10:46:51.365794+00	extra_attempt_request	{"test_id": "24b1ad10-e1a9-413a-ac3a-eda72cd0d77a", "lesson_id": "1bac1f4d-ffe8-4f31-aeea-aaf1230d7ae1", "attempts_used": 2, "assessment_type": "test"}
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
163fc897-ac8a-4f45-b839-493eacc24f00	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	53724601-1ad3-4d8a-8c5d-1822d5edff37	2026-09-03 10:58:58.014+00	2026-09-03 11:01:04.185+00	0	25	126	2026-09-03 10:58:58.073044+00	2026-09-03 13:06:44.215961+00
ace7139c-0892-4645-acf7-40c368584515	24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	53724601-1ad3-4d8a-8c5d-1822d5edff37	2026-09-04 10:43:32.718+00	2026-09-04 10:44:31.28+00	9	25	59	2026-09-04 10:43:32.848624+00	2026-09-04 10:44:31.336723+00
\.


--
-- Data for Name: tests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tests (id, lesson_id, title, time_limit_seconds, passing_score_percent, max_attempts, created_at, updated_at) FROM stdin;
24b1ad10-e1a9-413a-ac3a-eda72cd0d77a	1bac1f4d-ffe8-4f31-aeea-aaf1230d7ae1	Final Exam	600	85	2	2026-09-03 10:04:35.868692+00	2026-09-03 10:04:35.868692+00
\.


--
-- Data for Name: video_lessons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.video_lessons (id, lesson_id, vdocipher_video_id, duration_seconds, thumbnail_url, created_at, updated_at) FROM stdin;
d0783eaf-43bf-41c5-9b0b-161691a30672	5b5960b7-5f17-4bbe-a039-86f1ac52f214	10b50c878b1948c4a93558da19728113	\N	\N	2026-09-03 13:48:56.240769+00	2026-09-03 13:48:56.240769+00
\.


--
-- Data for Name: video_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.video_sessions (id, user_id, lesson_id, ip_address, user_agent, created_at, expires_at) FROM stdin;
17757de1-493f-449a-8a23-aef4b794626f	28d26a6e-09ca-4b69-8344-f3bfeb3f727f	5b5960b7-5f17-4bbe-a039-86f1ac52f214	35.171.22.115, 172.71.124.246, 10.30.142.240	node	2026-09-03 16:11:46.295237+00	2026-09-03 17:11:46.242+00
bd8e2c4e-0a5a-4510-9211-ff0c09b231f1	28d26a6e-09ca-4b69-8344-f3bfeb3f727f	5b5960b7-5f17-4bbe-a039-86f1ac52f214	35.171.22.115, 172.71.124.246, 10.30.142.240	node	2026-09-03 16:11:55.04085+00	2026-09-03 17:11:54.998+00
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
-- Name: student_queries Students insert own queries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students insert own queries" ON public.student_queries FOR INSERT WITH CHECK ((student_id = auth.uid()));


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

\unrestrict qJI0tzRQUcnho50QtT9kf9bpLUTmjgGGkiDo4Xmi0YQ7FA3w50C4b4b2hG6vOe5

