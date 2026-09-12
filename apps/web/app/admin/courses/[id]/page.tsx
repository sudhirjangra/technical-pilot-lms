import { getCourseById } from '@/server/admin/course-detail.server';
import { getChapters } from '@/server/admin/chapters.server';
import { getCourseEnrollments } from '@/server/admin/enrollments.server';
import { getVideoLessonsForCourse } from '@/server/admin/videos.server';
import { CourseDetailClient } from '@/components/admin/course-detail-client';
import { requireAdminPermission } from '@/server/admin/permissions.server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPermission('courses:read', 'courses:write');
  const { id } = await params;
  const [course, chapters, enrollments, videoLessons] = await Promise.all([
    getCourseById(id),
    getChapters(id),
    getCourseEnrollments(id),
    getVideoLessonsForCourse(id),
  ]);

  if (!course) return notFound();

  return <CourseDetailClient course={course} chapters={chapters} enrollments={enrollments} videoLessons={videoLessons} />;
}
