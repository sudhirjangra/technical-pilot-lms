-- Migration 016: Add targeting and meeting link to doubt_slots
ALTER TABLE public.doubt_slots
  ADD COLUMN IF NOT EXISTS meeting_link text,
  ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_doubt_slots_course_id ON public.doubt_slots USING btree (course_id);
CREATE INDEX IF NOT EXISTS idx_doubt_slots_student_id ON public.doubt_slots USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_doubt_slots_target_type ON public.doubt_slots USING btree (target_type);
