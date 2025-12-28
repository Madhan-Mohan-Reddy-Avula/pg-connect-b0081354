-- Create notification_settings table for owners
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pg_id UUID NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  email_reminders_enabled BOOLEAN NOT NULL DEFAULT false,
  sms_reminders_enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_days_before INTEGER NOT NULL DEFAULT 3,
  reminder_email TEXT,
  reminder_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_pg_settings UNIQUE(pg_id)
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owners can view their notification settings"
ON public.notification_settings
FOR SELECT
USING (pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can insert their notification settings"
ON public.notification_settings
FOR INSERT
WITH CHECK (pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can update their notification settings"
ON public.notification_settings
FOR UPDATE
USING (pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can delete their notification settings"
ON public.notification_settings
FOR DELETE
USING (pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();