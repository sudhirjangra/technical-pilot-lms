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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/shadcn/alert-dialog';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

const SignUpForm = () => {
  const searchParams = useSearchParams();
  const refCodeFromUrl = searchParams.get('ref') ?? '';

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    phone: '',
    referral_code: refCodeFromUrl,
  });

  useEffect(() => {
    if (refCodeFromUrl) {
      setFormData((prev) => ({ ...prev, referral_code: refCodeFromUrl.toUpperCase() }));
    }
  }, [refCodeFromUrl]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormData((prevState) => ({
      ...prevState,
      [event.target.name]: event.target.value,
    }));
  };

  const [showNoRefWarning, setShowNoRefWarning] = useState(false);
  const referralInputRef = useRef<HTMLInputElement>(null);

  const {
    execute,
    isExecuting,
    result: { validationErrors, serverError },
  } = useAction(signUpWithCredentials);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.referral_code.trim()) {
      setShowNoRefWarning(true);
      return;
    }
    execute(formData);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <Card className="border-border/80 bg-card/80 backdrop-blur-md shadow-sm">
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
          <form onSubmit={handleSubmit}>
            <div className="grid gap-5">
              <div className="grid gap-2">
                <Label isRequired htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                  disabled={isExecuting}
                  onChange={handleChange}
                />
                {validationErrors?.full_name?._errors?.[0] && (
                  <p className="text-xs text-destructive">{validationErrors.full_name._errors[0]}</p>
                )}
              </div>

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

              {/* Phone (required) */}
              <div className="grid gap-2">
                <Label isRequired htmlFor="phone">
                  Mobile Number
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+919876543210"
                  autoComplete="tel"
                  required
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

              {/* Referral Code (Optional) */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="referral_code">Referral Code (Optional)</Label>
                  {formData.referral_code && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      🎁 20% discount coupon applied
                    </span>
                  )}
                </div>
                <Input
                  ref={referralInputRef}
                  id="referral_code"
                  name="referral_code"
                  type="text"
                  placeholder="e.g. TP7K9X2B"
                  autoCapitalize="characters"
                  disabled={isExecuting}
                  value={formData.referral_code}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      referral_code: e.target.value.toUpperCase(),
                    }));
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Invited by a friend? Enter their referral code to unlock a 20% discount coupon on all courses!
                </p>
              </div>

              {/* Submit */}
              <SubmitButton isLoading={isExecuting} name="Create Account" />

              <div className="flex flex-col items-center gap-2 pt-2 text-center text-sm text-muted-foreground">
                <p>
                  Already have an account?{' '}
                  <Link
                    href="/auth/sign-in"
                    className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
                <p className="text-xs">
                  Need assistance?{' '}
                  <Link
                    href="/contact"
                    className="underline underline-offset-4 hover:text-foreground transition-colors"
                  >
                    Contact Support
                  </Link>
                </p>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Warning Dialog when No Referral Code is Entered */}
      <AlertDialog open={showNoRefWarning} onOpenChange={setShowNoRefWarning}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">No Referral Code Entered</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              You haven&apos;t entered a referral code. If a friend invited you to Technical Pilot, entering their code now unlocks an exclusive <strong className="text-foreground">20% discount coupon</strong> on all courses!
              <br /><br />
              Don&apos;t have a code right now? No worries—you can also link a referral code later anytime from your student dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
            <AlertDialogCancel
              onClick={() => {
                setShowNoRefWarning(false);
                setTimeout(() => referralInputRef.current?.focus(), 150);
              }}
              className="text-xs sm:text-sm"
            >
              Enter Referral Code
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowNoRefWarning(false);
                execute(formData);
              }}
              className="text-xs sm:text-sm"
            >
              Continue Without Code
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SignUpForm;
