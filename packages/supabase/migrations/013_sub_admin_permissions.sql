CREATE TABLE IF NOT EXISTS sub_admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  permissions text[] NOT NULL DEFAULT '{}',
  granted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_admin_permissions_user_id ON sub_admin_permissions(user_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_sub_admin_permissions_updated_at ON sub_admin_permissions;
CREATE TRIGGER set_sub_admin_permissions_updated_at
  BEFORE UPDATE ON sub_admin_permissions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE sub_admin_permissions ENABLE ROW LEVEL SECURITY;

-- Service role (NestJS admin ops) bypasses RLS; sub-admins may read their own permission row.
DROP POLICY IF EXISTS "sub_admin_permissions_self_read" ON sub_admin_permissions;
CREATE POLICY "sub_admin_permissions_self_read" ON sub_admin_permissions
  FOR SELECT USING (auth.uid() = user_id);
