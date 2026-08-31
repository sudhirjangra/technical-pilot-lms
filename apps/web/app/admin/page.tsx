import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getOverview } from '@/server/admin/analytics.server';
import { AdminDashboardClient } from '@/components/admin/admin-dashboard-client';

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session) redirect('/auth/sign-in');
  const overview = await getOverview();
  return <AdminDashboardClient overview={overview} />;
}
