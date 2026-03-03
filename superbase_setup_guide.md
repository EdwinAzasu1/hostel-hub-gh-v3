1. Create a Supabase Project

    Go to supabase.com and create an account
    Click New Project, choose a name, password, and region
    Once created, go to Settings → API and copy your Project URL and anon/public key

2. Connect to Lovable

In Lovable, go to Project Settings → Supabase and connect your new Supabase project using the URL and anon key.
3. Database Setup

Run these SQL statements in your Supabase SQL Editor (in order):
Step 1: Enum & Tables

CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'hostel_owner');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE TABLE public.hostels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, description TEXT NOT NULL,
  location TEXT NOT NULL, address TEXT NOT NULL,
  manager_name TEXT NOT NULL, manager_email TEXT NOT NULL,
  manager_phone TEXT NOT NULL, google_maps_link TEXT,
  images TEXT[] DEFAULT '{}', total_rooms INT DEFAULT 0,
  available_rooms INT DEFAULT 0, starting_price INT NOT NULL,
  owner_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id UUID NOT NULL REFERENCES public.hostels ON DELETE CASCADE,
  type TEXT NOT NULL, price_per_student INT NOT NULL,
  available_rooms INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id UUID NOT NULL REFERENCES public.hostels ON DELETE CASCADE,
  student_name TEXT NOT NULL, student_email TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT, created_at TIMESTAMPTZ DEFAULT now()
);

Step 2: Functions & Triggers

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN new.updated_at = now(); RETURN new; END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER update_hostels_updated_at BEFORE UPDATE ON public.hostels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


Step 3: Enable RLS & Policies

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User roles
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Hostels
CREATE POLICY "View approved hostels" ON public.hostels FOR SELECT USING (status = 'approved' OR has_role(auth.uid(), 'admin') OR owner_id = auth.uid());
CREATE POLICY "Admins can insert hostels" ON public.hostels FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update hostels" ON public.hostels FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete hostels" ON public.hostels FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners can insert hostels" ON public.hostels FOR INSERT WITH CHECK (has_role(auth.uid(), 'hostel_owner') AND owner_id = auth.uid());
CREATE POLICY "Owners can update hostels" ON public.hostels FOR UPDATE USING (has_role(auth.uid(), 'hostel_owner') AND owner_id = auth.uid());
CREATE POLICY "Owners can delete hostels" ON public.hostels FOR DELETE USING (has_role(auth.uid(), 'hostel_owner') AND owner_id = auth.uid());

-- Room types
CREATE POLICY "Anyone can view room types" ON public.room_types FOR SELECT USING (true);
CREATE POLICY "Admins can insert room types" ON public.room_types FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update room types" ON public.room_types FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete room types" ON public.room_types FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners can insert room types" ON public.room_types FOR INSERT WITH CHECK (has_role(auth.uid(), 'hostel_owner') AND EXISTS (SELECT 1 FROM hostels WHERE hostels.id = room_types.hostel_id AND hostels.owner_id = auth.uid()));
CREATE POLICY "Owners can update room types" ON public.room_types FOR UPDATE USING (has_role(auth.uid(), 'hostel_owner') AND EXISTS (SELECT 1 FROM hostels WHERE hostels.id = room_types.hostel_id AND hostels.owner_id = auth.uid()));
CREATE POLICY "Owners can delete room types" ON public.room_types FOR DELETE USING (has_role(auth.uid(), 'hostel_owner') AND EXISTS (SELECT 1 FROM hostels WHERE hostels.id = room_types.hostel_id AND hostels.owner_id = auth.uid()));

-- Reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Anyone can submit reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can delete reviews" ON public.reviews FOR DELETE USING (has_role(auth.uid(), 'admin'));

Step 4: Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('hostel-images', 'hostel-images', true);
CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (bucket_id = 'hostel-images');
CREATE POLICY "Admin upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'hostel-images' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'hostel-images' AND has_role(auth.uid(), 'hostel_owner'));
CREATE POLICY "Admin delete" ON storage.objects FOR DELETE USING (bucket_id = 'hostel-images' AND has_role(auth.uid(), 'admin'));

4. Create Your First Admin

    In Supabase → Authentication → Users → Add user (auto-confirm)
    Copy the user's UUID
    In SQL Editor, run:

    INSERT INTO public.user_roles (user_id, role) VALUES ('YOUR_USER_UUID', 'admin');

