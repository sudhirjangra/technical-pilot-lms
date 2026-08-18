import { auth } from '@/auth';
import ResetPasswordForm from '@/components/auth/form/reset-password.form';

export default async function ResetPasswordPage() {
  const session = await auth();
  return <ResetPasswordForm session={session} />;
}
