import { auth } from '@/auth';
import { CourseToc } from '@/components/dashboard/course-toc';
import { getCourseProgress } from '@/server/student/courses.server';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

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
  const progress = await getCourseProgress(courseId);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <CourseToc courseId={courseId} progress={progress} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
