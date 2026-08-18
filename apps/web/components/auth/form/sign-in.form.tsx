'use client';

import LogoIcon from '@/components/logo-icon';
import { removeSession, signInWithCredentials } from '@/server/auth.server';
import { APP_NAME } from '@repo/constants/app';
import { Button } from '@repo/shadcn/button';
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
import { useAction } from 'next-safe-action/hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useState } from 'react';

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
        try {
          const parsed = JSON.parse(msg);
          setDeviceSessions(parsed.sessions ?? []);
        } catch {
          setDeviceSessions([]);
        }
      }
    },
  });

  const handleRemoveSession = async (sessionId: string) => {
    setRemovingId(sessionId);
    try {
      const result = await removeSession({ session_token: sessionId });
      if (result?.data === 'success') {
        setDeviceSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (deviceSessions.length <= 2) {
          execute(formData);
          setDeviceSessions([]);
        }
      }
    } finally {
      setRemovingId(null);
    }
  };

  // Device limit view
  if (deviceSessions.length > 0) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex justify-center mb-3">
              <LogoIcon width={44} height={44} />
            </div>
            <CardTitle className="text-xl">Device Limit Reached</CardTitle>
            <CardDescription>
              You have reached the maximum of 2 active sessions. Remove one to
              continue signing in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deviceSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div>
                    <p className="font-medium text-sm">{session.device_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.platform} &middot; Last active:{' '}
                      {new Date(session.last_active_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={removingId === session.id}
                    onClick={() => handleRemoveSession(session.id)}
                  >
                    {removingId === session.id ? 'Removing…' : 'Remove'}
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => setDeviceSessions([])}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
    </div>
  );
};

export default SignInForm;
