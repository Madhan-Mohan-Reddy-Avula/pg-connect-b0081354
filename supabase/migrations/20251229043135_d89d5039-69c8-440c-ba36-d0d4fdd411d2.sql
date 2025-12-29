-- Allow guests to delete their own documents
CREATE POLICY "Guests can delete their documents" 
ON public.documents 
FOR DELETE 
USING (guest_id IN (
  SELECT id FROM public.guests WHERE user_id = auth.uid()
));