-- Public bucket for course/category thumbnails and other display media.
-- Public read (thumbnails are shown to anonymous visitors); writes restricted to service role (NestJS admin ops).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('course-media', 'course-media', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "course_media_public_read" ON storage.objects;
CREATE POLICY "course_media_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-media');
