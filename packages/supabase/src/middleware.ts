import { createServerClient } from '@supabase/ssr';
import type { Database } from './types/index.js';

interface MiddlewareRequest {
  cookies: {
    getAll(): { name: string; value: string }[];
    set(name: string, value: string, options?: Record<string, unknown>): void;
  };
}

interface MiddlewareResponse {
  cookies: {
    set(name: string, value: string, options?: Record<string, unknown>): void;
  };
}

export function createMiddlewareClient(
  request: MiddlewareRequest,
  response: MiddlewareResponse,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value, options);
          response.cookies.set(name, value, options);
        }
      },
    },
  });
}
