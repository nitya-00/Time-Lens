-- Link application profiles to Supabase Auth without exposing profiles or password hashes
-- through the Data API. Existing rows are deliberately left unlinked: they must be
-- paired explicitly with the correct auth.users row.
ALTER TABLE "User" ADD COLUMN "authUserId" UUID;
ALTER TABLE "User" ADD CONSTRAINT "User_authUserId_fkey"
  FOREIGN KEY ("authUserId") REFERENCES auth.users(id) ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");

-- The functions encapsulate the User-to-auth.users mapping. SECURITY DEFINER is
-- required because User itself deliberately has no Data API policy (it contains
-- passwordHash). They return only an ownership boolean and are executable only
-- by authenticated callers.
CREATE FUNCTION public.is_current_app_user(target_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."User" u
    WHERE u.id = target_user_id
      AND u."authUserId" = auth.uid()
  );
$$;

CREATE FUNCTION public.owns_daily_log(target_daily_log_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."DailyLog" d
    JOIN public."User" u ON u.id = d."userId"
    WHERE d.id = target_daily_log_id
      AND u."authUserId" = auth.uid()
  );
$$;

CREATE FUNCTION public.owns_goal(target_goal_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."Goal" g
    JOIN public."User" u ON u.id = g."userId"
    WHERE g.id = target_goal_id
      AND u."authUserId" = auth.uid()
  );
$$;

