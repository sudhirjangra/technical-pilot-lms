import { getUsers } from '@/server/admin/users.server';
import { StudentsClient } from '@/components/admin/students-client';
import { requireAdminPermission } from '@/server/admin/permissions.server';

export default async function AdminStudentsPage() {
  await requireAdminPermission('students:read');
  const users = await getUsers();
  return <StudentsClient users={users} />;
}
