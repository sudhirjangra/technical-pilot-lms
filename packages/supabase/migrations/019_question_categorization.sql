-- Migration 019: Question Categorization (TP-ANALYSIS-001)
-- Adds question_category, question_difficulty, and subtopic columns to public.questions

ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS question_category text;

ALTER TABLE public.questions
ALTER COLUMN question_category DROP DEFAULT;

ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS question_difficulty text;

ALTER TABLE public.questions
ALTER COLUMN question_difficulty DROP DEFAULT;

ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS subtopic text;

-- Add check constraint for question_difficulty if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'questions_question_difficulty_check'
    ) THEN
        ALTER TABLE public.questions
        ADD CONSTRAINT questions_question_difficulty_check
        CHECK (question_difficulty IS NULL OR question_difficulty IN ('easy', 'medium', 'hard'));
    END IF;
END $$;

COMMENT ON COLUMN public.questions.question_category IS 'Cognitive question type category: reasoning, calculation, numerical, conceptual, other or custom admin category';
COMMENT ON COLUMN public.questions.question_difficulty IS 'Difficulty level: easy, medium, hard';
COMMENT ON COLUMN public.questions.subtopic IS 'Optional subtopic or section name within the topic';

