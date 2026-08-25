import CompleteProfileForm from '@/components/auth/form/complete-profile.form';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Complete Profile | Technical Pilot LMS',
  description: 'Complete your profile to continue',
};

export default async function CompleteProfilePage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/sign-in');

  const user = session.user;
  const isProfileComplete = user.full_name && user.date_of_birth && user.phone;

  if (isProfileComplete) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <CompleteProfileForm initialData={{
        full_name: user.full_name ?? '',
        date_of_birth: user.date_of_birth ?? '',
        phone: user.phone ?? '',
      }} />
    </div>
  );
}