-- Fix 1: Allow guests to update their own profile information
CREATE POLICY "Guests can update their own profile"
ON public.guests FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Fix 3: Explicitly block anonymous access to sensitive tables
CREATE POLICY "Block anonymous access to guests"
ON public.guests FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous access to manual_payments"
ON public.manual_payments FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous access to rooms"
ON public.rooms FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous access to beds"
ON public.beds FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous access to documents"
ON public.documents FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous access to rents"
ON public.rents FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous access to complaints"
ON public.complaints FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous access to announcements"
ON public.announcements FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous access to pgs"
ON public.pgs FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous access to profiles"
ON public.profiles FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous access to user_roles"
ON public.user_roles FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous access to expenses"
ON public.expenses FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous access to notification_settings"
ON public.notification_settings FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous access to bed_history"
ON public.bed_history FOR SELECT
TO anon
USING (false);