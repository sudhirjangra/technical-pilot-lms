-- Migration 005: Sub-admin permissions

CREATE TABLE IF NOT EXISTS public.sub_admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  granted_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_sub_admin_permissions_user_id ON public.sub_admin_permissions(user_id);

ALTER TABLE public.sub_admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sub_admin_permissions_service_all ON public.sub_admin_permissions
  FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER sub_admin_permissions_updated_at BEFORE UPDATE ON public.sub_admin_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
