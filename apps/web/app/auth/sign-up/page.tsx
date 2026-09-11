import SignUpForm from '@/components/auth/form/sign-up.form';
import { Suspense } from 'react';

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="w-full h-48 flex items-center justify-center">Loading...</div>}>
      <SignUpForm />
    </Suspense>
  );
}
