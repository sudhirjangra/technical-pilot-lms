import { BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

export const COURSE_MEDIA_BUCKET = 'course-media';

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Uploads an image into the public course-media bucket and returns its public URL.
 * The bucket is created on demand so a missing migration cannot silently break admin uploads.
 */
export const uploadPublicImage = async (
  supabase: SupabaseClient,
  filePath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> => {
  if (!IMAGE_MIME_TYPES.includes(contentType)) {
    throw new BadRequestException('A PNG, JPEG, or WEBP image is required');
  }

  const upload = () =>
    supabase.storage
      .from(COURSE_MEDIA_BUCKET)
      .upload(filePath, buffer, { contentType, upsert: true });

  let { error } = await upload();

  if (error && /bucket not found/i.test(error.message)) {
    await supabase.storage.createBucket(COURSE_MEDIA_BUCKET, {
      public: true,
      allowedMimeTypes: IMAGE_MIME_TYPES,
    });
    ({ error } = await upload());
  }

  if (error) throw new BadRequestException(`Thumbnail upload failed: ${error.message}`);

  const { data } = supabase.storage
    .from(COURSE_MEDIA_BUCKET)
    .getPublicUrl(filePath);

  // Bust CDN/browser caching, since the path is stable across re-uploads.
  return `${data.publicUrl}?v=${Date.now()}`;
};
