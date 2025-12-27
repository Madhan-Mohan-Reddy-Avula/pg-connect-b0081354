-- Add image_url columns to relevant tables
ALTER TABLE public.pgs ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Create storage bucket for pg-images
INSERT INTO storage.buckets (id, name, public)
VALUES ('pg-images', 'pg-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for pg-images bucket
CREATE POLICY "Owners can upload pg images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pg-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can update pg images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pg-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can delete pg images"
ON storage.objects FOR DELETE
USING (bucket_id = 'pg-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view pg images"
ON storage.objects FOR SELECT
USING (bucket_id = 'pg-images');

-- Create storage bucket for complaint-images
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-images', 'complaint-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for complaint-images bucket
CREATE POLICY "Guests can upload complaint images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'complaint-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view complaint images"
ON storage.objects FOR SELECT
USING (bucket_id = 'complaint-images');

-- Create storage bucket for expense-receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-receipts', 'expense-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for expense-receipts bucket
CREATE POLICY "Owners can upload expense receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can delete expense receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view expense receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'expense-receipts');