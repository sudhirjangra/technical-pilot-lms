--
-- PostgreSQL database dump
--

\restrict 75rQZNo4MZ1fmhtM3pedwl9wZ2BmRFvtTVAuICxOW7vQ2c5CY5lQOTMD3VBkgoN

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
    due_days_after_enrollment integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


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
    test_id uuid NOT NULL,
    question_text text NOT NULL,
    question_type text NOT NULL,
    points integer DEFAULT 1 NOT NULL,
    explanation text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT questions_question_type_check CHECK ((question_type = ANY (ARRAY['mcq'::text, 'text'::text])))
);


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
-- Data for Name: assignment_submissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assignment_submissions (id, assignment_id, student_id, file_path, submitted_at, score, feedback, updated_at) FROM stdin;
\.


--
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assignments (id, lesson_id, title, instructions, max_score, due_days_after_enrollment, created_at, updated_at) FROM stdin;
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
19a3cbdc-4617-4ae5-98cc-d981db020514	Vdo Cipher	vdocipher	\N	\N	0	t
\.


--
-- Data for Name: chapters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chapters (id, course_id, title, description, sort_order, is_published, created_at, updated_at) FROM stdin;
1604483d-52ea-4c7c-9437-e1dec3df5632	f3869b09-ae23-4b18-95d6-5d9872eea075	TEst	test	1	t	2026-08-23 13:13:37.278107+00	2026-08-23 13:13:37.278107+00
046a5ab0-8728-48cd-9b2e-f97472767e4d	7da3947c-9498-4fae-897c-f5ee6b44a9ff	Chapter-1	Upload through UI	1	t	2026-08-26 16:18:06.458827+00	2026-08-26 16:18:06.458827+00
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.courses (id, category_id, title, slug, description, thumbnail_url, price, discount_price, status, created_by, published_at, created_at, updated_at) FROM stdin;
f3869b09-ae23-4b18-95d6-5d9872eea075	19a3cbdc-4617-4ae5-98cc-d981db020514	Test cource	test-vdocipher	Je;;p	\N	0.00	\N	published	c7412dd5-8f70-4716-aa60-ac597baf36d7	\N	2026-08-23 13:06:24.754891+00	2026-08-23 13:06:24.754891+00
7da3947c-9498-4fae-897c-f5ee6b44a9ff	19a3cbdc-4617-4ae5-98cc-d981db020514	How to create a course	how-to-create-a-course	Okay I'm testing this course for the first time on preview.	\N	0.00	\N	archived	c7412dd5-8f70-4716-aa60-ac597baf36d7	\N	2026-08-26 14:01:07.092112+00	2026-08-27 13:19:56.645432+00
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.devices (id, user_id, device_fingerprint, device_name, platform, last_active_at, created_at) FROM stdin;
c5202758-d59c-4d39-8bf2-dc98e90445ef	c9ca39a2-7b90-42b6-bec9-4a725913d208	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM5Y2EzOWEyLTdiOTAtNDJiNi1iZWM5LTRhNzI1OTEzZDIwOCIsImVtYWlsIjoibHVjazI4a3VkaWRhQGF0b21pY21haWwuaW8iLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc4Nzc1MjU3NCwiZXhwIjoxNzkwMzQ0NTc0fQ.jI1vymq_nVW3r-NlWiZjWOwz-X-NjVW-RapV8XGLexs	K	web	2026-08-26 13:56:14.314072+00	2026-08-26 13:56:14.314072+00
83e8cdf0-0ae1-4f13-bce6-966c9d96e687	c7412dd5-8f70-4716-aa60-ac597baf36d7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM3NDEyZGQ1LThmNzAtNDcxNi1hYTYwLWFjNTk3YmFmMzZkNyIsImVtYWlsIjoidGVjaG5pY2FscGlsb3RAYXRvbWljbWFpbC5pbyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4Nzc1Mjc0MSwiZXhwIjoxNzkwMzQ0NzQxfQ.UJ3_Jxc14EjQ-En6FY-75quCc1Je74VCJL1bC_0hnh4	unknown	web	2026-08-26 13:59:02.187918+00	2026-08-26 13:59:02.187918+00
1e7a5fe4-0301-4c8e-b05e-a6344cd86045	c7412dd5-8f70-4716-aa60-ac597baf36d7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM3NDEyZGQ1LThmNzAtNDcxNi1hYTYwLWFjNTk3YmFmMzZkNyIsImVtYWlsIjoidGVjaG5pY2FscGlsb3RAYXRvbWljbWFpbC5pbyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4NzgzNjU5NSwiZXhwIjoxNzkwNDI4NTk1fQ.bFp50jBrWMwTOH1I_KdgIDHUvSz1SIWhj70rhm8611E	unknown	web	2026-08-27 13:16:35.922953+00	2026-08-27 13:16:35.922953+00
7ecf96d6-9ff3-41c3-b0f7-c2a641d5ac1e	c7412dd5-8f70-4716-aa60-ac597baf36d7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM3NDEyZGQ1LThmNzAtNDcxNi1hYTYwLWFjNTk3YmFmMzZkNyIsImVtYWlsIjoidGVjaG5pY2FscGlsb3RAYXRvbWljbWFpbC5pbyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4NzgzNzEzNiwiZXhwIjoxNzkwNDI5MTM2fQ.XaggobJ7RyiNkN9qPWNgLWNP2tpVkSrIEZb-EUYYs3E	unknown	web	2026-08-27 13:25:36.936011+00	2026-08-27 13:25:36.936011+00
0b38e925-28f1-4604-8ca3-191636dad0c9	c7412dd5-8f70-4716-aa60-ac597baf36d7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM3NDEyZGQ1LThmNzAtNDcxNi1hYTYwLWFjNTk3YmFmMzZkNyIsImVtYWlsIjoidGVjaG5pY2FscGlsb3RAYXRvbWljbWFpbC5pbyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4NzgzNzM2NywiZXhwIjoxNzkwNDI5MzY3fQ.XNlsMsYZf2Yq27lff4uLfeWJiyfA1zMXtmvtFzFzrWQ	unknown	web	2026-08-27 13:29:28.058766+00	2026-08-27 13:29:28.058766+00
\.


