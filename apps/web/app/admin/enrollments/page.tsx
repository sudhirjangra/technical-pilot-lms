import { getAdminCourses } from '@/server/admin/courses.server';
import { getUsers } from '@/server/admin/users.server';
import { EnrollmentsClient } from '@/components/admin/enrollments-client';

export default async function AdminEnrollmentsPage() {
  const [courses, users] = await Promise.all([getAdminCourses(), getUsers()]);
  const students = users.filter((user) => user.role === 'student');

  return <EnrollmentsClient courses={courses} students={students} />;
}
