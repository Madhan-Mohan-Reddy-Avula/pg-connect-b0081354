-- Fix all "Block anonymous access" policies that incorrectly use USING (false)
-- They should use auth.uid() IS NOT NULL to only block unauthenticated users

-- Fix expenses
DROP POLICY IF EXISTS "Block anonymous access to expenses" ON public.expenses;
CREATE POLICY "Block anonymous access to expenses"
ON public.expenses AS RESTRICTIVE FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix complaints
DROP POLICY IF EXISTS "Block anonymous access to complaints" ON public.complaints;
CREATE POLICY "Block anonymous access to complaints"
ON public.complaints AS RESTRICTIVE FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix bed_history
DROP POLICY IF EXISTS "Block anonymous access to bed_history" ON public.bed_history;
CREATE POLICY "Block anonymous access to bed_history"
ON public.bed_history AS RESTRICTIVE FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix beds
DROP POLICY IF EXISTS "Block anonymous access to beds" ON public.beds;
CREATE POLICY "Block anonymous access to beds"
ON public.beds AS RESTRICTIVE FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix managers
DROP POLICY IF EXISTS "Block anonymous access to managers" ON public.managers;
CREATE POLICY "Block anonymous access to managers"
ON public.managers AS RESTRICTIVE FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix documents
DROP POLICY IF EXISTS "Block anonymous access to documents" ON public.documents;
CREATE POLICY "Block anonymous access to documents"
ON public.documents AS RESTRICTIVE FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix pgs
DROP POLICY IF EXISTS "Block anonymous access to pgs" ON public.pgs;
CREATE POLICY "Block anonymous access to pgs"
ON public.pgs AS RESTRICTIVE FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix user_roles
DROP POLICY IF EXISTS "Block anonymous access to user_roles" ON public.user_roles;
CREATE POLICY "Block anonymous access to user_roles"
ON public.user_roles AS RESTRICTIVE FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix rents
DROP POLICY IF EXISTS "Block anonymous access to rents" ON public.rents;
CREATE POLICY "Block anonymous access to rents"
ON public.rents AS RESTRICTIVE FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix notification_settings
DROP POLICY IF EXISTS "Block anonymous access to notification_settings" ON public.notification_settings;
CREATE POLICY "Block anonymous access to notification_settings"
ON public.notification_settings AS RESTRICTIVE FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix notifications
DROP POLICY IF EXISTS "Block anonymous access to notifications" ON public.notifications;
CREATE POLICY "Block anonymous access to notifications"
ON public.notifications AS RESTRICTIVE FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix rooms
DROP POLICY IF EXISTS "Block anonymous access to rooms" ON public.rooms;
CREATE POLICY "Block anonymous access to rooms"
ON public.rooms AS RESTRICTIVE FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix profiles
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles AS RESTRICTIVE FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix guests
DROP POLICY IF EXISTS "Block anonymous access to guests" ON public.guests;
CREATE POLICY "Block anonymous access to guests"
ON public.guests AS RESTRICTIVE FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix announcements
DROP POLICY IF EXISTS "Block anonymous access to announcements" ON public.announcements;
CREATE POLICY "Block anonymous access to announcements"
ON public.announcements AS RESTRICTIVE FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix push_tokens
DROP POLICY IF EXISTS "Block anonymous access to push_tokens" ON public.push_tokens;
CREATE POLICY "Block anonymous access to push_tokens"
ON public.push_tokens AS RESTRICTIVE FOR SELECT
USING (auth.uid() IS NOT NULL);