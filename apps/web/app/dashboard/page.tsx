import { auth } from '@/auth';
import { getMyEnrollments, getPublishedCourses } from '@/server/student/courses.server';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/sign-in');

  const [enrollments, allCourses] = await Promise.all([
    getMyEnrollments(),
    getPublishedCourses(),
  ]);

  const enrolledCourseIds = new Set(enrollments.map((e) => e.course_id));
  const availableCourses = allCourses.filter((c) => !enrolledCourseIds.has(c.id));

  return (
    <DashboardClient
      enrollments={enrollments}
      availableCourses={availableCourses}
      user={{
        email: session.user.email,
        full_name: session.user.full_name,
        role: session.user.role,
      }}
    />
  );
}
