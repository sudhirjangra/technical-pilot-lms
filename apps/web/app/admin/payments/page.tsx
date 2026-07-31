import { getPayments } from '@/server/admin/payments.server';
import { PaymentsClient } from '@/components/admin/payments-client';

export default async function AdminPaymentsPage() {
  const payments = await getPayments();
  return <PaymentsClient payments={payments} />;
}