--
-- Data for Name: doubt_bookings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doubt_bookings (id, slot_id, student_id, status, booked_at, cancelled_at, meeting_link, updated_at) FROM stdin;
\.


--
-- Data for Name: doubt_slots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doubt_slots (id, created_by, date, start_time, end_time, duration_minutes, max_bookings, current_bookings, status, updated_at, created_at) FROM stdin;
\.


--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enrollments (id, student_id, course_id, enrolled_at, status, completed_at, updated_at) FROM stdin;
af019732-919c-4790-9925-aa297960ee16	c7412dd5-8f70-4716-aa60-ac597baf36d7	f3869b09-ae23-4b18-95d6-5d9872eea075	2026-08-23 13:07:45.715677+00	active	\N	2026-08-23 13:07:45.715677+00
4d5c5688-cc08-441d-aeb5-b3cb9921728e	b67cd6f9-8a60-44a2-950f-dc2265a60f41	f3869b09-ae23-4b18-95d6-5d9872eea075	2026-08-25 03:33:38.578125+00	active	\N	2026-08-25 03:33:38.578125+00
65571203-ed88-442c-a1e1-c598c211345d	82d8c298-faab-4d13-a427-8597e6828be6	f3869b09-ae23-4b18-95d6-5d9872eea075	2026-08-26 11:44:57.166039+00	active	\N	2026-08-26 11:44:57.166039+00
\.


