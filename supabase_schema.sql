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

-- Truth or Dare shared couple game
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.truth_or_dare_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_one_id UUID REFERENCES auth.users NOT NULL,
  player_two_id UUID REFERENCES auth.users NOT NULL,
  current_turn_user_id UUID REFERENCES auth.users NOT NULL,
  current_type TEXT CHECK (current_type IN ('Truth', 'Dare')),
  current_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CHECK (player_one_id <> player_two_id),
  CHECK (current_turn_user_id = player_one_id OR current_turn_user_id = player_two_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS truth_or_dare_games_couple_unique
ON public.truth_or_dare_games (
  LEAST(player_one_id, player_two_id),
  GREATEST(player_one_id, player_two_id)
);

ALTER TABLE public.truth_or_dare_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couples can view their truth or dare game." ON public.truth_or_dare_games;
CREATE POLICY "Couples can view their truth or dare game." ON public.truth_or_dare_games
  FOR SELECT USING (auth.uid() = player_one_id OR auth.uid() = player_two_id);

DROP POLICY IF EXISTS "Users can create their couple truth or dare game." ON public.truth_or_dare_games;
CREATE POLICY "Users can create their couple truth or dare game." ON public.truth_or_dare_games
  FOR INSERT WITH CHECK (
    auth.uid() = player_one_id
    AND current_turn_user_id = player_two_id
  );

DROP POLICY IF EXISTS "Current player can send truth or dare turn." ON public.truth_or_dare_games;
CREATE POLICY "Current player can send truth or dare turn." ON public.truth_or_dare_games
  FOR UPDATE USING (auth.uid() = current_turn_user_id)
  WITH CHECK (auth.uid() = player_one_id OR auth.uid() = player_two_id);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.truth_or_dare_games;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Truth or Dare responses and media uploads
CREATE TABLE IF NOT EXISTS public.truth_or_dare_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES public.truth_or_dare_games ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users NOT NULL,
  message_type TEXT CHECK (message_type IN ('text', 'image', 'video')) NOT NULL,
  body TEXT,
  media_url TEXT,
  media_type TEXT,
  prompt_type TEXT CHECK (prompt_type IN ('Truth', 'Dare')),
  prompt_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.truth_or_dare_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couples can view truth or dare messages." ON public.truth_or_dare_messages;
CREATE POLICY "Couples can view truth or dare messages." ON public.truth_or_dare_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.truth_or_dare_games
      WHERE truth_or_dare_games.id = truth_or_dare_messages.game_id
      AND (auth.uid() = player_one_id OR auth.uid() = player_two_id)
    )
  );

DROP POLICY IF EXISTS "Couples can send truth or dare messages." ON public.truth_or_dare_messages;
CREATE POLICY "Couples can send truth or dare messages." ON public.truth_or_dare_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.truth_or_dare_games
      WHERE truth_or_dare_games.id = truth_or_dare_messages.game_id
      AND (auth.uid() = player_one_id OR auth.uid() = player_two_id)
    )
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('truth-or-dare-media', 'truth-or-dare-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Couples can upload truth or dare media." ON storage.objects;
CREATE POLICY "Couples can upload truth or dare media." ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'truth-or-dare-media'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Truth or dare media is viewable." ON storage.objects;
CREATE POLICY "Truth or dare media is viewable." ON storage.objects
  FOR SELECT USING (bucket_id = 'truth-or-dare-media');

-- Function to clean up old truth or dare data (older than 2 minutes)
CREATE OR REPLACE FUNCTION delete_old_truth_or_dare_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete messages older than 2 minutes
  DELETE FROM public.truth_or_dare_messages
  WHERE created_at < (now() - interval '2 minutes');

  -- Delete games older than 2 minutes (based on updated_at)
  DELETE FROM public.truth_or_dare_games
  WHERE updated_at < (now() - interval '2 minutes');

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run cleanup on every message insert
DROP TRIGGER IF EXISTS trigger_cleanup_messages ON public.truth_or_dare_messages;
CREATE TRIGGER trigger_cleanup_messages
AFTER INSERT ON public.truth_or_dare_messages
FOR EACH STATEMENT
EXECUTE FUNCTION delete_old_truth_or_dare_data();

-- Main couple chat
CREATE TABLE IF NOT EXISTS public.couple_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users NOT NULL,
  receiver_id UUID REFERENCES auth.users NOT NULL,
  message_type TEXT CHECK (message_type IN ('text', 'image', 'video', 'audio')) NOT NULL DEFAULT 'text',
  body TEXT,
  media_url TEXT,
  media_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CHECK (sender_id <> receiver_id)
);

ALTER TABLE public.couple_messages
ADD COLUMN IF NOT EXISTS message_type TEXT CHECK (message_type IN ('text', 'image', 'video', 'audio')) NOT NULL DEFAULT 'text',
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT;

ALTER TABLE public.couple_messages ALTER COLUMN body DROP NOT NULL;
ALTER TABLE public.couple_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couples can view their chat messages." ON public.couple_messages;
CREATE POLICY "Couples can view their chat messages." ON public.couple_messages
  FOR SELECT USING (
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
  );

DROP POLICY IF EXISTS "Couples can send chat messages." ON public.couple_messages;
CREATE POLICY "Couples can send chat messages." ON public.couple_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = sender_id
      AND profiles.partner_id = receiver_id
    )
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('couple-chat-media', 'couple-chat-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Couples can upload chat media." ON storage.objects;
CREATE POLICY "Couples can upload chat media." ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'couple-chat-media'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Couple chat media is viewable." ON storage.objects;
CREATE POLICY "Couple chat media is viewable." ON storage.objects
  FOR SELECT USING (bucket_id = 'couple-chat-media');

NOTIFY pgrst, 'reload schema';

-- Trigger to run cleanup on every game update
DROP TRIGGER IF EXISTS trigger_cleanup_games ON public.truth_or_dare_games;
CREATE TRIGGER trigger_cleanup_games
AFTER UPDATE OR INSERT ON public.truth_or_dare_games
FOR EACH STATEMENT
EXECUTE FUNCTION delete_old_truth_or_dare_data();

