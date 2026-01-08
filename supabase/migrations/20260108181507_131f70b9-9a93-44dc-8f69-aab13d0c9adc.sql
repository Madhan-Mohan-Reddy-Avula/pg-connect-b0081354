-- Add 2FA fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS two_factor_secret text;

-- Create index for 2FA enabled users
CREATE INDEX IF NOT EXISTS idx_profiles_two_factor_enabled ON public.profiles(user_id) WHERE two_factor_enabled = true;