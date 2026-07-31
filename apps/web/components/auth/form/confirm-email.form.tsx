'use client';

import LogoIcon from '@/components/logo-icon';
import { confirmEmail, resendOtp } from '@/server/auth.server';
import { Button } from '@repo/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/shadcn/card';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  REGEXP_ONLY_DIGITS,
} from '@repo/shadcn/input-otp';
import { cn } from '@repo/shadcn/lib/utils';
import SubmitButton from '@repo/shadcn/submit-button';
import { useAction } from 'next-safe-action/hooks';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

const ConfirmEmailForm = () => {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [token, setToken] = useState('');
  const [resendMsg, setResendMsg] = useState('');

  const {
    executeAsync,
    isExecuting,
    result: { validationErrors, serverError },
  } = useAction(confirmEmail);

  const { execute: executeResend, isExecuting: isResending } = useAction(
    resendOtp,
    {
      onSuccess: () => setResendMsg('New code sent to your email'),
      onError: ({ error }) =>
        setResendMsg(error.serverError ?? 'Failed to resend'),
    },
  );

  if (!email) {
    return (
      <div className={cn('w-full flex flex-col gap-6')}>
        <Card className="max-w-xl w-full mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Invalid Link</CardTitle>
            <CardDescription>
              No email address provided. Please sign in again.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('w-full flex flex-col gap-6')}>
      <Card className="max-w-xl w-full mx-auto">
        <CardHeader className="text-center mb-7">
          <LogoIcon className="mb-3" />
          <CardTitle className="text-xl text-start">Confirm Email</CardTitle>
          <CardDescription
            className={cn('text-start', serverError && 'text-red-500')}
          >
            {serverError ?? `Enter the verification code sent to ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setResendMsg('');
                await executeAsync({ email, token });
              }}
            >
              <div className="grid gap-6">
                <div className="grid gap-2 place-items-center">
                  <InputOTP
                    disabled={isExecuting}
                    className="w-full"
                    autoFocus
                    onChange={setToken}
                    maxLength={8}
                    minLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                  >
                    <InputOTPGroup className="w-full grid grid-cols-8 gap-3">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <InputOTPSlot
                          key={i}
                          className="w-full h-10 rounded-xl first:rounded-xl last:rounded-xl border"
                          index={i}
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {validationErrors?.token?._errors?.[0] && (
                    <p className="text-xs text-red-500">
                      {validationErrors.token._errors[0]}
                    </p>
                  )}
                </div>
                {resendMsg && (
                  <p className="text-xs text-muted-foreground text-center">
                    {resendMsg}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isResending}
                    onClick={() => {
                      setResendMsg('');
                      executeResend({ email });
                    }}
                  >
                    {isResending ? 'Sending...' : 'Resend code'}
                  </Button>
                  <SubmitButton isLoading={isExecuting}>
                    Confirm email
                  </SubmitButton>
                </div>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmEmailForm;
