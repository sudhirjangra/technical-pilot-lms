import { getAdminSlots } from '@/server/doubt-sessions.server';
import { getAdminCourses } from '@/server/admin/courses.server';
import { getUsers } from '@/server/admin/users.server';
import { DoubtSlotsClient } from '@/components/admin/doubt-slots-client';

export const metadata = {
  title: 'Doubt Sessions & Clearances — Admin',
};

export default async function AdminDoubtSessionsPage() {
  const [slots, courses, users] = await Promise.all([
    getAdminSlots(),
    getAdminCourses(),
    getUsers(),
  ]);

  const students = users.filter((u) => u.role === 'student');

  return <DoubtSlotsClient slots={slots} courses={courses} students={students} />;
}
