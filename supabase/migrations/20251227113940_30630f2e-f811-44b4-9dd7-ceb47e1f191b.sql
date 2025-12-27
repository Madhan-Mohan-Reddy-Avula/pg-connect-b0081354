-- Fix "duplicate key value violates unique constraint guests_user_id_key" when owners add multiple guests
-- by allowing guests without a linked auth user yet.

-- 1) Allow user_id to be NULL (guests may not have an account yet)
ALTER TABLE public.guests
  ALTER COLUMN user_id DROP NOT NULL;

-- 2) Replace strict unique constraint with a partial unique index (only enforce uniqueness when user_id exists)
ALTER TABLE public.guests
  DROP CONSTRAINT IF EXISTS guests_user_id_key;

DROP INDEX IF EXISTS public.guests_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS guests_user_id_unique_not_null
  ON public.guests (user_id)
  WHERE user_id IS NOT NULL;

-- 3) Make guest linking on signup robust when user_id is NULL and when multiple rows share the same email
CREATE OR REPLACE FUNCTION public.link_guest_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.guests g
  SET user_id = NEW.id
  WHERE g.id = (
    SELECT id
    FROM public.guests
    WHERE email = NEW.email
      AND (user_id IS NULL OR user_id <> NEW.id)
    ORDER BY created_at DESC
    LIMIT 1
  );

  RETURN NEW;
END;
$function$;