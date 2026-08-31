import { auth } from '@/auth';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { CourseBrowseClient } from '@/components/courses/browse-client';
import { getMyEnrollments, getPublishedCourses } from '@/server/student/courses.server';

export default async function CoursesPage() {
  const session = await auth();

  if (session?.user) {
    const enrollments = await getMyEnrollments();
    return <DashboardClient enrollments={enrollments} user={session.user} />;
  }

  const courses = await getPublishedCourses();
  return <CourseBrowseClient courses={courses} />;
}
