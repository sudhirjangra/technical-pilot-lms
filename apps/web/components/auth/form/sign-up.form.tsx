'use client';

import PasswordValidErrors from '@/components/auth/form/password-valid-errors';
import LogoIcon from '@/components/logo-icon';
import { signUpWithCredentials } from '@/server/auth.server';
import { APP_NAME } from '@repo/constants/app';
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
import { ChangeEvent, useState } from 'react';

const SignUpForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
  });

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
  } = useAction(signUpWithCredentials);

  return (
    <div className="flex flex-col gap-6 w-full">
      <Card>
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <LogoIcon width={48} height={48} />
          </div>
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription
            className={cn('text-sm', serverError ? 'text-destructive' : '')}
          >
            {serverError ?? `Join ${APP_NAME} and start learning`}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // strip empty phone before submitting
              execute({
                ...formData,
                phone: formData.phone.trim() || undefined,
              });
            }}
          >
            <div className="grid gap-5">
              {/* Email */}
              <div className="grid gap-2">
                <Label isRequired htmlFor="email">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                  disabled={isExecuting}
                  onChange={handleChange}
                />
                {validationErrors?.email?._errors?.[0] && (
                  <p className="text-xs text-destructive">
                    {validationErrors.email._errors[0]}
                  </p>
                )}
              </div>

              {/* Phone (optional) */}
              <div className="grid gap-2">
                <Label htmlFor="phone">
                  Mobile Number{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+919876543210"
                  autoComplete="tel"
                  disabled={isExecuting}
                  onChange={handleChange}
                />
                {validationErrors?.phone?._errors?.[0] && (
                  <p className="text-xs text-destructive">
                    {validationErrors.phone._errors[0]}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="grid gap-2">
                <Label isRequired htmlFor="password">
                  Password
                </Label>
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
                <PasswordValidErrors password={formData.password} />
              </div>

              {/* Submit */}
              <SubmitButton isLoading={isExecuting} name="Create Account" />

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
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

export default SignUpForm;
