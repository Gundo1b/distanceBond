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
