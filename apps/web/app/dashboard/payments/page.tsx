import { auth } from '@/auth';
import { getMyPayments } from '@/server/student/payments.server';
import { StudentPaymentsClient } from '@/components/dashboard/student-payments-client';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payment History | Technical Pilot',
  description: 'View your course purchase and payment history.',
};

export default async function StudentPaymentsPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/sign-in');

  const payments = await getMyPayments();

  return (
    <StudentPaymentsClient
      initialPayments={payments}
      user={{
        email: session.user.email,
        full_name: session.user.full_name,
      }}
    />
  );
}
