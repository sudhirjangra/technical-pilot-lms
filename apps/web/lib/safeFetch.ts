import z, { ZodSchema } from 'zod';
import { env } from './env';

const API_UNREACHABLE_MESSAGE =
  'Unable to reach the API server. Please ensure backend is running and try again.';

const isLocalApiHost = (host: string) => host === 'localhost' || host === '127.0.0.1';

const toFetchInput = (url: URL | RequestInfo): string | URL | Request => {
  if (typeof url === 'string' || url instanceof URL) return url;
  return url;
};

const getRelativePath = (url: URL | RequestInfo): string | null => {
  if (typeof url === 'string') {
    return url.startsWith('/') ? url : null;
  }
  if (url instanceof URL) return null;
  return url.url.startsWith('/') ? url.url : null;
};

/**
 * Fetch data from API and validate the response using a Zod schema.
 *
 * @template T - Zod schema type
 * @param {T} schema - Zod schema to validate the response data
 * @param {URL | RequestInfo} url - API endpoint (relative to env.API_URL)
 * @param {RequestInit} [init] - Optional fetch init options
 * @returns {Promise<[string, null] | [null, z.TypeOf<T>]>} - Discriminated tuple: [error, null] | [null, data]
 */
export const safeFetch = async <T extends ZodSchema<unknown>>(
  schema: T,
  url: URL | RequestInfo,
  init?: RequestInit,
): Promise<[string, null] | [null, z.TypeOf<T>]> => {
  let response: Response;
  const relativePath = getRelativePath(url);
  const apiBase = new URL(env.API_URL);
  const canRetryWithLoopback =
    relativePath !== null && isLocalApiHost(apiBase.hostname);
  const fallbackBase = canRetryWithLoopback
    ? new URL(apiBase.toString())
    : null;

  if (fallbackBase) {
    fallbackBase.hostname =
      apiBase.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
  }

  const requestUrl = relativePath
    ? new URL(relativePath, apiBase).toString()
    : toFetchInput(url);
  const fallbackUrl =
    fallbackBase && relativePath
      ? new URL(relativePath, fallbackBase).toString()
      : null;

  try {
    response = await fetch(requestUrl, init);
  } catch {
    if (fallbackUrl) {
      try {
        response = await fetch(fallbackUrl, init);
      } catch {
        return [API_UNREACHABLE_MESSAGE, null];
      }
    } else {
      return [API_UNREACHABLE_MESSAGE, null];
    }
  }

  let res: unknown;
  try {
    const text = await response.text();
    if (response.status === 204 || text.trim() === '') {
      res = {};
    } else {
      res = JSON.parse(text);
    }
  } catch {
    return ['Invalid JSON response', null];
  }

  if (!response.ok) {
    const body = res as Record<string, unknown>;
    // If response has structured error data (code, sessions, etc.), pass full JSON
    if (body.code) {
      return [JSON.stringify(body), null];
    }
    const msg = body.message;
    if (typeof msg === 'object' && msg !== null) {
      return [JSON.stringify(msg), null];
    }
    return [(msg as string) ?? 'Request failed', null];
  }

  const validateFields = schema.safeParse(res);

  if (!validateFields.success) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('safeFetch validation errors:', validateFields.error);
    }
    return [`Validation error: ${validateFields.error.message}`, null];
  }

  return [null, validateFields.data];
};
