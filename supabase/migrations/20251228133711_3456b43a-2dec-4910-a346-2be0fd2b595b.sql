-- Add payment_phone column to pgs table for phone number payments
ALTER TABLE public.pgs ADD COLUMN IF NOT EXISTS payment_phone text;

-- Add comment for clarity
COMMENT ON COLUMN public.pgs.payment_phone IS 'Phone number for receiving payments (alternative to UPI ID)';