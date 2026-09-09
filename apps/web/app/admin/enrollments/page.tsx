import { getAdminCourses } from '@/server/admin/courses.server';
import { getUsers } from '@/server/admin/users.server';
import { EnrollmentsClient } from '@/components/admin/enrollments-client';
import { requireAdminPermission } from '@/server/admin/permissions.server';

export default async function AdminEnrollmentsPage() {
  await requireAdminPermission('enrollments:read', 'enrollments:write');
  const [courses, users] = await Promise.all([getAdminCourses(), getUsers()]);
  const students = users.filter((user) => user.role === 'student');

  return <EnrollmentsClient courses={courses} students={students} />;
}
