import { getAdminSlots } from '@/server/doubt-sessions.server';
import { getAdminCourses } from '@/server/admin/courses.server';
import { getUsers } from '@/server/admin/users.server';
import { DoubtSlotsClient } from '@/components/admin/doubt-slots-client';
import { requireAdminPermission } from '@/server/admin/permissions.server';

export const metadata = {
  title: 'Doubt Sessions & Clearances — Admin',
};

export default async function AdminDoubtSessionsPage() {
  await requireAdminPermission('doubt_sessions:manage');
  const [slots, courses, users] = await Promise.all([
    getAdminSlots(),
    getAdminCourses(),
    getUsers(),
  ]);

  const students = users.filter((u) => u.role === 'student');

  return <DoubtSlotsClient slots={slots} courses={courses} students={students} />;
}
