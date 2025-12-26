-- Create expenses table for tracking monthly PG expenses
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pg_id UUID NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  expense_month DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for owner access
CREATE POLICY "Owners can view their PG expenses" 
ON public.expenses 
FOR SELECT 
USING (pg_id IN (SELECT id FROM public.pgs WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can insert expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (pg_id IN (SELECT id FROM public.pgs WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can update their expenses" 
ON public.expenses 
FOR UPDATE 
USING (pg_id IN (SELECT id FROM public.pgs WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can delete their expenses" 
ON public.expenses 
FOR DELETE 
USING (pg_id IN (SELECT id FROM public.pgs WHERE owner_id = auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add payment_month column to manual_payments for tracking which month the payment is for
ALTER TABLE public.manual_payments ADD COLUMN IF NOT EXISTS payment_month DATE;