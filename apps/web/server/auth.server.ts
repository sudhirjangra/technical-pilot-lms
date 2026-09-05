'use server';

import { auth, signIn, signOut, update } from '@/auth';
import { safeAction, safeFetch } from '@/lib';
import { getDeviceInfo } from '@/lib/device';
import {
  ChangePasswordSchema,
  CompleteProfileSchema,
  ConfirmEmailSchema,
  DeleteAccountSchema,
  ForgotPasswordSchema,
  GetSession,
  GetSessionSchema,
  GetSessionsSchema,
  GoogleSignIn,
  GoogleSignInSchema,
  RefreshToken,
  RefreshTokenSchema,
  ResendOtpSchema,
  ResetPasswordSchema,
  Session,
  SignIn,
  SignInDataSchema,
  SignInSchema,
  SignOutSchema,
  SignUpSchema,
} from '@/types/auth.type';
import { DefaultReturnSchema } from '@/types/default.type';
import { AuthError, User } from 'next-auth';
import { decodeJwt } from 'jose';
import { revalidateTag } from 'next/cache';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redirect } from 'next/navigation';

/**
 * Parses and sends credential-based login with device info to backend.
 * Throws specific error strings for EMAIL_NOT_CONFIRMED and DEVICE_LIMIT_REACHED.
 */
export const authorizeSignIn = async (
  credentials: SignIn,
): Promise<null | User> => {
  const deviceInfo = await getDeviceInfo();
  const [error, data] = await safeFetch(SignInDataSchema, '/auth/sign-in', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      ...credentials,
      ...deviceInfo,
    }),
  });

  if (error) {
    // Must throw AuthError — @auth/core swallows plain Error from authorize callbacks.
    // We stash the original message in cause so signInWithCredentials can read it.
    throw new AuthError(error, { cause: { message: error } });
  }
  const { data: user, tokens } = data!;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    date_of_birth: user.date_of_birth,
    phone: user.phone,
    avatar_url: user.avatar_url,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
    tokens: tokens,
  };
};

/**
 * Handles Google sign-in by creating or finding user in backend.
 * Returns user data with tokens for NextAuth session.
 */
export const authorizeGoogleSignIn = async (
  googleUser: GoogleSignIn,
): Promise<null | User> => {
  const deviceInfo = await getDeviceInfo();
  const [error, data] = await safeFetch(SignInDataSchema, '/auth/google-sign-in', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      ...googleUser,
      ...deviceInfo,
    }),
  });

  if (error) {
    throw new AuthError(error, { cause: { message: error } });
  }
  const { data: user, tokens } = data!;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    date_of_birth: user.date_of_birth,
    phone: user.phone,
    avatar_url: user.avatar_url ?? googleUser.image,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
    tokens: tokens,
  };
};

/**
 * UI Sign-in action using credentials.
 */
