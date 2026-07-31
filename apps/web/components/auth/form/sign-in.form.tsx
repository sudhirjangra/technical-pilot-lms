'use client';

import LogoIcon from '@/components/logo-icon';
import { removeSession, signInWithCredentials } from '@/server/auth.server';
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

  if (deviceSessions.length > 0) {
    return (
      <div className={cn('w-full flex flex-col gap-6')}>
        <Card className="max-w-xl w-full mx-auto">
          <CardHeader className="text-center mb-4">
            <LogoIcon className="mb-3" />
            <CardTitle className="text-xl text-start">
              Device Limit Reached
            </CardTitle>
            <CardDescription className="text-start">
              You have reached the maximum of 2 active sessions. Remove one to
              continue signing in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deviceSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {session.device_name}
                    </p>
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
                    {removingId === session.id ? 'Removing...' : 'Remove'}
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full mt-4"
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
    <div className={cn('w-full flex flex-col gap-6')}>
      <Card className="max-w-xl w-full mx-auto">
        <CardHeader className="text-center mb-7">
          <LogoIcon className="mb-3" />
          <CardTitle className="text-xl text-start">SignIn</CardTitle>
          <CardDescription
            className={cn('text-start', serverError && 'text-red-500')}
          >
            {serverError && !serverError.includes('DEVICE_LIMIT')
              ? serverError
              : 'SignIn with your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                execute(formData);
              }}
            >
              <div className="grid gap-6">
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label isRequired htmlFor="email">
                      Email
                    </Label>
                    <Input
                      disabled={isExecuting}
                      name="identifier"
                      id="email"
                      placeholder="acme@example.com"
                      onChange={handleChange}
                      autoFocus
                      autoComplete="email"
                      required
                    />
                    {validationErrors?.identifier?._errors?.[0] && (
                      <p className="text-xs text-red-500">
                        {validationErrors.identifier._errors[0]}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label isRequired htmlFor="password">
                        Password
                      </Label>
                      <Link
                        href={'/auth/forgot-password'}
                        className="ml-auto text-sm underline-offset-4 hover:underline"
                      >
                        Forgot your password?
                      </Link>
                    </div>
                    <PasswordInput
                      disabled={isExecuting}
                      name="password"
                      id="password"
                      onChange={handleChange}
                      required
                    />
                    {validationErrors?.password?._errors?.[0] && (
                      <p className="text-xs text-red-500">
                        {validationErrors.password._errors[0]}
                      </p>
                    )}
                  </div>
                  <div className="text-sm">
                    Don&apos;t have an account?{' '}
                    <Link
                      href={'/auth/sign-up'}
                      className="underline underline-offset-4"
                    >
                      Sign up
                    </Link>
                  </div>
                  <SubmitButton isLoading={isExecuting} name={'Sign In'} />
                </div>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignInForm;
