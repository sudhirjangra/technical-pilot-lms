import SignInForm from '@/components/auth/form/sign-in.form';
import { Suspense } from 'react';

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
