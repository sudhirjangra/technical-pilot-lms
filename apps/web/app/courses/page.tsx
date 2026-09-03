import { auth } from '@/auth';
import { CourseBrowseClient } from '@/components/courses/browse-client';
import {
  getPublicCategories,
  getPublishedCourses,
  getMyEnrollments,
} from '@/server/student/courses.server';

export default async function CoursesPage() {
  const [courses, categories, session] = await Promise.all([
    getPublishedCourses(),
    getPublicCategories(),
    auth(),
  ]);

  let enrolledCourseIds: string[] = [];
  if (session?.user) {
    const enrollments = await getMyEnrollments();
    enrolledCourseIds = enrollments.map((e) => e.course_id);
  }

  const available = courses.filter((c) => !enrolledCourseIds.includes(c.id));
  return <CourseBrowseClient courses={available} categories={categories} />;
}
