import {
  getStudentDetail,
  getStudentEnrollments,
  getStudentProgress,
} from '@/server/admin/students.server';
import { getStudentCourseProgress } from '@/server/admin/enrollments.server';
import {
  getStudentAnalytics,
  getStudentAttempts,
} from '@/server/admin/analytics.server';
import { StudentDetailClient } from '@/components/admin/student-detail-client';
import { notFound } from 'next/navigation';

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [student, enrollments, progress, analytics, attempts] =
    await Promise.all([
      getStudentDetail(id),
      getStudentEnrollments(id),
      getStudentProgress(id),
      getStudentAnalytics(id),
      getStudentAttempts(id),
    ]);

  const courseProgress = await Promise.all(
    enrollments.map(async (enrollment) => ({
      courseId: enrollment.course_id,
      course: enrollment.courses?.title ?? enrollment.course_id,
      progress: await getStudentCourseProgress(enrollment.course_id, id),
    })),
  );

  if (!student) return notFound();

  return (
    <StudentDetailClient
      student={student}
      enrollments={enrollments}
      progress={progress}
      courseProgress={courseProgress}
      analytics={analytics}
      attempts={attempts}
    />
  );
}
