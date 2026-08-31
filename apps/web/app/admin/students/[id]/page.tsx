import {
  getStudentDetail,
  getStudentEnrollments,
  getStudentProgress,
} from '@/server/admin/students.server';
import { StudentDetailClient } from '@/components/admin/student-detail-client';
import { notFound } from 'next/navigation';

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [student, enrollments, progress] = await Promise.all([
    getStudentDetail(id),
    getStudentEnrollments(id),
    getStudentProgress(id),
  ]);

  if (!student) return notFound();

  return (
    <StudentDetailClient
      student={student}
      enrollments={enrollments}
      progress={progress}
    />
  );
}
