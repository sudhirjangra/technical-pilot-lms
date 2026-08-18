'use client';

import PasswordValidErrors from '@/components/auth/form/password-valid-errors';
import LogoIcon from '@/components/logo-icon';
import { resetPassword } from '@/server/auth.server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/shadcn/card';
import { Input } from '@repo/shadcn/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  REGEXP_ONLY_DIGITS,
} from '@repo/shadcn/input-otp';
import { Label } from '@repo/shadcn/label';
import { cn } from '@repo/shadcn/lib/utils';
import { PasswordInput } from '@repo/shadcn/password-input';
import SubmitButton from '@repo/shadcn/submit-button';
import { CheckCircle2 } from '@repo/shadcn/lucide';
import { Session } from 'next-auth';
import { useAction } from 'next-safe-action/hooks';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChangeEvent, useState } from 'react';

const ResetPasswordForm = ({ session }: { session: Session | null }) => {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const message = searchParams.get('message');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    identifier: email ?? session?.user?.email ?? '',
    newPassword: '',
    resetToken: '',
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const {
    execute,
    isExecuting,
    result: { validationErrors, serverError },
  } = useAction(resetPassword, {
    onSuccess: () => setSuccess(true),
  });

  // Success state
  if (success) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="size-7 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Password reset!</CardTitle>
            <CardDescription>
              Your password has been updated successfully. You can now sign in
              with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Link href="/auth/sign-in" className="block">
              <button className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors px-4">
                Sign in now →
              </button>
            </Link>
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
          <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
          <CardDescription
            className={cn('text-sm', serverError ? 'text-destructive' : '')}
          >
            {serverError ?? message ?? 'Enter your new password and the reset code from your email.'}
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
                  required
                  disabled={isExecuting}
                  value={formData.identifier}
                  onChange={handleChange}
                />
                {validationErrors?.identifier?._errors?.[0] && (
                  <p className="text-xs text-destructive">
                    {validationErrors.identifier._errors[0]}
                  </p>
                )}
              </div>

              {/* New password */}
              <div className="grid gap-2">
                <Label isRequired htmlFor="newPassword">
                  New Password
                </Label>
                <PasswordInput
                  id="newPassword"
                  name="newPassword"
                  required
                  disabled={isExecuting}
                  autoFocus
                  onChange={handleChange}
                />
                {validationErrors?.newPassword?._errors?.[0] && (
                  <p className="text-xs text-destructive">
                    {validationErrors.newPassword._errors[0]}
                  </p>
                )}
                <PasswordValidErrors password={formData.newPassword} />
              </div>

              {/* Reset code OTP */}
              <div className="grid gap-2">
                <Label isRequired htmlFor="resetToken">
                  6-digit Reset Code
                </Label>
                <InputOTP
                  disabled={isExecuting}
                  maxLength={6}
                  minLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  onChange={(resetToken) =>
                    setFormData((prev) => ({ ...prev, resetToken }))
                  }
                >
                  <InputOTPGroup className="w-full grid grid-cols-6 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="w-full h-11 rounded-md border text-center text-sm font-semibold first:rounded-md last:rounded-md"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                {validationErrors?.resetToken?._errors?.[0] && (
                  <p className="text-xs text-destructive">
                    {validationErrors.resetToken._errors[0]}
                  </p>
                )}
              </div>

              {/* Submit */}
              <SubmitButton isLoading={isExecuting} name="Reset Password" />

              {/* Links */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <Link
                  href="/auth/forgot-password"
                  className="underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  Resend code
                </Link>
                <Link
                  href="/auth/sign-in"
                  className="underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordForm;
