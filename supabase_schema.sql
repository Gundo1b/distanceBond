-- Create a table for public profiles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name TEXT,
  date_of_birth TEXT,
  invite_code TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES auth.users,
ADD COLUMN IF NOT EXISTS couple_code TEXT UNIQUE;

-- Create a table for couple links (optional but cleaner for many-to-many or history)
-- For now, we'll use direct referencing in profiles for simplicity.

-- Function to generate a random 6-character code
CREATE OR REPLACE FUNCTION generate_couple_code() 
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to connect two users via code
CREATE OR REPLACE FUNCTION connect_couple(target_code TEXT)
RETURNS JSON AS $$
DECLARE
  partner_record RECORD;
  current_user_id UUID := auth.uid();
BEGIN
  -- Find the partner with the code
  SELECT id, full_name INTO partner_record FROM public.profiles WHERE couple_code = target_code LIMIT 1;
  
  IF partner_record.id IS NULL THEN
    RETURN json_build_object('error', 'Invalid code');
  END IF;

  IF partner_record.id = current_user_id THEN
    RETURN json_build_object('error', 'You cannot connect with yourself');
  END IF;

  -- Update both profiles
  UPDATE public.profiles SET partner_id = partner_record.id WHERE id = current_user_id;
  UPDATE public.profiles SET partner_id = current_user_id WHERE id = partner_record.id;

  RETURN json_build_object('success', true, 'partner_name', partner_record.full_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
