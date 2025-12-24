-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('owner', 'guest');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create PGs table
CREATE TABLE public.pgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  house_rules TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id UUID REFERENCES public.pgs(id) ON DELETE CASCADE NOT NULL,
  room_number TEXT NOT NULL,
  floor TEXT,
  beds_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create beds table
CREATE TABLE public.beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  bed_number TEXT NOT NULL,
  is_occupied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create guests table (links guest users to beds)
CREATE TABLE public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  pg_id UUID REFERENCES public.pgs(id) ON DELETE CASCADE NOT NULL,
  bed_id UUID REFERENCES public.beds(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  emergency_contact TEXT,
  monthly_rent DECIMAL(10,2) NOT NULL DEFAULT 0,
  check_in_date DATE,
  vacate_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'vacated')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table for ID proofs
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rents table
CREATE TABLE public.rents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending')),
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create complaints table
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE NOT NULL,
  pg_id UUID REFERENCES public.pgs(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Get user's PG ID (for owners)
CREATE OR REPLACE FUNCTION public.get_owner_pg_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.pgs WHERE owner_id = _user_id LIMIT 1
$$;

-- Get guest's PG ID
CREATE OR REPLACE FUNCTION public.get_guest_pg_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_id FROM public.guests WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own role during signup"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for pgs
CREATE POLICY "Owners can view their own PG"
ON public.pgs FOR SELECT
TO authenticated
USING (owner_id = auth.uid() OR public.get_guest_pg_id(auth.uid()) = id);

CREATE POLICY "Owners can insert their PG"
ON public.pgs FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update their PG"
ON public.pgs FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their PG"
ON public.pgs FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- RLS Policies for rooms
CREATE POLICY "Users can view rooms in their PG"
ON public.rooms FOR SELECT
TO authenticated
USING (
  pg_id IN (SELECT id FROM public.pgs WHERE owner_id = auth.uid())
  OR pg_id = public.get_guest_pg_id(auth.uid())
);

CREATE POLICY "Owners can insert rooms"
ON public.rooms FOR INSERT
TO authenticated
WITH CHECK (pg_id IN (SELECT id FROM public.pgs WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can update rooms"
ON public.rooms FOR UPDATE
TO authenticated
USING (pg_id IN (SELECT id FROM public.pgs WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can delete rooms"
ON public.rooms FOR DELETE
TO authenticated
USING (pg_id IN (SELECT id FROM public.pgs WHERE owner_id = auth.uid()));

-- RLS Policies for beds
CREATE POLICY "Users can view beds in their PG"
ON public.beds FOR SELECT
TO authenticated
USING (
  room_id IN (
    SELECT r.id FROM public.rooms r 
    JOIN public.pgs p ON r.pg_id = p.id 
    WHERE p.owner_id = auth.uid()
  )
  OR room_id IN (
    SELECT r.id FROM public.rooms r 
    WHERE r.pg_id = public.get_guest_pg_id(auth.uid())
  )
);

CREATE POLICY "Owners can insert beds"
ON public.beds FOR INSERT
TO authenticated
WITH CHECK (
  room_id IN (
    SELECT r.id FROM public.rooms r 
    JOIN public.pgs p ON r.pg_id = p.id 
    WHERE p.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners can update beds"
ON public.beds FOR UPDATE
TO authenticated
USING (
  room_id IN (
    SELECT r.id FROM public.rooms r 
    JOIN public.pgs p ON r.pg_id = p.id 
    WHERE p.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners can delete beds"
ON public.beds FOR DELETE
TO authenticated
USING (
  room_id IN (
    SELECT r.id FROM public.rooms r 
    JOIN public.pgs p ON r.pg_id = p.id 
    WHERE p.owner_id = auth.uid()
  )
);

-- RLS Policies for guests
CREATE POLICY "Owners can view their PG guests"
ON public.guests FOR SELECT
TO authenticated
USING (
  pg_id IN (SELECT id FROM public.pgs WHERE owner_id = auth.uid())
  OR user_id = auth.uid()
);

CREATE POLICY "Owners can insert guests"
ON public.guests FOR INSERT
TO authenticated
WITH CHECK (pg_id IN (SELECT id FROM public.pgs WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can update guests"
ON public.guests FOR UPDATE
TO authenticated
USING (pg_id IN (SELECT id FROM public.pgs WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can delete guests"
ON public.guests FOR DELETE
TO authenticated
USING (pg_id IN (SELECT id FROM public.pgs WHERE owner_id = auth.uid()));

-- RLS Policies for documents
CREATE POLICY "Users can view their documents"
ON public.documents FOR SELECT
TO authenticated
USING (
  guest_id IN (SELECT id FROM public.guests WHERE user_id = auth.uid())
  OR guest_id IN (
    SELECT g.id FROM public.guests g 
    JOIN public.pgs p ON g.pg_id = p.id 
    WHERE p.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners can insert documents"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (
  guest_id IN (
    SELECT g.id FROM public.guests g 
    JOIN public.pgs p ON g.pg_id = p.id 
    WHERE p.owner_id = auth.uid()
  )
);

CREATE POLICY "Guests can insert their documents"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (guest_id IN (SELECT id FROM public.guests WHERE user_id = auth.uid()));

-- RLS Policies for rents
CREATE POLICY "Users can view their rents"
ON public.rents FOR SELECT
TO authenticated
USING (
  guest_id IN (SELECT id FROM public.guests WHERE user_id = auth.uid())
  OR guest_id IN (
    SELECT g.id FROM public.guests g 
    JOIN public.pgs p ON g.pg_id = p.id 
    WHERE p.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners can insert rents"
ON public.rents FOR INSERT
TO authenticated
WITH CHECK (
  guest_id IN (
    SELECT g.id FROM public.guests g 
    JOIN public.pgs p ON g.pg_id = p.id 
    WHERE p.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners can update rents"
ON public.rents FOR UPDATE
TO authenticated
USING (
  guest_id IN (
    SELECT g.id FROM public.guests g 
    JOIN public.pgs p ON g.pg_id = p.id 
    WHERE p.owner_id = auth.uid()
  )
);

-- RLS Policies for complaints
CREATE POLICY "Users can view their complaints"
ON public.complaints FOR SELECT
TO authenticated
USING (
  guest_id IN (SELECT id FROM public.guests WHERE user_id = auth.uid())
  OR pg_id IN (SELECT id FROM public.pgs WHERE owner_id = auth.uid())
);

CREATE POLICY "Guests can insert complaints"
ON public.complaints FOR INSERT
TO authenticated
WITH CHECK (guest_id IN (SELECT id FROM public.guests WHERE user_id = auth.uid()));

CREATE POLICY "Owners can update complaints"
ON public.complaints FOR UPDATE
TO authenticated
USING (pg_id IN (SELECT id FROM public.pgs WHERE owner_id = auth.uid()));

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pgs_updated_at BEFORE UPDATE ON public.pgs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rents_updated_at BEFORE UPDATE ON public.rents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup (create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

-- Trigger for auto-creating profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies for documents bucket
CREATE POLICY "Users can upload their documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can view guest documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' 
  AND public.has_role(auth.uid(), 'owner')
);