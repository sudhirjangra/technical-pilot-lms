-- Migration 016:
--   1. public `course-media` storage bucket for course / category thumbnails
--   2. per-student extra assessment attempt grants + the request queue fields on student_queries

-- ============================================================
-- 1. course-media storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-media',
  'course-media',
  true,
  10485760, -- 10 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read course media" ON storage.objects;
CREATE POLICY "Public read course media"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'course-media');

DROP POLICY IF EXISTS "Admins write course media" ON storage.objects;
CREATE POLICY "Admins write course media"
  ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'course-media'
    AND public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])
  )
  WITH CHECK (
    bucket_id = 'course-media'
    AND public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role])
  );

-- ============================================================
-- 2. assessment_attempt_grants
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assessment_attempt_grants (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE,
  test_id uuid REFERENCES public.tests(id) ON DELETE CASCADE,
  extra_attempts integer DEFAULT 0 NOT NULL,
  granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT assessment_attempt_grants_target_check
    CHECK (num_nonnulls(assignment_id, test_id) = 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attempt_grants_assignment
  ON public.assessment_attempt_grants(student_id, assignment_id)
  WHERE assignment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_attempt_grants_test
  ON public.assessment_attempt_grants(student_id, test_id)
  WHERE test_id IS NOT NULL;

ALTER TABLE public.assessment_attempt_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students read own attempt grants" ON public.assessment_attempt_grants;
CREATE POLICY "Students read own attempt grants"
  ON public.assessment_attempt_grants
  FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Admin reads all attempt grants" ON public.assessment_attempt_grants;
CREATE POLICY "Admin reads all attempt grants"
  ON public.assessment_attempt_grants
  FOR SELECT
  USING (public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role]));

-- ============================================================
-- 3. student_queries: typed requests (e.g. extra attempt requests)
-- ============================================================
ALTER TABLE public.student_queries
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'general' NOT NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb NOT NULL;

COMMENT ON COLUMN public.student_queries.type IS 'One of: general, extra_attempt_request';
COMMENT ON COLUMN public.student_queries.metadata IS 'Request payload, e.g. { assignment_id, test_id, lesson_id }';

CREATE INDEX IF NOT EXISTS idx_student_queries_type ON public.student_queries(type);
