'use client';

import LogoIcon from '@/components/logo-icon';
import { removeSession, signInWithCredentials } from '@/server/auth.server';
import { APP_NAME } from '@repo/constants/app';
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
import { Laptop, Loader2, LogOut, Smartphone } from '@repo/shadcn/lucide';
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
        if (remainingSessions.length < 2) {
          setDeviceLimitOpen(false);
          execute(formData);
        }
      }
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <Card>
        <CardHeader className="text-center pb-2">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <LogoIcon width={48} height={48} />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription
            className={cn(
              'text-sm',
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

        <CardContent className="pt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              execute(formData);
            }}
          >
            <div className="grid gap-5">
              {/* Email */}
              <div className="grid gap-2">
                <Label isRequired htmlFor="identifier">
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
                />
                {validationErrors?.identifier?._errors?.[0] && (
                  <p className="text-xs text-destructive">
                    {validationErrors.identifier._errors[0]}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label isRequired htmlFor="password">
                    Password
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition-colors"
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
                />
                {validationErrors?.password?._errors?.[0] && (
                  <p className="text-xs text-destructive">
                    {validationErrors.password._errors[0]}
                  </p>
                )}
              </div>

              {/* Submit */}
              <SubmitButton isLoading={isExecuting} name="Sign In" />

              {/* Sign up link */}
              <p className="text-center text-sm text-muted-foreground">
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
        <AlertDialogContent className="border-white/20 bg-background/80 shadow-2xl backdrop-blur-xl sm:max-w-xl">
          <AlertDialogHeader>
            <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <LogOut className="size-6" />
            </div>
            <AlertDialogTitle>Sign-in limit reached</AlertDialogTitle>
            <AlertDialogDescription>
              This account already has 2 active sessions. Sign out an existing
              device below before continuing on this one.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-[45vh] space-y-3 overflow-y-auto py-1">
            {deviceSessions.length > 0 ? (
              deviceSessions.map((session) => {
                const DeviceIcon = session.platform === 'web' ? Laptop : Smartphone;
                return (
                  <div
                    key={session.id}
                    className="flex items-start gap-3 rounded-2xl border border-white/20 bg-white/40 p-4 dark:bg-white/5"
                  >
                    <DeviceIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-medium">{session.device_name}</p>
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
                    >
                      {removingId === session.id ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <LogOut className="mr-2 size-4" />
                      )}
                      Sign out
                    </Button>
                  </div>
                );
              })
            ) : (
              <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-muted-foreground">
                Session details could not be loaded. Close this window and try
                signing in again to refresh the active-session list.
              </p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SignInForm;
