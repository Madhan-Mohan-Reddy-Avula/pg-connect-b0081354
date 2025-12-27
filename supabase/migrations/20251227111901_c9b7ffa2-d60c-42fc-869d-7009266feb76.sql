-- Create bed_history table to track all bed assignments
CREATE TABLE public.bed_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bed_id UUID NOT NULL,
  guest_id UUID NOT NULL,
  pg_id UUID NOT NULL,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vacated_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bed_history ENABLE ROW LEVEL SECURITY;

-- Owners can view bed history for their PG
CREATE POLICY "Owners can view bed history"
ON public.bed_history
FOR SELECT
USING (pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()));

-- Owners can insert bed history
CREATE POLICY "Owners can insert bed history"
ON public.bed_history
FOR INSERT
WITH CHECK (pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()));

-- Owners can update bed history
CREATE POLICY "Owners can update bed history"
ON public.bed_history
FOR UPDATE
USING (pg_id IN (SELECT id FROM pgs WHERE owner_id = auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_bed_history_bed_id ON public.bed_history(bed_id);
CREATE INDEX idx_bed_history_guest_id ON public.bed_history(guest_id);
CREATE INDEX idx_bed_history_pg_id ON public.bed_history(pg_id);