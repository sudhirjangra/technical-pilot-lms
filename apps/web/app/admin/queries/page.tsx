import { getAllQueries } from '@/server/student-queries.server';
import { AdminQueriesClient } from '@/components/admin/queries-client';
import { requireAdminPermission } from '@/server/admin/permissions.server';

export default async function AdminQueriesPage() {
  await requireAdminPermission('queries:read', 'queries:reply');
  const queries = await getAllQueries();
  return <AdminQueriesClient queries={queries} />;
}
