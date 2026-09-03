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
  let response: Response | null = null;
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

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await fetch(requestUrl, init);
      break;
    } catch {
      if (fallbackUrl) {
        try {
          response = await fetch(fallbackUrl, init);
          break;
        } catch {
          response = null;
        }
      }

      if (attempt === 2) {
        return [API_UNREACHABLE_MESSAGE, null];
      }

      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }

  if (!response) return [API_UNREACHABLE_MESSAGE, null];

  let res: unknown;
  try {
    const text = await response.text();
    if (response.status === 204 || text.trim() === '') {
      res = {};
    } else {
      res = JSON.parse(text);
    }
  } catch {
    const contentType = response.headers.get('content-type') ?? 'unknown content type';
    const responsePath = new URL(response.url).pathname;
    return [
      `API returned invalid JSON (${response.status}, ${contentType}) at ${responsePath}`,
      null,
    ];
  }

  if (!response.ok) {
    const body = res as Record<string, unknown>;
    if (body.code) {
      return [JSON.stringify(body), null];
    }
    const msg = body.message;
    if (typeof msg === 'string') {
      return [msg, null];
    }
    return ['Request failed', null];
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
