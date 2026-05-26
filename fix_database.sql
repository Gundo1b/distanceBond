-- 1. Ensure columns exist in the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES auth.users,
ADD COLUMN IF NOT EXISTS couple_code TEXT UNIQUE;

-- 2. Function to generate a random 6-character code
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

-- 3. Function to connect two users via code
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
