import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import {
  getCourseAnalytics,
  getCourseStudents,
} from '@/server/admin/analytics.server';
import { CourseAnalyticsClient } from '@/components/admin/course-analytics-client';

export default async function CourseAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/auth/sign-in');

  const { id } = await params;
  const [analytics, students] = await Promise.all([
    getCourseAnalytics(id),
    getCourseStudents(id),
  ]);

  return (
    <CourseAnalyticsClient
      courseId={id}
      analytics={analytics}
      students={students}
    />
  );
}
