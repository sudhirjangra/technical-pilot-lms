import { auth } from '@/auth';
import { AccessRevokedView } from '@/components/dashboard/access-revoked-view';
import { CourseToc } from '@/components/dashboard/course-toc';
import { getCourseProgress, getMyEnrollments } from '@/server/student/courses.server';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

// Progress must always reflect the latest lesson/assessment state in the sidebar.
export const dynamic = 'force-dynamic';

export default async function CourseLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/auth/sign-in');

  const { courseId } = await params;

  // Check student's enrollment status for this course
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

  const progress = await getCourseProgress(courseId);
  if (!progress && enrollment?.status === 'expired') {
    return (
      <AccessRevokedView
        courseTitle={enrollment?.courses?.title}
        courseSlug={enrollment?.courses?.slug}
      />
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <CourseToc courseId={courseId} progress={progress} />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