--
-- Data for Name: lessons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lessons (id, chapter_id, title, description, lesson_type, sort_order, is_published, duration_seconds, created_at, updated_at) FROM stdin;
1b88108c-bc55-4f3e-b13a-4c2f3c99fea2	1604483d-52ea-4c7c-9437-e1dec3df5632	Chapter-2	\N	video	4	t	\N	2026-08-23 13:20:20.509402+00	2026-08-23 13:20:20.509402+00
a48df103-3c6a-4214-b832-3bf096c4552c	046a5ab0-8728-48cd-9b2e-f97472767e4d	PDF	\N	pdf	1	t	\N	2026-08-27 13:30:21.602072+00	2026-08-27 13:30:21.602072+00
c5c0b322-d8f9-4c96-91f2-fe7cbc041203	1604483d-52ea-4c7c-9437-e1dec3df5632	Publish PDF	\N	pdf	2	t	\N	2026-08-27 13:38:45.851153+00	2026-08-27 13:38:45.851153+00
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
9aeb21cf-fd3d-4d8f-81b3-8a9ace88961c	a48df103-3c6a-4214-b832-3bf096c4552c	how-to-create-a-course/chapter-1/pdf.pdf	238707	\N	2026-08-27 13:30:23.858103+00	2026-08-27 13:30:23.858103+00
2befc637-ccbf-43ce-b6fc-2ec93bb5307f	c5c0b322-d8f9-4c96-91f2-fe7cbc041203	test-vdocipher/test/publish-pdf.pdf	238707	\N	2026-08-27 13:38:48.193873+00	2026-08-27 13:38:48.193873+00
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profiles (id, email, role, full_name, phone, avatar_url, is_active, created_at, updated_at, date_of_birth) FROM stdin;
c7412dd5-8f70-4716-aa60-ac597baf36d7	technicalpilot@atomicmail.io	admin	Admin LMS	9876543210	\N	t	2026-08-23 13:01:58.216853+00	2026-08-23 13:13:05.178081+00	2001-01-01
b67cd6f9-8a60-44a2-950f-dc2265a60f41	officialuse7055@gmail.com	student	Sachin Jangra	9898656565	https://lh3.googleusercontent.com/a/ACg8ocIGqJlhPNJ2d99hv3tYX7yoa6xPYEKxT8MDkmd5HIHbkTEobw=s96-c	t	2026-08-24 14:04:14.342902+00	2026-08-25 03:30:48.286541+00	2003-02-01
82d8c298-faab-4d13-a427-8597e6828be6	mohan819.tp@gmail.com	student	Mohan	9638574105	https://lh3.googleusercontent.com/a/ACg8ocJbq4bwrWsjaBn_HPrZk1KTYdsZr-LkD2EPcAFL4PO1N_yQLQ=s96-c	t	2026-08-26 11:44:03.492284+00	2026-08-26 11:44:43.525541+00	2003-02-01
c9ca39a2-7b90-42b6-bec9-4a725913d208	luck28kudida@atomicmail.io	student	luck28kudida	9898878776	\N	t	2026-08-23 03:51:52.979661+00	2026-08-26 13:54:24.804627+00	1995-06-22
\.


--
-- Data for Name: progress; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.progress (id, student_id, lesson_id, status, progress_percent, last_position_seconds, completed_at, updated_at) FROM stdin;
51862018-b622-4209-8a62-6c0579d2156f	c7412dd5-8f70-4716-aa60-ac597baf36d7	1b88108c-bc55-4f3e-b13a-4c2f3c99fea2	completed	100	167	2026-08-25 02:57:58.616+00	2026-08-25 02:57:58.945982+00
\.


