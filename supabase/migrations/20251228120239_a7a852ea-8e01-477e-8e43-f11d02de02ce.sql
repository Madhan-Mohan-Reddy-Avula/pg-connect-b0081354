-- Create announcements table for owner to guest communication
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pg_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Owners can manage their PG announcements
CREATE POLICY "Owners can insert announcements"
ON public.announcements
FOR INSERT
WITH CHECK (pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can update announcements"
ON public.announcements
FOR UPDATE
USING (pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can delete announcements"
ON public.announcements
FOR DELETE
USING (pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can view their announcements"
ON public.announcements
FOR SELECT
USING (pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()));

-- Guests can view announcements for their PG
CREATE POLICY "Guests can view announcements"
ON public.announcements
FOR SELECT
USING (pg_id = get_guest_pg_id(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();