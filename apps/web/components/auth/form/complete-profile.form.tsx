'use client';

import LogoIcon from '@/components/logo-icon';
import { completeProfile } from '@/server/auth.server';
import { APP_NAME } from '@repo/constants/app';
import { uiConfig } from '@repo/config';

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
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useState } from 'react';

interface CompleteProfileFormProps {
  initialData: {
    full_name: string;
    date_of_birth: string;
    phone: string;
  };
}

const CompleteProfileForm = ({ initialData }: CompleteProfileFormProps) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    full_name: initialData.full_name,
    date_of_birth: initialData.date_of_birth,
    phone: initialData.phone,
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
  } = useAction(completeProfile, {
    onSuccess: () => {
      router.push('/dashboard');
      router.refresh();
    },
  });

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full">
      <Card className="w-full" style={{ maxWidth: uiConfig.signInCardMaxWidth }}>
        <CardHeader className="text-center pb-2 sm:pb-3">
          <div className="flex justify-center mb-3 sm:mb-4">
            <LogoIcon width={44} height={44} className="w-11 h-11 sm:w-12 sm:h-12" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription className={cn('text-sm sm:text-base', serverError ? 'text-destructive' : '')}>
            {serverError ?? `Welcome to ${APP_NAME}! Please provide the missing information to continue.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-3 sm:pt-4 px-4 sm:px-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              execute(formData);
            }}
          >
            <div className="grid gap-4 sm:gap-5">
              {!initialData.full_name && (
                <div className="grid gap-1.5 sm:gap-2">
                  <Label isRequired htmlFor="full_name" className="text-sm sm:text-base">
                    Full Name
                  </Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    type="text"
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                    disabled={isExecuting}
                    onChange={handleChange}
                    className="h-10 sm:h-11 text-sm sm:text-base"
                  />
                  {validationErrors?.full_name?._errors?.[0] && (
                    <p className="text-xs text-destructive">{validationErrors.full_name._errors[0]}</p>
                  )}
                </div>
              )}

              {!initialData.date_of_birth && (
                <div className="grid gap-1.5 sm:gap-2">
                  <Label isRequired htmlFor="date_of_birth" className="text-sm sm:text-base">
                    Date of Birth
                  </Label>
                  <Input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    max={new Date(Date.now() - 15 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    autoComplete="bday"
                    required
                    disabled={isExecuting}
                    onChange={handleChange}
                    className="h-10 sm:h-11 text-sm sm:text-base"
                  />
                  {validationErrors?.date_of_birth?._errors?.[0] && (
                    <p className="text-xs text-destructive">{validationErrors.date_of_birth._errors[0]}</p>
                  )}
                </div>
              )}

              {!initialData.phone && (
                <div className="grid gap-1.5 sm:gap-2">
                  <Label isRequired htmlFor="phone" className="text-sm sm:text-base">
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
                    className="h-10 sm:h-11 text-sm sm:text-base"
                  />
                  {validationErrors?.phone?._errors?.[0] && (
                    <p className="text-xs text-destructive">{validationErrors.phone._errors[0]}</p>
                  )}
                </div>
              )}

              <SubmitButton isLoading={isExecuting} name="Continue" className="h-10 sm:h-11 text-sm sm:text-base mt-1 sm:mt-2" />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfileForm;