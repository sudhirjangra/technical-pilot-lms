import { getAllQueries } from '@/server/student-queries.server';
import { AdminQueriesClient } from '@/components/admin/queries-client';

export default async function AdminQueriesPage() {
  const queries = await getAllQueries();
  return <AdminQueriesClient queries={queries} />;
}
