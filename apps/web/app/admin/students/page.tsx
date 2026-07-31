import { getUsers } from '@/server/admin/users.server';
import { StudentsClient } from '@/components/admin/students-client';

export default async function AdminStudentsPage() {
  const users = await getUsers();
  return <StudentsClient users={users} />;
}
