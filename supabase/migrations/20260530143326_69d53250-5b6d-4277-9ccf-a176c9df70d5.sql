
-- Add household_id to profiles; default to the user's own id so each user starts in their own household
ALTER TABLE public.profiles
  ADD COLUMN household_id uuid;

UPDATE public.profiles SET household_id = id WHERE household_id IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN household_id SET NOT NULL,
  ALTER COLUMN household_id SET DEFAULT gen_random_uuid();

CREATE INDEX idx_profiles_household_id ON public.profiles(household_id);

-- Backfill handle_new_user to set household_id = new user's id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, household_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.id
  );
  RETURN NEW;
END;
$$;

-- Allow household members to view each other's profile (name/avatar)
CREATE POLICY "Household members can view each other"
ON public.profiles
FOR SELECT
USING (
  household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
);

-- Invites table
CREATE TABLE public.household_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL UNIQUE,
  household_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_by uuid,
  used_at timestamptz
);

CREATE INDEX idx_household_invites_token ON public.household_invites(token);
CREATE INDEX idx_household_invites_household ON public.household_invites(household_id);

GRANT SELECT, INSERT, UPDATE ON public.household_invites TO authenticated;
GRANT ALL ON public.household_invites TO service_role;

ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;

-- Creator can view their household's invites
CREATE POLICY "View invites in my household"
ON public.household_invites
FOR SELECT
TO authenticated
USING (
  household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
);

-- Anyone signed in can look up an invite by token (needed to accept) — restrict via app layer using token
CREATE POLICY "Authenticated can read invites to accept"
ON public.household_invites
FOR SELECT
TO authenticated
USING (used_by IS NULL AND expires_at > now());

CREATE POLICY "Create invite for own household"
ON public.household_invites
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
);

-- Accepter can mark invite as used
CREATE POLICY "Accept invite"
ON public.household_invites
FOR UPDATE
TO authenticated
USING (used_by IS NULL AND expires_at > now())
WITH CHECK (used_by = auth.uid());
