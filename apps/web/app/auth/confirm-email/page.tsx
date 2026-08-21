import ConfirmEmailForm from '@/components/auth/form/confirm-email.form';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = '' } = await searchParams;
  return <ConfirmEmailForm email={email} />;
}
