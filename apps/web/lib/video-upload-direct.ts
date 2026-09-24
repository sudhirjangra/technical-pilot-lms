'use client';

import {
  cancelVideoUpload,
  completeVideoUpload,
  getVideoUploadCredentials,
  VideoLesson,
} from '@/server/admin/videos.server';

export interface VideoUploadProgress {
  percent: number;
  uploadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  remainingSeconds: number;
  statusText: string;
}

export type OnVideoUploadProgress = (progress: VideoUploadProgress) => void;

const S3_POLICY_FIELDS = [
  'x-amz-credential',
  'x-amz-algorithm',
  'x-amz-date',
  'x-amz-signature',
  'key',
  'policy',
] as const;

export function formatUploadSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0 || !isFinite(bytesPerSec)) return '';
  if (bytesPerSec < 1024 * 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  }
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

export function formatUploadSize(bytes: number): string {
  if (bytes <= 0 || !isFinite(bytes)) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return '';
  if (seconds < 60) {
    return `~${Math.round(seconds)}s remaining`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = Math.round(seconds % 60);
  return `~${minutes}m ${remainingSecs}s remaining`;
}

/**
 * Uploads a video directly from the browser to VdoCipher AWS S3.
 *
 * Benefits:
 * 1. Fast: Direct unthrottled streaming straight to AWS S3 without double-hopping through our server.
 * 2. Reliable: Long videos of several GBs upload without hitting reverse proxy / server memory limits.
 * 3. Token-safe: Credentials generated on demand just-in-time; server actions run with freshly revalidated sessions.
 * 4. Zero 0kb Ghost Videos: If user cancels, connection breaks, or anything fails, the incomplete video is
 *    immediately cancelled and deleted in VdoCipher via `cancelVideoUpload`.
 */
export async function uploadVideoDirectToVdoCipher(
  lessonId: string,
  file: File,
  onProgress?: OnVideoUploadProgress,
  signal?: AbortSignal,
): Promise<{ data?: VideoLesson; error?: string }> {
  // Step 1: Request fresh VdoCipher upload credentials from our server action
  onProgress?.({
    percent: 0,
    uploadedBytes: 0,
    totalBytes: file.size,
    speedBytesPerSec: 0,
    remainingSeconds: 0,
    statusText: 'Preparing secure direct upload...',
  });

  const credsRes = await getVideoUploadCredentials(lessonId);
  if (credsRes.error || !credsRes.data) {
    return { error: credsRes.error ?? 'Failed to initialize video upload' };
  }

  const { videoId, clientPayload } = credsRes.data;
  const uploadLink = clientPayload.uploadLink;
  if (!uploadLink) {
    await cancelVideoUpload(videoId).catch(() => {});
    return { error: 'Storage provider did not return an upload destination' };
  }

  // Check if aborted before network call
  if (signal?.aborted) {
    await cancelVideoUpload(videoId).catch(() => {});
    return { error: 'Upload cancelled by user' };
  }

  // Step 2: Build multipart form payload for AWS S3
  const form = new FormData();
  for (const field of S3_POLICY_FIELDS) {
    const value = clientPayload[field];
    if (value !== undefined) form.append(field, value);
  }
  form.append('success_action_status', '201');
  form.append('success_action_redirect', '');
  form.append('file', file);

  // Step 3: Stream file directly to AWS S3 with progress and speed metrics
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadLink);

    let lastLoaded = 0;
    let lastTime = Date.now();
    let smoothedSpeed = 0;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;
        if (timeDiff >= 0.3) {
          const currentSpeed = (event.loaded - lastLoaded) / timeDiff;
          smoothedSpeed =
            smoothedSpeed === 0
              ? currentSpeed
              : smoothedSpeed * 0.7 + currentSpeed * 0.3;
          lastLoaded = event.loaded;
          lastTime = now;
        }

        const remainingBytes = Math.max(0, event.total - event.loaded);
        const remainingSeconds =
          smoothedSpeed > 0 ? remainingBytes / smoothedSpeed : 0;
        const percent = Math.min(
          99,
          Math.round((event.loaded / event.total) * 100),
        );

        onProgress({
          percent,
          uploadedBytes: event.loaded,
          totalBytes: event.total,
          speedBytesPerSec: smoothedSpeed,
          remainingSeconds,
          statusText: 'Uploading directly to secure storage...',
        });
      }
    };

    const cleanupAndCancel = async (errorMessage: string) => {
      try {
        await cancelVideoUpload(videoId);
      } catch (e) {
        console.warn('Failed to cancel incomplete video upload:', e);
      }
      resolve({ error: errorMessage });
    };

    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          try {
            xhr.abort();
          } catch {}
          cleanupAndCancel('Upload cancelled by user');
        },
        { once: true },
      );
    }

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.({
          percent: 100,
          uploadedBytes: file.size,
          totalBytes: file.size,
          speedBytesPerSec: smoothedSpeed,
          remainingSeconds: 0,
          statusText: 'Finalizing video registration...',
        });

        // Step 4: Finalize and link video in backend
        const compRes = await completeVideoUpload(lessonId, videoId);
        if (compRes.error || !compRes.data) {
          await cleanupAndCancel(
            compRes.error ?? 'Failed to finalize video lesson',
          );
          return;
        }

        resolve({ data: compRes.data });
      } else {
        await cleanupAndCancel(
          `Direct upload failed with status ${xhr.status}. Incomplete file removed.`,
        );
      }
    };

    xhr.onerror = () => {
      cleanupAndCancel(
        'Network connection failed during video upload. Incomplete file removed.',
      );
    };

    xhr.ontimeout = () => {
      cleanupAndCancel('Upload timed out. Incomplete file removed.');
    };

    xhr.send(form);
  });
}
