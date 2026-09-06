import { auth } from '@/auth';
import { AccessRevokedView } from '@/components/dashboard/access-revoked-view';
import { CourseProgressClient } from '@/components/dashboard/course-progress-client';
import {
  getCourseLeaderboard,
  getCourseProgress,
  getMyEnrollments,
} from '@/server/student/courses.server';
import { redirect } from 'next/navigation';

export default async function CourseProgressPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user) redirect('/auth/sign-in');

  const enrollments = await getMyEnrollments();
  const enrollment = enrollments.find((e) => e.course_id === courseId);

  if (enrollment && enrollment.status === 'expired') {
    return (
      <AccessRevokedView
        courseTitle={enrollment.courses?.title}
        courseSlug={enrollment.courses?.slug}
      />
    );
  }

  const [progress, leaderboardData] = await Promise.all([
    getCourseProgress(courseId),
    getCourseLeaderboard(courseId),
  ]);

  if (!progress && enrollment?.status === 'expired') {
    return (
      <AccessRevokedView
        courseTitle={enrollment?.courses?.title}
        courseSlug={enrollment?.courses?.slug}
      />
    );
  }

  return (
    <CourseProgressClient
      courseId={courseId}
      progress={progress}
      initialLeaderboard={leaderboardData}
    />
  );
}

