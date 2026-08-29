-- Migration 010: MSQ-based Assignments & Tests
-- Run this in the Supabase SQL editor (or psql) against the project database.
-- Extends the existing questions/tests/assignments schema so that BOTH
-- assignments and tests are quiz-style (MCQ single-select / MSQ multi-select),
-- with timing, marks, attempts and optional explanations.

BEGIN;

-- 1. questions: allow a question to belong to either a test OR an assignment
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE;

ALTER TABLE public.questions
  ALTER COLUMN test_id DROP NOT NULL;

ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE public.questions
  ADD CONSTRAINT questions_question_type_check
  CHECK (question_type = ANY (ARRAY['mcq'::text, 'msq'::text, 'text'::tex t]));

ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_parent_xor_check;
ALTER TABLE public.questions
  ADD CONSTRAINT questions_parent_xor_check
  CHECK (num_nonnulls(test_id, assignment_id) = 1);

CREATE INDEX IF NOT EXISTS idx_questions_assignment_id ON public.questions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_questions_test_id ON public.questions(test_id);

-- 2. assignments: add timing/attempts/passing score so assignments behave like tests
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS time_limit_seconds integer,
  ADD COLUMN IF NOT EXISTS passing_score_percent integer DEFAULT 60 NOT NULL,
  ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 1 NOT NULL;

-- 3. assignment_attempts (mirrors test_attempts)
CREATE TABLE IF NOT EXISTS public.assignment_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    score integer,
    max_score integer,
    time_spent_seconds integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_assignment ON public.assignment_attempts(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_student ON public.assignment_attempts(student_id);

-- 4. assignment_answers (mirrors test_answers; no single selected_option_id since MSQ needs multiple)
CREATE TABLE IF NOT EXISTS public.assignment_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    attempt_id uuid NOT NULL REFERENCES public.assignment_attempts(id) ON DELETE CASCADE,
    question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    text_answer text,
    is_correct boolean,
    time_spent_seconds integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assignment_answers_attempt ON public.assignment_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_assignment_answers_question ON public.assignment_answers(question_id);

-- 5. Junction tables for multi-select answers (both tests and assignments are MSQ-capable)
CREATE TABLE IF NOT EXISTS public.test_answer_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    test_answer_id uuid NOT NULL REFERENCES public.test_answers(id) ON DELETE CASCADE,
    option_id uuid NOT NULL REFERENCES public.question_options(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (test_answer_id, option_id)
);
CREATE INDEX IF NOT EXISTS idx_test_answer_options_answer ON public.test_answer_options(test_answer_id);

CREATE TABLE IF NOT EXISTS public.assignment_answer_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    assignment_answer_id uuid NOT NULL REFERENCES public.assignment_answers(id) ON DELETE CASCADE,
    option_id uuid NOT NULL REFERENCES public.question_options(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (assignment_answer_id, option_id)
);
CREATE INDEX IF NOT EXISTS idx_assignment_answer_options_answer ON public.assignment_answer_options(assignment_answer_id);

COMMENT ON COLUMN public.test_answers.selected_option_id IS 'Deprecated: single-option legacy column. Use test_answer_options for MCQ/MSQ selections.';

-- 6. RLS: enable + policies for the new tables (mirrors existing test_* policy style)
ALTER TABLE public.assignment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_answer_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_answer_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin reads all assignment attempts" ON public.assignment_attempts;
CREATE POLICY "Admin reads all assignment attempts" ON public.assignment_attempts FOR SELECT
  USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));

DROP POLICY IF EXISTS "Students manage own assignment attempts" ON public.assignment_attempts;
CREATE POLICY "Students manage own assignment attempts" ON public.assignment_attempts
  USING ((auth.uid() = student_id));

DROP POLICY IF EXISTS "Students insert own assignment attempts" ON public.assignment_attempts;
CREATE POLICY "Students insert own assignment attempts" ON public.assignment_attempts FOR INSERT
  WITH CHECK ((auth.uid() = student_id));

DROP POLICY IF EXISTS "Admin reads all assignment answers" ON public.assignment_answers;
CREATE POLICY "Admin reads all assignment answers" ON public.assignment_answers FOR SELECT
  USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));

