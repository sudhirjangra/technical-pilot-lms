'use client';

import LogoIcon from '@/components/logo-icon';
import { forgotPassword } from '@/server/auth.server';
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
import SubmitButton from '@repo/shadcn/submit-button';
import { CheckCircle2 } from '@repo/shadcn/lucide';
import { useAction } from 'next-safe-action/hooks';
import Link from 'next/link';
import { ChangeEvent, useState } from 'react';

const ForgotPasswordForm = () => {
  const [formData, setFormData] = useState({ identifier: '' });
  const [sent, setSent] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const {
    execute,
    isExecuting,
    result: { validationErrors, serverError },
  } = useAction(forgotPassword, {
    onSuccess: () => setSent(true),
  });

  // Success state
  if (sent) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="size-7 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription>
              We sent a password reset code to{' '}
              <span className="font-medium text-foreground">{formData.identifier}</span>.
              Please check your inbox.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-4">
              <Link
                href={`/auth/reset-password?email=${encodeURIComponent(formData.identifier)}&message=Enter the reset code we sent to your email`}
                className="w-full"
              >
                <button className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors px-4">
                  Enter reset code →
                </button>
              </Link>
              <p className="text-center text-sm text-muted-foreground">
                Didn&apos;t receive it?{' '}
                <button
                  onClick={() => setSent(false)}
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                >
                  Try again
                </button>
              </p>
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
          <CardTitle className="text-2xl font-bold">Forgot password?</CardTitle>
          <CardDescription
            className={cn('text-sm', serverError ? 'text-destructive' : '')}
          >
            {serverError ??
              "No worries — enter your email and we'll send you a reset code."}
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

              {/* Submit */}
              <SubmitButton isLoading={isExecuting} name="Send Reset Code" />

              {/* Back link */}
              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link
                  href="/auth/sign-in"
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordForm;
