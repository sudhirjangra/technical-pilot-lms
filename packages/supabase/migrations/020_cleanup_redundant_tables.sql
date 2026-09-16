-- Migration 020: Cleanup Redundant Assessment Answer Tables (TP-ARCH-001)
-- Assessment attempt snapshots (questions, options, answers, explanations, scoring, breakdowns)
-- are authoritatively and immutably stored in MongoDB.
-- The normalized per-question and per-option answer rows in PostgreSQL are no longer needed.

-- 1. Drop junction tables first (foreign keys to parent answer tables)
DROP TABLE IF EXISTS public.test_answer_options CASCADE;
DROP TABLE IF EXISTS public.assignment_answer_options CASCADE;

-- 2. Drop per-question answer tables
DROP TABLE IF EXISTS public.test_answers CASCADE;
DROP TABLE IF EXISTS public.assignment_answers CASCADE;

-- 3. Update comments on attempt pointer tables
COMMENT ON TABLE public.test_attempts IS 'Relational reference for test attempts. Complete frozen question snapshots, answers, and scoring are stored authoritatively in MongoDB.';
COMMENT ON TABLE public.assignment_attempts IS 'Relational reference for assignment attempts. Complete frozen question snapshots, answers, and scoring are stored authoritatively in MongoDB.';
