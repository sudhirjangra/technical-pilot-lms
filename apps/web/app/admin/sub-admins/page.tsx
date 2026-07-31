import { getSubAdmins, getAvailablePermissions } from '@/server/admin/permissions.server';
import { getUsers } from '@/server/admin/users.server';
import { SubAdminsClient } from '@/components/admin/sub-admins-client';

export default async function AdminSubAdminsPage() {
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
