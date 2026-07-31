import z, { ZodSchema } from 'zod';
import { env } from './env';

/**
 * Fetch data from API and validate the response using a Zod schema.
 *
 * @template T - Zod schema type
 * @param {T} schema - Zod schema to validate the response data
 * @param {URL | RequestInfo} url - API endpoint (relative to env.API_URL)
 * @param {RequestInit} [init] - Optional fetch init options
 * @returns {Promise<[string | null, z.TypeOf<T> | null]>} - Returns a tuple of [errorMessage, validatedData]
 */
export const safeFetch = async <T extends ZodSchema<unknown>>(
  schema: T,
  url: URL | RequestInfo,
  init?: RequestInit,
): Promise<[string | null, z.TypeOf<T>]> => {
  let response: Response;
  try {
    response = await fetch(`${env.API_URL}${url}`, init);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network request failed';
    return [msg, null];
  }

  let res: unknown;
  try {
    res = await response.json();
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
