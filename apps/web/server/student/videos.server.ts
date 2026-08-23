'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const OtpResponseSchema = z.object({
  data: z.object({
    otp: z.string(),
    playbackInfo: z.string(),
  }),
});

export type VideoOtpData = { otp: string; playbackInfo: string };

export async function getVideoOtp(lessonId: string): Promise<VideoOtpData | null> {
  const session = await auth();
  if (!session?.user) return null;

  const [error, data] = await safeFetch(
    OtpResponseSchema,
    `/videos/${lessonId}/otp`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.user.tokens.access_token}` },
      cache: 'no-store',
    },
  );
  if (error) return null;
  return data!.data;
}