--
-- Data for Name: question_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.question_options (id, question_id, option_text, is_correct, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.questions (id, test_id, question_text, question_type, points, explanation, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sub_admin_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sub_admin_permissions (id, user_id, permissions, granted_by, created_at, updated_at) FROM stdin;
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
\.


--
-- Data for Name: video_lessons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.video_lessons (id, lesson_id, vdocipher_video_id, duration_seconds, thumbnail_url, created_at, updated_at) FROM stdin;
ddbf39b3-985a-4604-8d79-22f1d53b4fdf	1b88108c-bc55-4f3e-b13a-4c2f3c99fea2	6aa136af9ffdb92a186953216084757c	\N	\N	2026-08-23 13:20:35.766542+00	2026-08-23 13:20:35.766542+00
\.


--
-- Data for Name: video_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.video_sessions (id, user_id, lesson_id, ip_address, user_agent, created_at, expires_at) FROM stdin;
bed0019b-192d-4037-896b-6375480019d6	c7412dd5-8f70-4716-aa60-ac597baf36d7	1b88108c-bc55-4f3e-b13a-4c2f3c99fea2	127.0.0.1	node	2026-08-23 13:20:56.654799+00	2026-08-23 14:20:56.55+00
7f057fc4-55b8-4174-ae53-a0cfda6c74cd	c7412dd5-8f70-4716-aa60-ac597baf36d7	1b88108c-bc55-4f3e-b13a-4c2f3c99fea2	127.0.0.1	node	2026-08-25 02:57:44.466813+00	2026-08-25 03:57:44.078+00
\.


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
-- Name: idx_questions_test_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_test_id ON public.questions USING btree (test_id);


--
-- Name: idx_sub_admin_permissions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_admin_permissions_user_id ON public.sub_admin_permissions USING btree (user_id);


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
-- Name: test_attempts Admin reads all attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all attempts" ON public.test_attempts FOR SELECT USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));


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

CREATE POLICY "Enrolled students read question options" ON public.question_options FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((((public.questions q
     JOIN public.tests t ON ((t.id = q.test_id)))
     JOIN public.lessons l ON ((l.id = t.lesson_id)))
     JOIN public.chapters ch ON ((ch.id = l.chapter_id)))
     JOIN public.enrollments e ON ((e.course_id = ch.course_id)))
  WHERE ((q.id = question_options.question_id) AND (e.student_id = auth.uid()) AND (e.status = 'active'::public.enrollment_status)))));


--
-- Name: questions Enrolled students read questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enrolled students read questions" ON public.questions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (((public.tests t
     JOIN public.lessons l ON ((l.id = t.lesson_id)))
     JOIN public.chapters ch ON ((ch.id = l.chapter_id)))
     JOIN public.enrollments e ON ((e.course_id = ch.course_id)))
  WHERE ((t.id = questions.test_id) AND (e.student_id = auth.uid()) AND (e.status = 'active'::public.enrollment_status)))));


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
-- Name: test_attempts Students insert own attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students insert own attempts" ON public.test_attempts FOR INSERT WITH CHECK ((auth.uid() = student_id));


--
-- Name: doubt_bookings Students insert own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students insert own bookings" ON public.doubt_bookings FOR INSERT WITH CHECK ((auth.uid() = student_id));


--
-- Name: progress Students insert own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students insert own progress" ON public.progress FOR INSERT WITH CHECK ((auth.uid() = student_id));


--
-- Name: assignment_submissions Students insert own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students insert own submissions" ON public.assignment_submissions FOR INSERT WITH CHECK ((auth.uid() = student_id));


--
-- Name: test_attempts Students manage own attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students manage own attempts" ON public.test_attempts USING ((auth.uid() = student_id));


--
-- Name: assignment_submissions Students manage own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students manage own submissions" ON public.assignment_submissions USING ((auth.uid() = student_id));


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
-- Name: sub_admin_permissions sub_admin_permissions_service_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sub_admin_permissions_service_all ON public.sub_admin_permissions USING ((auth.role() = 'service_role'::text));


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

\unrestrict 75rQZNo4MZ1fmhtM3pedwl9wZ2BmRFvtTVAuICxOW7vQ2c5CY5lQOTMD3VBkgoN