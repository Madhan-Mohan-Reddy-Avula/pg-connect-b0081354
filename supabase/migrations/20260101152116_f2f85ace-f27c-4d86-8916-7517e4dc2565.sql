-- Create notifications table for storing push notification history
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pg_id UUID REFERENCES public.pgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general', -- 'rent_reminder', 'payment_verified', 'payment_rejected', 'announcement', 'general'
  is_read BOOLEAN NOT NULL DEFAULT false,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

-- System can insert notifications (via service role or triggers)
CREATE POLICY "Service can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create push_tokens table for storing device tokens
CREATE TABLE public.push_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'android', -- 'android', 'ios', 'web'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Enable RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own push tokens
CREATE POLICY "Users can view their own tokens"
ON public.push_tokens
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own tokens"
ON public.push_tokens
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own tokens"
ON public.push_tokens
FOR DELETE
USING (user_id = auth.uid());

-- Block anonymous access
CREATE POLICY "Block anonymous access to notifications"
ON public.notifications
FOR SELECT
USING (false);

CREATE POLICY "Block anonymous access to push_tokens"
ON public.push_tokens
FOR SELECT
USING (false);