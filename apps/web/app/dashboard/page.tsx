import { auth } from '@/auth';
import { getMyEnrollments, getPublishedCourses, getCourseProgress } from '@/server/student/courses.server';
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

  const activeEnrollments = enrollments.filter((e) => e.status === 'active');
  const progressResults = await Promise.all(
    activeEnrollments.slice(0, 5).map(async (e) => {
      const progress = await getCourseProgress(e.course_id);
      return { courseId: e.course_id, progress };
    }),
  );

  const upcomingDue: { courseTitle: string; lessonTitle: string; dueAt: string; courseId: string }[] = [];
  for (const { courseId, progress } of progressResults) {
    if (!progress) continue;
    const enrollment = activeEnrollments.find((e) => e.course_id === courseId);
    const courseTitle = enrollment?.courses?.title ?? 'Course';
    for (const chapter of progress.chapters) {
      for (const lesson of chapter.lessons) {
        if (lesson.due_at && lesson.progress?.status !== 'completed') {
          const dueDate = new Date(lesson.due_at);
          const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000);
          if (daysLeft <= 7) {
            upcomingDue.push({
              courseTitle,
              lessonTitle: lesson.title,
              dueAt: lesson.due_at,
              courseId,
            });
          }
        }
      }
    }
  }

  upcomingDue.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  return (
    <DashboardClient
      enrollments={enrollments}
      availableCourses={availableCourses}
      upcomingDue={upcomingDue}
      user={{
        email: session.user.email,
        full_name: session.user.full_name,
        role: session.user.role,
      }}
    />
  );
}
