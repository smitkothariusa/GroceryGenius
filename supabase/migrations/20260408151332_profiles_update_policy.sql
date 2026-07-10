-- Fix: recreate UPDATE policy with explicit WITH CHECK so upsert (ON CONFLICT DO UPDATE) is allowed.
-- PostgREST requires WITH CHECK to be explicitly set on UPDATE policies for upsert to work.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
