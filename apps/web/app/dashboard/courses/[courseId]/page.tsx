import { auth } from '@/auth';
import { getCourseProgress, getCourseLeaderboard } from '@/server/student/courses.server';
import { CourseProgressClient } from '@/components/dashboard/course-progress-client';
import { redirect } from 'next/navigation';

export default async function CourseProgressPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user) redirect('/auth/sign-in');

  const [progress, leaderboardData] = await Promise.all([
    getCourseProgress(courseId),
    getCourseLeaderboard(courseId),
  ]);

  return (
    <CourseProgressClient
      courseId={courseId}
      progress={progress}
      initialLeaderboard={leaderboardData}
    />
  );
}
