'use client';

import { clientEnv } from './env.client';

export type DirectUploadProgress = (percent: number) => void;

/**
 * Uploads a file directly from the browser to the NestJS API, bypassing the
 * Next.js server (which enforces small serverless payload limits on hosts like Vercel).
 */
export function uploadFileDirect<T>(
  path: string,
  file: File,
  accessToken: string | undefined,
  fieldName = 'file',
  onProgress?: DirectUploadProgress,
): Promise<{ data?: T; error?: string }> {
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append(fieldName, file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${clientEnv.API_URL}${path}`);
    if (accessToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: unknown;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        resolve({ error: 'Invalid response from server' });
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ data: body as T });
      } else {
        const message =
          typeof body === 'object' && body !== null && 'message' in body
            ? String((body as { message: unknown }).message)
            : 'Upload failed';
        resolve({ error: message });
      }
    };

    xhr.onerror = () => resolve({ error: 'Network error while uploading. Please try again.' });
    xhr.send(formData);
  });
}
