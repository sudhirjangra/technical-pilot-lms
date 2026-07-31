-- Migration 006: Doubt sessions

CREATE TABLE IF NOT EXISTS public.doubt_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  max_bookings INTEGER NOT NULL DEFAULT 1 CHECK (max_bookings > 0),
  current_bookings INTEGER NOT NULL DEFAULT 0 CHECK (current_bookings >= 0),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'full', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.doubt_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.doubt_slots(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  booked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  meeting_link TEXT,
  UNIQUE(slot_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_doubt_slots_date ON public.doubt_slots(date);
CREATE INDEX IF NOT EXISTS idx_doubt_slots_status ON public.doubt_slots(status);
CREATE INDEX IF NOT EXISTS idx_doubt_slots_created_by ON public.doubt_slots(created_by);
CREATE INDEX IF NOT EXISTS idx_doubt_bookings_slot_id ON public.doubt_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_doubt_bookings_student_id ON public.doubt_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_doubt_bookings_status ON public.doubt_bookings(status);

ALTER TABLE public.doubt_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubt_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY doubt_slots_service_all ON public.doubt_slots
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY doubt_slots_read ON public.doubt_slots
  FOR SELECT USING (true);

CREATE POLICY doubt_bookings_service_all ON public.doubt_bookings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY doubt_bookings_student_select ON public.doubt_bookings
  FOR SELECT USING (auth.uid() = student_id);

CREATE TRIGGER doubt_slots_updated_at BEFORE UPDATE ON public.doubt_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
