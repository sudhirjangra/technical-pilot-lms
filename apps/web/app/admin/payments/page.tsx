import { getPayments } from '@/server/admin/payments.server';
import { PaymentsClient } from '@/components/admin/payments-client';
import { requireAdminPermission } from '@/server/admin/permissions.server';

export default async function AdminPaymentsPage() {
  await requireAdminPermission('payments:read');
  const payments = await getPayments();
  return <PaymentsClient payments={payments} />;
}