CREATE FUNCTION public.owns_challenge(target_challenge_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."Challenge" c
    JOIN public."User" u ON u.id = c."userId"
    WHERE c.id = target_challenge_id
      AND u."authUserId" = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_app_user(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owns_daily_log(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owns_goal(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owns_challenge(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_app_user(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_daily_log(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_goal(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_challenge(TEXT) TO authenticated;

ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HourlyBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Goal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GoalCheckIn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HabitOverride" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Challenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChallengeDay" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reminder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CheckIn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Experiment" ENABLE ROW LEVEL SECURITY;

-- The Data API must never expose passwordHash or application account records.
REVOKE ALL ON TABLE "User" FROM anon, authenticated;
REVOKE ALL ON TABLE "_prisma_migrations" FROM anon, authenticated;

-- Category is shared reference data. Authenticated users may read it, but cannot
-- change it through the Data API.
REVOKE ALL ON TABLE "Category" FROM anon, authenticated;
GRANT SELECT ON TABLE "Category" TO authenticated;
CREATE POLICY "Category_authenticated_read"
  ON "Category" FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- Direct owner tables.
REVOKE ALL ON TABLE "DailyLog", "Goal", "HabitOverride", "Challenge", "Reminder", "CheckIn", "Experiment" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE "DailyLog", "Goal", "HabitOverride", "Challenge", "Reminder", "CheckIn", "Experiment" TO authenticated;
GRANT DELETE ON TABLE "Goal" TO authenticated;

CREATE POLICY "DailyLog_select_own" ON "DailyLog" FOR SELECT TO authenticated USING (public.is_current_app_user("userId"));
CREATE POLICY "DailyLog_insert_own" ON "DailyLog" FOR INSERT TO authenticated WITH CHECK (public.is_current_app_user("userId"));
CREATE POLICY "DailyLog_update_own" ON "DailyLog" FOR UPDATE TO authenticated USING (public.is_current_app_user("userId")) WITH CHECK (public.is_current_app_user("userId"));

CREATE POLICY "Goal_select_own" ON "Goal" FOR SELECT TO authenticated USING (public.is_current_app_user("userId"));
CREATE POLICY "Goal_insert_own" ON "Goal" FOR INSERT TO authenticated WITH CHECK (public.is_current_app_user("userId"));
CREATE POLICY "Goal_update_own" ON "Goal" FOR UPDATE TO authenticated USING (public.is_current_app_user("userId")) WITH CHECK (public.is_current_app_user("userId"));
CREATE POLICY "Goal_delete_own" ON "Goal" FOR DELETE TO authenticated USING (public.is_current_app_user("userId"));

CREATE POLICY "HabitOverride_select_own" ON "HabitOverride" FOR SELECT TO authenticated USING (public.is_current_app_user("userId"));
CREATE POLICY "HabitOverride_insert_own" ON "HabitOverride" FOR INSERT TO authenticated WITH CHECK (public.is_current_app_user("userId"));
CREATE POLICY "HabitOverride_update_own" ON "HabitOverride" FOR UPDATE TO authenticated USING (public.is_current_app_user("userId")) WITH CHECK (public.is_current_app_user("userId"));

CREATE POLICY "Challenge_select_own" ON "Challenge" FOR SELECT TO authenticated USING (public.is_current_app_user("userId"));
CREATE POLICY "Challenge_insert_own" ON "Challenge" FOR INSERT TO authenticated WITH CHECK (public.is_current_app_user("userId"));
CREATE POLICY "Challenge_update_own" ON "Challenge" FOR UPDATE TO authenticated USING (public.is_current_app_user("userId")) WITH CHECK (public.is_current_app_user("userId"));

CREATE POLICY "Reminder_select_own" ON "Reminder" FOR SELECT TO authenticated USING (public.is_current_app_user("userId"));
CREATE POLICY "Reminder_insert_own" ON "Reminder" FOR INSERT TO authenticated WITH CHECK (public.is_current_app_user("userId"));
CREATE POLICY "Reminder_update_own" ON "Reminder" FOR UPDATE TO authenticated USING (public.is_current_app_user("userId")) WITH CHECK (public.is_current_app_user("userId"));

CREATE POLICY "CheckIn_select_own" ON "CheckIn" FOR SELECT TO authenticated USING (public.is_current_app_user("userId"));
CREATE POLICY "CheckIn_insert_own" ON "CheckIn" FOR INSERT TO authenticated WITH CHECK (public.is_current_app_user("userId"));
CREATE POLICY "CheckIn_update_own" ON "CheckIn" FOR UPDATE TO authenticated USING (public.is_current_app_user("userId")) WITH CHECK (public.is_current_app_user("userId"));

CREATE POLICY "Experiment_select_own" ON "Experiment" FOR SELECT TO authenticated USING (public.is_current_app_user("userId"));
CREATE POLICY "Experiment_insert_own" ON "Experiment" FOR INSERT TO authenticated WITH CHECK (public.is_current_app_user("userId"));
CREATE POLICY "Experiment_update_own" ON "Experiment" FOR UPDATE TO authenticated USING (public.is_current_app_user("userId")) WITH CHECK (public.is_current_app_user("userId"));

-- Indirect owner tables.
REVOKE ALL ON TABLE "HourlyBlock", "GoalCheckIn", "ChallengeDay" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE "HourlyBlock", "GoalCheckIn", "ChallengeDay" TO authenticated;

CREATE POLICY "HourlyBlock_select_own" ON "HourlyBlock" FOR SELECT TO authenticated USING (public.owns_daily_log("dailyLogId"));
CREATE POLICY "HourlyBlock_insert_own" ON "HourlyBlock" FOR INSERT TO authenticated WITH CHECK (public.owns_daily_log("dailyLogId"));
CREATE POLICY "HourlyBlock_update_own" ON "HourlyBlock" FOR UPDATE TO authenticated USING (public.owns_daily_log("dailyLogId")) WITH CHECK (public.owns_daily_log("dailyLogId"));

CREATE POLICY "GoalCheckIn_select_own" ON "GoalCheckIn" FOR SELECT TO authenticated USING (public.owns_goal("goalId"));
CREATE POLICY "GoalCheckIn_insert_own" ON "GoalCheckIn" FOR INSERT TO authenticated WITH CHECK (public.owns_goal("goalId"));
CREATE POLICY "GoalCheckIn_update_own" ON "GoalCheckIn" FOR UPDATE TO authenticated USING (public.owns_goal("goalId")) WITH CHECK (public.owns_goal("goalId"));

CREATE POLICY "ChallengeDay_select_own" ON "ChallengeDay" FOR SELECT TO authenticated USING (public.owns_challenge("challengeId"));
CREATE POLICY "ChallengeDay_insert_own" ON "ChallengeDay" FOR INSERT TO authenticated WITH CHECK (public.owns_challenge("challengeId"));
CREATE POLICY "ChallengeDay_update_own" ON "ChallengeDay" FOR UPDATE TO authenticated USING (public.owns_challenge("challengeId")) WITH CHECK (public.owns_challenge("challengeId"));
