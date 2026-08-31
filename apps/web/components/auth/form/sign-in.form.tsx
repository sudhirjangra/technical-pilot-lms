'use client';

import LogoIcon from '@/components/logo-icon';
import { removeSession, signInWithCredentials } from '@/server/auth.server';
import { createClient } from '@repo/supabase/client';
import { APP_NAME } from '@repo/constants/app';
import { uiConfig } from '@repo/config';
import { Button } from '@repo/shadcn/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/shadcn/alert-dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/shadcn/card';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import { cn } from '@repo/shadcn/lib/utils';
import { PasswordInput } from '@repo/shadcn/password-input';
import SubmitButton from '@repo/shadcn/submit-button';
import { Laptop, Loader2, LogOut, Smartphone, Chrome } from '@repo/shadcn/lucide';
import { Google } from '@repo/shadcn/google';
import { useAction } from 'next-safe-action/hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useEffect, useState } from 'react';

interface DeviceSession {
  id: string;
  device_name: string;
  platform: string;
  last_active_at: string;
  created_at: string;
}

const SignInForm = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([]);
  const [deviceLimitOpen, setDeviceLimitOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const cardMaxWidth = 'w-full';
  const cardPadding = 'pt-3 sm:pt-4 px-4 sm:px-6';
  const formGap = 'gap-4 sm:gap-5';
  const inputGap = 'gap-1.5 sm:gap-2';
  const buttonHeight = 'h-10 sm:h-11';

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormData((prevState) => ({
      ...prevState,
      [event.target.name]: event.target.value,
    }));
  };

  const {
    execute,
    isExecuting,
    result: { validationErrors, serverError },
  } = useAction(signInWithCredentials, {
    onError: ({ error }) => {
      const msg = error.serverError ?? '';
      if (msg.includes('EMAIL_NOT_CONFIRMED')) {
        router.push(
          `/auth/confirm-email?email=${encodeURIComponent(formData.identifier)}`,
        );
        return;
      }
      if (msg.includes('DEVICE_LIMIT_REACHED')) {
        setDeviceLimitOpen(true);
        try {
          const parsed = JSON.parse(msg);
          const sessions = parsed.sessions ?? parsed.data?.sessions ?? [];
          setDeviceSessions(Array.isArray(sessions) ? sessions : []);
        } catch {
          setDeviceSessions([]);
        }
      }
    },
  });

  useEffect(() => {
    if (!serverError?.includes('DEVICE_LIMIT_REACHED')) return;

    setDeviceLimitOpen(true);
    try {
      const parsed = JSON.parse(serverError);
      const sessions = parsed.sessions ?? parsed.data?.sessions ?? [];
      setDeviceSessions(Array.isArray(sessions) ? sessions : []);
    } catch {
      setDeviceSessions([]);
    }
  }, [serverError]);

  const handleRemoveSession = async (sessionId: string) => {
    setRemovingId(sessionId);
    try {
      const result = await removeSession({ session_token: sessionId });
      if (result?.data === 'success') {
        const remainingSessions = deviceSessions.filter((s) => s.id !== sessionId);
        setDeviceSessions(remainingSessions);
        setDeviceLimitOpen(false);
        execute(formData);
      }
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full">
      <Card className={cn('water-surface', cardMaxWidth)} style={{ maxWidth: uiConfig.signInCardMaxWidth }}>
        <CardHeader className="text-center pb-2 sm:pb-3">
          {/* Logo */}
          <div className="flex justify-center mb-3 sm:mb-4">
            <LogoIcon width={44} height={44} className="w-11 h-11 sm:w-12 sm:h-12" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription
            className={cn(
              'text-sm sm:text-base',
              serverError && !serverError.includes('DEVICE_LIMIT')
                ? 'text-destructive'
                : '',
            )}
          >
            {serverError && !serverError.includes('DEVICE_LIMIT')
              ? serverError
              : `Sign in to your ${APP_NAME} account`}
          </CardDescription>
        </CardHeader>

        <CardContent className={cardPadding}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              execute(formData);
            }}
          >
            <div className={`grid ${formGap}`}>
              {/* Email */}
              <div className={`grid ${inputGap}`}>
                <Label isRequired htmlFor="identifier" className="text-sm sm:text-base">
                  Email
                </Label>
                <Input
                  id="identifier"
                  name="identifier"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                  disabled={isExecuting}
                  onChange={handleChange}
                  className={`${buttonHeight} text-sm sm:text-base`}
                />
                {validationErrors?.identifier?._errors?.[0] && (
                  <p className="text-xs text-destructive">
                    {validationErrors.identifier._errors[0]}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className={`grid ${inputGap}`}>
                <div className="flex items-center justify-between">
                  <Label isRequired htmlFor="password" className="text-sm sm:text-base">
                    Password
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs sm:text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  name="password"
                  required
                  disabled={isExecuting}
                  onChange={handleChange}
                  className={`${buttonHeight} text-sm sm:text-base`}
                />
                {validationErrors?.password?._errors?.[0] && (
                  <p className="text-xs text-destructive">
                    {validationErrors.password._errors[0]}
                  </p>
                )}
              </div>

              {/* Submit */}
              <SubmitButton isLoading={isExecuting} name="Sign In" className={`${buttonHeight} text-sm sm:text-base mt-1 sm:mt-2`} />

              {/* Divider */}
              <div className="relative my-4 sm:my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
                </div>
              </div>

              {/* Google Sign In */}
              <Button
                type="button"
                variant="outline"
                className={`${buttonHeight} text-sm sm:text-base w-full gap-2`}
                disabled={isExecuting}
                onClick={async () => {
                  const supabase = createClient();
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: `${window.location.origin}/auth/callback`,
                      queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                      },
                    },
                  });
                  if (error) {
                    console.error('Google OAuth error:', error);
                  }
                }}
              >
                <Google className="size-4" />
                <span>Continue with Google</span>
              </Button>

              {/* Sign up link */}
              <p className="text-center text-sm sm:text-base text-muted-foreground mt-4 sm:mt-6">
                Don&apos;t have an account?{' '}
                <Link
                  href="/auth/sign-up"
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={deviceLimitOpen} onOpenChange={setDeviceLimitOpen}>
        <AlertDialogContent className="border-white/20 bg-background/80 shadow-2xl backdrop-blur-xl max-w-sm sm:max-w-md md:max-w-lg w-full mx-4 sm:mx-auto">
          <AlertDialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="mb-2 flex size-10 sm:size-12 items-center justify-center rounded-xl sm:rounded-2xl bg-destructive/10 text-destructive">
              <LogOut className="size-5 sm:size-6" />
            </div>
            <AlertDialogTitle className="text-lg sm:text-xl font-semibold">Sign-in limit reached</AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              This account has reached its active session limit. Sign out an existing
              device below before continuing on this one.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-[40vh] sm:max-h-[45vh] space-y-2 sm:space-y-3 overflow-y-auto py-1 px-4 sm:px-6">
            {deviceSessions.length > 0 ? (
              deviceSessions.map((session) => {
                const DeviceIcon = session.platform === 'web' ? Laptop : Smartphone;
                return (
                  <div
                    key={session.id}
                    className="flex items-start gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-white/20 bg-white/40 p-3 sm:p-4 dark:bg-white/5"
                  >
                    <DeviceIcon className="mt-0.5 size-4.5 sm:size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
                      <p className="font-medium text-sm sm:text-base truncate">{session.device_name}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {session.platform} device
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(session.created_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last active: {new Date(session.last_active_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={removingId === session.id}
                      onClick={() => handleRemoveSession(session.id)}
                      className="h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm shrink-0"
                    >
                      {removingId === session.id ? (
                        <Loader2 className="mr-1.5 sm:mr-2 size-3.5 sm:size-4 animate-spin" />
                      ) : (
                        <LogOut className="mr-1.5 sm:mr-2 size-3.5 sm:size-4" />
                      )}
                      Sign out
                    </Button>
                  </div>
                );
              })
            ) : (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-4 text-sm text-muted-foreground text-center">
                Session details could not be loaded. Close this window and try
                signing in again to refresh the active-session list.
              </p>
            )}
          </div>

          <AlertDialogFooter className="px-4 sm:px-6 pb-4 sm:pb-6 flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base">
                Cancel
              </Button>
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SignInForm;
