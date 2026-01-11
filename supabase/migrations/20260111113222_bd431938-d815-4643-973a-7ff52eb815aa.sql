-- Drop the problematic anonymous blocking policy on manual_payments
DROP POLICY IF EXISTS "Block anonymous access to manual_payments" ON public.manual_payments;

-- Create a proper policy that only blocks truly anonymous users
CREATE POLICY "Block anonymous access to manual_payments"
ON public.manual_payments
AS RESTRICTIVE
FOR SELECT
USING (auth.uid() IS NOT NULL);