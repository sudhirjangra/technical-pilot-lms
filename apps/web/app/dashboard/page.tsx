import { auth } from '@/auth';
import { getMyEnrollments, getPublishedCourses, getCourseProgress } from '@/server/student/courses.server';
import { getMyPayments } from '@/server/student/payments.server';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { redirect } from 'next/navigation';

export interface PendingAssignmentItem {
  courseId: string;
  courseTitle: string;
  chapterTitle: string;
  lessonId: string;
  lessonTitle: string;
  dueAt: string | null;
  status: string;
  progressPercent: number;
  attemptsUsed: number;
  maxAttempts: number | null;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/sign-in');

  const [enrollments, allCourses, myPayments] = await Promise.all([
    getMyEnrollments(),
    getPublishedCourses(),
    getMyPayments(),
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
  const pendingAssignments: PendingAssignmentItem[] = [];

  for (const { courseId, progress } of progressResults) {
    if (!progress) continue;
    const enrollment = activeEnrollments.find((e) => e.course_id === courseId);
    const courseTitle = enrollment?.courses?.title ?? 'Course';

    for (const chapter of progress.chapters) {
      const chapterTitle = chapter.title ?? 'Chapter';
      for (const lesson of chapter.lessons) {
        // Pending assignment detection
        if (lesson.lesson_type === 'assignment' && lesson.progress?.status !== 'completed') {
          pendingAssignments.push({
            courseId,
            courseTitle,
            chapterTitle,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            dueAt: lesson.due_at ?? null,
            status: lesson.progress?.status ?? 'not_started',
            progressPercent: lesson.progress?.progress_percent ?? 0,
            attemptsUsed: lesson.assessment?.attempts_used ?? 0,
            maxAttempts: lesson.assessment?.max_attempts ?? null,
          });
        }

        // Upcoming due deadlines within 7 days
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

  // Sort pending assignments: deadlines first, then by title
  pendingAssignments.sort((a, b) => {
    if (a.dueAt && b.dueAt) {
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    }
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return a.lessonTitle.localeCompare(b.lessonTitle);
  });

  return (
    <DashboardClient
      enrollments={enrollments}
      availableCourses={availableCourses}
      upcomingDue={upcomingDue}
      pendingAssignments={pendingAssignments}
      recentPayments={myPayments.slice(0, 4)}
      user={{
        email: session.user.email,
        full_name: session.user.full_name,
        role: session.user.role,
      }}
    />
  );
}
