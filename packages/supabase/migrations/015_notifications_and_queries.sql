-- Migration 015: notifications and student_queries tables
-- Adds in-app notifications and a student help-desk / query system.

-- ============================================================
-- 1. notifications table
-- ============================================================
CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON COLUMN public.notifications.type IS 'One of: course_added, offer, congratulation, announcement, assignment_due, query_reply';

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(recipient_id) WHERE is_read = false;

-- ============================================================
-- 2. student_queries table
-- ============================================================
CREATE TABLE public.student_queries (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  status text DEFAULT 'open'::text NOT NULL,
  admin_reply text,
  replied_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  replied_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT student_queries_status_check CHECK (status IN ('open', 'answered', 'closed'))
);

CREATE INDEX idx_student_queries_student ON public.student_queries(student_id);
CREATE INDEX idx_student_queries_status ON public.student_queries(status);

-- ============================================================
-- 3. Triggers
-- ============================================================
CREATE TRIGGER student_queries_updated_at
  BEFORE UPDATE ON public.student_queries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 4. Enable RLS
-- ============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_queries ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS Policies — notifications
-- ============================================================

-- Admin / sub-admin can read all notifications
CREATE POLICY "Admin reads all notifications"
  ON public.notifications
  FOR SELECT
  USING (public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role]));

-- Students can read their own notifications
CREATE POLICY "Students read own notifications"
  ON public.notifications
  FOR SELECT
  USING (recipient_id = auth.uid());

-- ============================================================
-- 6. RLS Policies — student_queries
-- ============================================================

-- Admin / sub-admin can read all queries
CREATE POLICY "Admin reads all queries"
  ON public.student_queries
  FOR SELECT
  USING (public.get_my_role() = ANY (ARRAY['admin'::public.user_role, 'sub_admin'::public.user_role]));

-- Students can read their own queries
CREATE POLICY "Students read own queries"
  ON public.student_queries
  FOR SELECT
  USING (student_id = auth.uid());

-- Students can insert their own queries
CREATE POLICY "Students insert own queries"
  ON public.student_queries
  FOR INSERT
  WITH CHECK (student_id = auth.uid());
