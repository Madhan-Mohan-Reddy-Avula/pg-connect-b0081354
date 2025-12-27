-- Add due_date column to rents table for tracking rent payment deadlines
ALTER TABLE public.rents 
ADD COLUMN IF NOT EXISTS due_date date DEFAULT (date_trunc('month', CURRENT_DATE) + interval '5 days')::date;

-- Update existing rents to have a default due date (5th of their respective month)
UPDATE public.rents 
SET due_date = (month + interval '4 days')::date
WHERE due_date IS NULL;