export const signInWithCredentials = safeAction
  .schema(SignInSchema)
  .action(async ({ parsedInput }) => {
    try {
      await signIn('credentials', parsedInput);
    } catch (error) {
      const authError = error as {
        cause?: Record<string, unknown>;
        message?: string;
      };
      const cause = authError.cause;
      const messages = [
        authError.message,
        cause?.message,
        cause?.err instanceof Error ? cause.err.message : undefined,
      ].filter((message): message is string => typeof message === 'string');
      const deviceLimitMessage = messages.find((message) =>
        message.includes('DEVICE_LIMIT_REACHED'),
      );

      if (deviceLimitMessage) {
        let sessions: unknown[] = [];
        for (const message of messages) {
          try {
            const parsed = JSON.parse(message);
            const parsedSessions = parsed.sessions ?? parsed.data?.sessions;
            if (Array.isArray(parsedSessions)) {
              sessions = parsedSessions;
              break;
            }
          } catch {}
        }
        throw new Error(JSON.stringify({ code: 'DEVICE_LIMIT_REACHED', sessions }));
      }

      if (isRedirectError(error)) throw error; // success — let NextAuth's redirect through
      if (error instanceof AuthError) {
        // NextAuth 5 beta wraps the original error differently across versions.
        // Check all known locations: cause.err.message, cause.message, error.message.
        const msg: string =
          (cause?.err instanceof Error ? cause.err.message : null) ??
          (typeof cause?.message === 'string' ? cause.message : null) ??
          error.message ??
          '';
        const normalizedMsg = msg.toLowerCase();

        if (
          msg.includes('Unable to reach the API server') ||
          normalizedMsg.includes('fetch failed')
        ) {
          throw new Error(
            'Unable to reach the API server. Please ensure backend is running and try again.',
          );
        }
        if (msg.includes('EMAIL_NOT_CONFIRMED')) throw new Error('EMAIL_NOT_CONFIRMED');
        if (msg.includes('DEVICE_LIMIT_REACHED')) {
          let sessions: unknown[] = [];
          try {
            const parsed = JSON.parse(msg);
            const parsedSessions = parsed.sessions ?? parsed.data?.sessions;
            if (Array.isArray(parsedSessions)) sessions = parsedSessions;
          } catch {}
          throw new Error(JSON.stringify({ code: 'DEVICE_LIMIT_REACHED', sessions }));
        }
        if (error.type === 'CredentialsSignin') throw new Error(msg || 'Invalid credentials');
        throw new Error(msg || 'Something went wrong');
      }
      throw error;
    }
  });

/**
 * Remove a specific session by ID (public, used during device-limit flow).
 */
export const removeSession = safeAction
  .schema(SignOutSchema)
  .action(async ({ parsedInput }) => {
    const [error] = await safeFetch(DefaultReturnSchema, '/auth/sign-out', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ session_token: parsedInput.session_token }),
    });
    if (error) throw new Error(error);
    return 'success';
  });

/**
 * UI Sign-up action with auto login.
 * @schema SignUpSchema
 */
export const signUpWithCredentials = safeAction
  .schema(SignUpSchema)
  .action(async ({ parsedInput }) => {
    const [error] = await safeFetch(DefaultReturnSchema, '/auth/sign-up', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(parsedInput),
    });

    if (error) throw new Error(error);

    // Sign the user straight in when the project does not require e-mail confirmation.
    // Otherwise fall through to the confirmation screen.
    try {
      await signIn('credentials', {
        identifier: parsedInput.email,
        password: parsedInput.password,
        redirectTo: '/dashboard',
      });
    } catch (signInError) {
      if (isRedirectError(signInError)) throw signInError;
    }

    redirect(`/auth/confirm-email?email=${encodeURIComponent(parsedInput.email)}`);
  });

/**
 * Complete profile action for users who signed in with Google.
 * @schema CompleteProfileSchema
 */
export const completeProfile = safeAction
  .schema(CompleteProfileSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth();
    if (!session?.user) throw new Error('Not authenticated');

    const [error] = await safeFetch(
      DefaultReturnSchema,
      '/auth/complete-profile',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.user.tokens.access_token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify(parsedInput),
      },
    );

    if (error) throw new Error(error);

    // Update the session with new profile data
    await update({
      user: {
        ...session.user,
        full_name: parsedInput.full_name,
        date_of_birth: parsedInput.date_of_birth,
        phone: parsedInput.phone,
      },
    });
  });

/**
 * Sign out a device by session token.
 * @param token
 */
