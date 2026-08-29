-- Migration 011: Chapter-start based assignment due dates + explicit question numbers
-- Run AFTER 010_msq_assignments_tests.sql.
-- Run this in the Supabase SQL editor (or psql) against the project database.

BEGIN;

-- 1. Assignment due dates now count from the moment a student STARTS the
--    assignment's chapter, not from enrollment. `due_days_after_enrollment`
--    is renamed so the semantics are unambiguous.
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS due_days_after_start integer;

UPDATE public.assignments
  SET due_days_after_start = due_days_after_enrollment
  WHERE due_days_after_start IS NULL
    AND due_days_after_enrollment IS NOT NULL;

ALTER TABLE public.assignments
  DROP COLUMN IF EXISTS due_days_after_enrollment;

COMMENT ON COLUMN public.assignments.due_days_after_start IS
  'Days allowed after the student starts the parent chapter (see chapter_starts). NULL = no due date.';

-- 2. chapter_starts: records when a student pressed "Start now" on a chapter.
--    This is the anchor date for every assignment due date inside that chapter.
CREATE TABLE IF NOT EXISTS public.chapter_starts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    student_id uuid NOT NULL,
    chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (student_id, chapter_id)
);
CREATE INDEX IF NOT EXISTS idx_chapter_starts_student ON public.chapter_starts(student_id);
CREATE INDEX IF NOT EXISTS idx_chapter_starts_chapter ON public.chapter_starts(chapter_id);

ALTER TABLE public.chapter_starts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own chapter starts" ON public.chapter_starts;
CREATE POLICY "Students manage own chapter starts" ON public.chapter_starts
  USING ((auth.uid() = student_id));

DROP POLICY IF EXISTS "Students insert own chapter starts" ON public.chapter_starts;
CREATE POLICY "Students insert own chapter starts" ON public.chapter_starts FOR INSERT
  WITH CHECK ((auth.uid() = student_id));

DROP POLICY IF EXISTS "Admin reads all chapter starts" ON public.chapter_starts;
CREATE POLICY "Admin reads all chapter starts" ON public.chapter_starts FOR SELECT
  USING ((public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])));

-- 3. Explicit, admin-settable question numbers. `sort_order` stays the ordering
--    key; `question_number` is what is displayed to the student and is what the
--    CSV/XLSX/JSON import template supplies.
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS question_number integer;

UPDATE public.questions q
  SET question_number = sub.rn
  FROM (
    SELECT id, row_number() OVER (
      PARTITION BY COALESCE(test_id, assignment_id) ORDER BY sort_order, created_at
    ) AS rn
    FROM public.questions
  ) AS sub
  WHERE q.id = sub.id AND q.question_number IS NULL;

COMMENT ON COLUMN public.questions.question_number IS
  'Admin-facing question number shown to students. Defaults to position; may be set explicitly on import.';

-- 4. Correct answer for free-text questions. MCQ/MSQ answers live in
--    question_options.is_correct; text questions had nowhere to store theirs.
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS correct_text_answer text;

COMMENT ON COLUMN public.questions.correct_text_answer IS
  'Expected answer for question_type = text. NULL for mcq/msq questions.';

COMMIT;
