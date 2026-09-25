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
 * Builds a fresh FormData for S3 upload. Must be called for EACH upload attempt
 * because FormData with File blobs is consumed after being sent via XHR/fetch
 * and cannot be reused.
 */
function buildS3Form(
  file: File,
  policyFields: Record<string, string>,
  safeFilename: string,
): FormData {
  const form = new FormData();
  for (const field of S3_POLICY_FIELDS) {
    const value = policyFields[field];
    if (value !== undefined) form.append(field, value);
  }
  form.append('success_action_status', '201');
  form.append('success_action_redirect', '');
  form.append('file', file, safeFilename);
  return form;
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

  // Sanitize filename to strict ASCII to avoid any multipart header parsing issues on AWS S3
  const safeFilename = file.name.replace(/[^\w.-]/g, '_') || 'video.mp4';

  // Fallback endpoint if S3 Accelerate link is blocked by firewall/adblocker/ISP
  const fallbackUploadLink = uploadLink.includes('.s3-accelerate.amazonaws.com')
    ? uploadLink.replace('.s3-accelerate.amazonaws.com', '.s3.ap-southeast-1.amazonaws.com')
    : uploadLink;

  // Helper: Upload via standard Fetch API (streams natively from disk to network without XHR memory limits)
  const uploadViaFetch = async (targetUrl: string): Promise<{ data?: VideoLesson; error?: string }> => {
    try {
      const startTime = Date.now();
      let lastUploaded = 0;
      let smoothedSpeed = 0;

      onProgress?.({
        percent: 2,
        uploadedBytes: Math.round(file.size * 0.02),
        totalBytes: file.size,
        speedBytesPerSec: 0,
        remainingSeconds: 0,
        statusText: 'Streaming video directly to secure storage...',
      });

      // Dynamic progress ticker to show active streaming indicators
      const progressTimer = setInterval(() => {
        const elapsedSeconds = Math.max(0.5, (Date.now() - startTime) / 1000);
        // Estimate progress smoothly while the browser streams in the background
        const currentEstimatedBytes = Math.min(file.size * 0.98, (file.size / Math.max(30, file.size / (10 * 1024 * 1024))) * elapsedSeconds);
        const currentSpeed = (currentEstimatedBytes - lastUploaded) / 0.5;
        smoothedSpeed = smoothedSpeed === 0 ? currentSpeed : smoothedSpeed * 0.7 + currentSpeed * 0.3;
        lastUploaded = currentEstimatedBytes;
        const currentPercent = Math.min(98, Math.max(3, Math.round((currentEstimatedBytes / file.size) * 100)));
        const remainingSeconds = smoothedSpeed > 0 ? (file.size - currentEstimatedBytes) / smoothedSpeed : 0;

        onProgress?.({
          percent: currentPercent,
          uploadedBytes: Math.round(currentEstimatedBytes),
          totalBytes: file.size,
          speedBytesPerSec: smoothedSpeed,
          remainingSeconds,
          statusText: 'Streaming video directly to secure storage...',
        });
      }, 500);

      let s3Res: Response;
      try {
        // Fresh FormData for each fetch attempt — streams are consumed after send
        s3Res = await fetch(targetUrl, {
          method: 'POST',
          body: buildS3Form(file, clientPayload, safeFilename),
          mode: 'cors',
          signal,
        });
      } catch (networkErr: unknown) {
        if (signal?.aborted) throw networkErr;
        if (targetUrl !== fallbackUploadLink) {
          console.warn('[VideoUploadDirect] S3 Accelerate link failed, trying standard endpoint...', networkErr);
          // Fresh FormData for fallback attempt
          s3Res = await fetch(fallbackUploadLink, {
            method: 'POST',
            body: buildS3Form(file, clientPayload, safeFilename),
            mode: 'cors',
            signal,
          });
        } else {
          throw networkErr;
        }
      }

      clearInterval(progressTimer);

      if (s3Res.status >= 200 && s3Res.status < 300) {
        onProgress?.({
          percent: 100,
          uploadedBytes: file.size,
          totalBytes: file.size,
          speedBytesPerSec: smoothedSpeed,
          remainingSeconds: 0,
          statusText: 'Finalizing video registration...',
        });

        // Finalize and link video in backend
        let compRes: { data?: VideoLesson; error?: string } | null = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          compRes = await completeVideoUpload(lessonId, videoId);
          if (compRes.data && !compRes.error) break;
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          }
        }

        if (!compRes || compRes.error || !compRes.data) {
          await cancelVideoUpload(videoId).catch(() => {});
          return { error: compRes?.error ?? 'Failed to finalize video lesson' };
        }

        return { data: compRes.data };
      } else {
        const text = await s3Res.text().catch(() => '');
        let s3ErrMsg = `Direct upload failed (HTTP ${s3Res.status}).`;
        try {
          const parser = new DOMParser();
          const xml = parser.parseFromString(text, 'application/xml');
          const code = xml.querySelector('Code')?.textContent;
          const msg = xml.querySelector('Message')?.textContent;
          if (msg || code) {
            s3ErrMsg = `Storage error [${code ?? s3Res.status}]: ${msg ?? 'File rejected'}`;
          }
        } catch {}
        await cancelVideoUpload(videoId).catch(() => {});
        return { error: `${s3ErrMsg} Incomplete file removed.` };
      }
    } catch (err: unknown) {
      if (signal?.aborted) {
        await cancelVideoUpload(videoId).catch(() => {});
        return { error: 'Upload cancelled by user' };
      }
      await cancelVideoUpload(videoId).catch(() => {});
      return {
        error: `Upload transfer interrupted: ${err instanceof Error ? err.message : String(err)}. Incomplete file removed.`,
      };
    }
  };

  // For large files (> 300MB), use Fetch directly to prevent browser XHR renderer memory crashes
  if (file.size >= 300 * 1024 * 1024) {
    return uploadViaFetch(uploadLink);
  }

  // For smaller files, attempt XHR for byte-precise progress with automatic Fetch fallback
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadLink);
    xhr.timeout = 0;

    let lastLoaded = 0;
    let lastTime = Date.now();
    let smoothedSpeed = 0;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;
        if (timeDiff >= 0.25) {
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

        let compRes: { data?: VideoLesson; error?: string } | null = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          compRes = await completeVideoUpload(lessonId, videoId);
          if (compRes.data && !compRes.error) break;
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          }
        }

        if (!compRes || compRes.error || !compRes.data) {
          await cleanupAndCancel(
            compRes?.error ?? 'Failed to finalize video lesson',
          );
          return;
        }

        resolve({ data: compRes.data });
      } else {
        let s3ErrMsg = `Direct upload failed (HTTP ${xhr.status}).`;
        try {
          const parser = new DOMParser();
          const xml = parser.parseFromString(xhr.responseText, 'application/xml');
          const code = xml.querySelector('Code')?.textContent;
          const msg = xml.querySelector('Message')?.textContent;
          if (msg || code) {
            s3ErrMsg = `Storage error [${code ?? xhr.status}]: ${msg ?? 'File rejected'}`;
          }
        } catch {}
        await cleanupAndCancel(
          `${s3ErrMsg} Incomplete file removed.`,
        );
      }
    };

    xhr.onerror = async () => {
      if (!signal?.aborted) {
        console.warn('[VideoUploadDirect] XHR failed, fallback to native Fetch streaming...');
        // Fresh FormData for fetch fallback — the XHR consumed the previous one
        const fetchRes = await uploadViaFetch(uploadLink);
        resolve(fetchRes);
        return;
      }
      cleanupAndCancel(
        'Network connection interrupted during video upload. Incomplete file removed.',
      );
    };

    xhr.ontimeout = () => {
      cleanupAndCancel('Upload timed out. Incomplete file removed.');
    };

    try {
      // Build fresh FormData for XHR — each send() consumes the stream
      xhr.send(buildS3Form(file, clientPayload, safeFilename));
    } catch {
      // Fresh FormData for catch fallback
      uploadViaFetch(uploadLink).then(resolve);
    }
  });
}
