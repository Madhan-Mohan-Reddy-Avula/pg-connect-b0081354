-- Add foreign key relationships to bed_history
ALTER TABLE public.bed_history 
ADD CONSTRAINT fk_bed_history_bed_id FOREIGN KEY (bed_id) REFERENCES public.beds(id) ON DELETE CASCADE;

ALTER TABLE public.bed_history 
ADD CONSTRAINT fk_bed_history_guest_id FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE;

ALTER TABLE public.bed_history 
ADD CONSTRAINT fk_bed_history_pg_id FOREIGN KEY (pg_id) REFERENCES public.pgs(id) ON DELETE CASCADE;