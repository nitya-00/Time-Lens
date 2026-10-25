ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timeZone" TEXT NOT NULL DEFAULT 'UTC';

-- Categories are now personal data. Global reference rows remain readable, but
-- an authenticated Supabase user may only read their own personal rows.
DROP POLICY IF EXISTS "Category_authenticated_read" ON "Category";
CREATE POLICY "Category_select_own_or_global"
  ON "Category" FOR SELECT TO authenticated
  USING ("userId" IS NULL OR public.is_current_app_user("userId"));