const signOutBySessionToken = async (token: string) => {
  const session = await auth();

  const [error] = await safeFetch(DefaultReturnSchema, '/auth/sign-out', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.user.tokens.access_token}`,
      Accept: 'application/json',
    },
    body: JSON.stringify({ session_token: token }),
  });

  if (error) throw error;

  revalidateTag('nest-auth-sessions', 'max');
};

/**
 * Sign out from current device.
 */
export const signOutCurrentDevice = safeAction.action(async () => {
  const session = await auth();
  if (!session) return;

  await signOutBySessionToken(session.user.tokens.session_token);
  await signOut({ redirect: true, redirectTo: '/' });

  return 'success';
});

/**
 * Sign out from a different device by session token.
 * @schema SignOutSchema
 */
export const signOutOtherDevice = safeAction
  .schema(SignOutSchema)
  .action(async ({ parsedInput }) => {
    await signOutBySessionToken(parsedInput.session_token);
    return 'success';
  });

/**
 * Sign out of all devices/sessions for the current user, then end the local session.
 */
export const signOutAllDevices = safeAction.action(async () => {
  const session = await auth();
  const [error] = await safeFetch(DefaultReturnSchema, '/auth/sessions', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
      Accept: 'application/json',
    },
  });
  if (error) throw new Error(error);
  revalidateTag('nest-auth-sessions', 'max');
  await signOut({ redirect: true, redirectTo: '/auth/sign-in' });
  return 'success';
});

/**
 * Change password for the current user.
 * @schema ChangePasswordSchema
 */
export const changePassword = safeAction
  .schema(ChangePasswordSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmNewPassword, ...payload } = parsedInput;

    const [error, resultData] = await safeFetch(
      DefaultReturnSchema,
      '/auth/change-password',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.user?.tokens.access_token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          identifier: session?.user.email,
          ...payload,
        }),
      },
    );

    if (error) throw new Error(error);
    return resultData;
  });

/**
 * Send forgot password email.
 * @schema ForgotPasswordSchema
 */
export const forgotPassword = safeAction
  .schema(ForgotPasswordSchema)
  .action(async ({ parsedInput }) => {
    const [error, data] = await safeFetch(
      DefaultReturnSchema,
      '/auth/forgot-password',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify(parsedInput),
      },
    );
    if (error) throw new Error(error);
    redirect(
      `/auth/reset-password?email=${parsedInput.identifier}&message=${data!.message}`,
    );
  });

/**
 * Reset password using token.
 * @schema ResetPasswordSchema
 */
export const resetPassword = safeAction
  .schema(ResetPasswordSchema)
  .action(async ({ parsedInput }) => {
    const [error] = await safeFetch(
      DefaultReturnSchema,
      '/auth/reset-password',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify(parsedInput),
      },
    );
    if (error) throw new Error(error);
    redirect('/auth/sign-in');
  });

/**
 * Get current session by token.
 * @schema GetSessionSchema
 */
export const getSessionById = async () => {
  const session = await auth();
  return await safeFetch(
    GetSessionSchema,
    `/auth/session/${session?.user?.tokens.session_token}`,
    {
      next: {
        tags: ['next-auth-session'],
        revalidate: 86400, // 24 hours
      },
      headers: {
        Authorization: `Bearer ${session?.user?.tokens.access_token}`,
      },
    },
  );
};

/**
 * Get all active sessions for the user.
 */
export const getAuthSessions = async (): Promise<Session[]> => {
  const session = await auth();

  const [error, data] = await safeFetch(
    GetSessionsSchema,
    `/auth/sessions/${session?.user.id}`,
    {
      next: {
        tags: ['nest-auth-sessions'],
        revalidate: 3600, // 1 hour
      },
      headers: {
        Authorization: `Bearer ${session?.user?.tokens.access_token}`,
      },
    },
  );

  if (error) return [];
  return data!.data;
};

/**
 * Confirm email with token and sign in directly
 * @schema ConfirmEmailSchema
 */
export const confirmEmail = safeAction
  .schema(ConfirmEmailSchema)
  .action(async ({ parsedInput }) => {
    const deviceInfo = await getDeviceInfo();
    const [error, data] = await safeFetch(
      SignInDataSchema,
      '/auth/confirm-email',
      {
        method: 'PATCH',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          ...parsedInput,
          ...deviceInfo,
        }),
      },
    );

    if (error) throw new Error(error);

    const { data: user, tokens } = data!;
    const targetUrl = user.role === 'admin' ? '/admin' : '/dashboard';

    try {
      await signIn('Supabase', {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        session_token: tokens.session_token,
        session_refresh_time:
          typeof tokens.session_refresh_time === 'string'
            ? tokens.session_refresh_time
            : new Date(tokens.session_refresh_time).toISOString(),
        user_id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name ?? '',
        date_of_birth: user.date_of_birth ?? '',
        phone: user.phone ?? '',
        avatar_url: user.avatar_url ?? '',
        redirectTo: targetUrl,
      });
    } catch (signInError) {
      if (isRedirectError(signInError)) throw signInError;
      console.error('Direct sign-in after OTP failed:', signInError);
      redirect('/auth/sign-in');
    }

    redirect(targetUrl);
  });

export const resendOtp = safeAction
  .schema(ResendOtpSchema)
  .action(async ({ parsedInput }) => {
    const [error] = await safeFetch(
      DefaultReturnSchema,
      '/auth/resend-otp',
      {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(parsedInput),
      },
    );
    if (error) throw new Error(error);
    return 'OTP sent';
  });

/**
 * Update tokens in auth session
 */
const updateTokens = async (data: RefreshToken) => {
  await update({
    user: {
      tokens: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        session_token: data.session_token,
        session_refresh_time: data.access_token_refresh_time,
      },
    },
  });
};

/**
 * Refresh access token with refresh token
 * @param user
 */
export const refreshAccessToken = async (user: User): Promise<string | undefined> => {
  const [error, data] = await safeFetch(
    RefreshTokenSchema,
    '/auth/refresh-token',
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.tokens.refresh_token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({
        session_token: user.tokens.session_token,
        user_id: user.id,
      }),
    },
  );
  if (error) {
    if (process.env.NODE_ENV !== 'production') console.log('Refresh access token error', error);
    return;
  }
  await updateTokens(data!);
  return data!.access_token;
};

/**
 * Returns an access token suitable for a direct browser upload.
 * The browser can retain an expired token while the server session has been refreshed.
 */
export const getCurrentAccessToken = async (): Promise<string | undefined> => {
  const session = await auth();
  if (!session?.user) return undefined;

  try {
    const expiresAt = decodeJwt(session.user.tokens.access_token).exp;
    if (typeof expiresAt === 'number' && expiresAt * 1000 > Date.now() + 30_000) {
      return session.user.tokens.access_token;
    }
  } catch {
  }

  return refreshAccessToken(session.user);
};

/**
 * Validate session if exist from server session. Returns `{ signedOut: true }`
 * when the session was forcibly cleared (e.g. account disabled by an admin).
 */
export const validateSessionIfExist = async (): Promise<{
  data: GetSession | null;
  signedOut: boolean;
  disabled: boolean;
}> => {
  const [error, data] = await getSessionById();
  // Must match the API wording exactly — a loose "disabled" check also matched plain
  // expired/missing sessions, so signed-out users were told their account was disabled.
  const disabled = error?.includes('disabled by an administrator') ?? false;
  if (error) {
    if (process.env.NODE_ENV !== 'production') console.log('Validate session error', error);
    // Only sign out if the error indicates the session is truly invalid (404) or the
    // account has been disabled by an admin, not when the API is just unreachable.
    if (error.includes('Session not found') || error.includes('Invalid Access Token') || disabled) {
      await signOut({
        redirect: false,
      });
      return { data: null, signedOut: true, disabled };
    }
  }
  return { data: data ?? null, signedOut: false, disabled: false };
};

/**
 * Delete account
 * @schema DeleteAccountSchema
 * @param parsedInput
 * @returns Promise<MessageResponse>
 */
export const deleteAccount = safeAction
  .schema(DeleteAccountSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth();
    const [error] = await safeFetch(
      DefaultReturnSchema,
      '/auth/delete-account',
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.user?.tokens.access_token}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          user_id: session?.user.id,
          password: parsedInput.password,
        }),
      },
    );
    if (error) throw new Error(error);
    await signOut({ redirect: false });
    redirect('/auth/sign-in');
  });
