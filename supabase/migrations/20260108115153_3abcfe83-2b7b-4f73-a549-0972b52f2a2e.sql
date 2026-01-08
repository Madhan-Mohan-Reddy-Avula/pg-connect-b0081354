-- Add invite_code column to guests table
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guests_invite_code ON public.guests(invite_code);

-- Create function to generate random 6-digit code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text AS $$
DECLARE
  code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate random 6-digit number
    code := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.guests WHERE invite_code = code) INTO code_exists;
    
    -- If code doesn't exist, return it
    IF NOT code_exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function for guest to claim their account using invite code
CREATE OR REPLACE FUNCTION claim_guest_account(p_invite_code text, p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  v_guest_id uuid;
BEGIN
  -- Find and update the guest with the invite code
  UPDATE public.guests 
  SET user_id = p_user_id, updated_at = now()
  WHERE invite_code = p_invite_code 
    AND user_id IS NULL 
    AND status = 'active'
  RETURNING id INTO v_guest_id;
  
  RETURN v_guest_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;