import { describe, expect, it, vi } from 'vitest';
import { validateSessionIfExist } from './auth.server';

vi.mock('next-auth', () => {
  class AuthError extends Error {
    constructor(message?: string, options?: any) {
      super(message);
      this.name = 'AuthError';
      if (options?.cause) (this as any).cause = options.cause;
    }
  }
  return { AuthError };
});

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib', () => ({
  safeAction: {
    schema: () => ({
      action: (fn: any) => fn,
    }),
    action: (fn: any) => fn,
  },
  safeFetch: vi.fn(),
}));

vi.mock('@/lib/device', () => ({
  getDeviceInfo: vi.fn().mockResolvedValue({
    device: 'desktop',
    os: 'Linux',
    browser: 'Chrome',
    ip_address: '127.0.0.1',
  }),
}));

describe('auth.server', () => {
  describe('validateSessionIfExist', () => {
    it('returns signedOut: false when session is valid', async () => {
      const { safeFetch } = await import('@/lib');
      vi.mocked(safeFetch).mockResolvedValueOnce([
        null,
        { data: { id: 'sess-1', user_id: 'user-1' } } as any,
      ]);

      const result = await validateSessionIfExist();
      expect(result.signedOut).toBe(false);
      expect(result.disabled).toBe(false);
      expect(result.data).toEqual({ data: { id: 'sess-1', user_id: 'user-1' } });
    });

    it('returns signedOut: true and disabled: true when account is disabled', async () => {
      const { safeFetch } = await import('@/lib');
      vi.mocked(safeFetch).mockResolvedValueOnce([
        'Your account has been disabled by an administrator',
        null,
      ]);

      const result = await validateSessionIfExist();
      expect(result.signedOut).toBe(true);
      expect(result.disabled).toBe(true);
      expect(result.data).toBeNull();
    });

    it('returns signedOut: true when session is not found', async () => {
      const { safeFetch } = await import('@/lib');
      vi.mocked(safeFetch).mockResolvedValueOnce([
        'Session not found',
        null,
      ]);

      const result = await validateSessionIfExist();
      expect(result.signedOut).toBe(true);
      expect(result.disabled).toBe(false);
      expect(result.data).toBeNull();
    });
  });
});