-- Migration 017: Allow student_queries to support guest contact submissions
ALTER TABLE public.student_queries
  ALTER COLUMN student_id DROP NOT NULL;