DROP POLICY IF EXISTS "Students select own assignment answers" ON public.assignment_answers;
CREATE POLICY "Students select own assignment answers" ON public.assignment_answers FOR SELECT
  USING ((EXISTS (SELECT 1 FROM public.assignment_attempts aa WHERE aa.id = assignment_answers.attempt_id AND aa.student_id = auth.uid())));

DROP POLICY IF EXISTS "Students insert own assignment answers" ON public.assignment_answers;
CREATE POLICY "Students insert own assignment answers" ON public.assignment_answers FOR INSERT
  WITH CHECK ((EXISTS (SELECT 1 FROM public.assignment_attempts aa WHERE aa.id = assignment_answers.attempt_id AND aa.student_id = auth.uid())));

DROP POLICY IF EXISTS "Students update own assignment answers" ON public.assignment_answers;
CREATE POLICY "Students update own assignment answers" ON public.assignment_answers FOR UPDATE
  USING ((EXISTS (SELECT 1 FROM public.assignment_attempts aa WHERE aa.id = assignment_answers.attempt_id AND aa.student_id = auth.uid())));

DROP POLICY IF EXISTS "Students manage own test answer options" ON public.test_answer_options;
CREATE POLICY "Students manage own test answer options" ON public.test_answer_options
  USING ((EXISTS (
    SELECT 1 FROM public.test_answers ta
    JOIN public.test_attempts t ON t.id = ta.attempt_id
    WHERE ta.id = test_answer_options.test_answer_id AND t.student_id = auth.uid()
  )));

DROP POLICY IF EXISTS "Admin reads all test answer options" ON public.test_answer_options;
CREATE POLICY "Admin reads all test answer options" ON public.test_answer_options FOR SELECT
  USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));

DROP POLICY IF EXISTS "Students manage own assignment answer options" ON public.assignment_answer_options;
CREATE POLICY "Students manage own assignment answer options" ON public.assignment_answer_options
  USING ((EXISTS (
    SELECT 1 FROM public.assignment_answers aa
    JOIN public.assignment_attempts a ON a.id = aa.attempt_id
    WHERE aa.id = assignment_answer_options.assignment_answer_id AND a.student_id = auth.uid()
  )));

DROP POLICY IF EXISTS "Admin reads all assignment answer options" ON public.assignment_answer_options;
CREATE POLICY "Admin reads all assignment answer options" ON public.assignment_answer_options FOR SELECT
  USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));

-- 7. Extend question/question_options read policies to cover the assignment path too
DROP POLICY IF EXISTS "Enrolled students read questions" ON public.questions;
CREATE POLICY "Enrolled students read questions" ON public.questions FOR SELECT USING (
  (EXISTS (
    SELECT 1 FROM public.tests t
    JOIN public.lessons l ON l.id = t.lesson_id
    JOIN public.chapters ch ON ch.id = l.chapter_id
    JOIN public.enrollments e ON e.course_id = ch.course_id
    WHERE t.id = questions.test_id AND e.student_id = auth.uid() AND e.status = 'active'::public.enrollment_status
  ))
  OR
  (EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.lessons l ON l.id = a.lesson_id
    JOIN public.chapters ch ON ch.id = l.chapter_id
    JOIN public.enrollments e ON e.course_id = ch.course_id
    WHERE a.id = questions.assignment_id AND e.student_id = auth.uid() AND e.status = 'active'::public.enrollment_status
  ))
);

DROP POLICY IF EXISTS "Enrolled students read question options" ON public.question_options;
CREATE POLICY "Enrolled students read question options" ON public.question_options FOR SELECT USING (
  (EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.tests t ON t.id = q.test_id
    JOIN public.lessons l ON l.id = t.lesson_id
    JOIN public.chapters ch ON ch.id = l.chapter_id
    JOIN public.enrollments e ON e.course_id = ch.course_id
    WHERE q.id = question_options.question_id AND e.student_id = auth.uid() AND e.status = 'active'::public.enrollment_status
  ))
  OR
  (EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.assignments a ON a.id = q.assignment_id
    JOIN public.lessons l ON l.id = a.lesson_id
    JOIN public.chapters ch ON ch.id = l.chapter_id
    JOIN public.enrollments e ON e.course_id = ch.course_id
    WHERE q.id = question_options.question_id AND e.student_id = auth.uid() AND e.status = 'active'::public.enrollment_status
  ))
);

COMMIT;
