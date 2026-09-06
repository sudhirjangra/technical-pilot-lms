import { auth } from '@/auth';
import { getSubAdmins, getAvailablePermissions } from '@/server/admin/permissions.server';
import { getUsers } from '@/server/admin/users.server';
import { SubAdminsClient } from '@/components/admin/sub-admins-client';
import { redirect } from 'next/navigation';

export default async function AdminSubAdminsPage() {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    redirect('/admin');
  }
  const [subAdmins, allPermissions, allUsers] = await Promise.all([
    getSubAdmins(),
    getAvailablePermissions(),
    getUsers(),
  ]);

  const students = allUsers.filter((u) => u.role === 'student');

  return (
    <SubAdminsClient
      subAdmins={subAdmins}
      allPermissions={allPermissions}
      students={students}
    />
  );
}
