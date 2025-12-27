-- Add images array column to rooms table for multiple room photos
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}'::text[];