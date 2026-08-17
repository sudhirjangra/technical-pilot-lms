'use server';

import { auth, signIn, signOut, update } from '@/auth';
import { safeAction, safeFetch } from '@/lib';
import { getDeviceInfo } from '@/lib/device';
import {
  ChangePasswordSchema,
  ConfirmEmailSchema,
  DeleteAccountSchema,
  ForgotPasswordSchema,
  GetSession,
  GetSessionSchema,
  GetSessionsSchema,
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
    throw new Error(error);
  }
  const { data: user, tokens } = data!;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    phone: user.phone,
    avatar_url: user.avatar_url,
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
      if (error instanceof AuthError) {
        if (error.cause && typeof error.cause === 'object') {
          const cause = error.cause as { err?: Error };
          const msg = cause.err?.message ?? '';
          if (msg.includes('EMAIL_NOT_CONFIRMED')) {
            throw new Error('EMAIL_NOT_CONFIRMED');
          }
          if (msg.includes('DEVICE_LIMIT_REACHED')) {
            throw new Error(msg);
          }
        }
        if (error.type === 'CredentialsSignin') {
          throw new Error('Invalid credentials.');
        }
        throw new Error('Something went wrong.');
      }
      if (isRedirectError(error)) {
        revalidateTag('/auth/sign-in');
        redirect('/');
      }
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

    redirect(`/auth/confirm-email?email=${encodeURIComponent(parsedInput.email)}`);
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

  revalidateTag('nest-auth-sessions');
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
 * Sign out from all devices.
 */
export const signOutAllDevice = safeAction.action(async () => {
  const session = await auth();

  const [error] = await safeFetch(
    DefaultReturnSchema,
    '/auth/sign-out-allDevices',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.user?.tokens.access_token}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({ userId: session?.user.id }),
    },
  );

  if (!error) {
    revalidateTag('nest-auth-sessions');
    await signOut({ redirect: true, redirectTo: '/' });
  }
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
    if (error) throw error;
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
    if (error) throw error;
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
 * Confirm email with token
 * @schema ConfirmEmailSchema
 */
export const confirmEmail = safeAction
  .schema(ConfirmEmailSchema)
  .action(async ({ parsedInput }) => {
    const [error] = await safeFetch(
      DefaultReturnSchema,
      '/auth/confirm-email',
      {
        method: 'PATCH',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(parsedInput),
      },
    );
    if (error) throw new Error(error);
    redirect(`/auth/sign-in`);
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
export const refreshAccessToken = async (user: User): Promise<unknown> => {
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
};

/**
 * Validate session if exist from server session
 */
export const validateSessionIfExist = async (): Promise<GetSession | null> => {
  const [error, data] = await getSessionById();
  if (error) {
    if (process.env.NODE_ENV !== 'production') console.log('Validate session error', error);
    // Only sign out if the error indicates the session is truly invalid (404),
    // not when the API is just unreachable (network errors)
    if (error.includes('Session not found') || error.includes('Invalid Access Token')) {
      await signOut({
        redirect: false,
      });
    }
  }
  return data;
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
