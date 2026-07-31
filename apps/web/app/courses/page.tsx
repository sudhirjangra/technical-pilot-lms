import { getPublishedCourses } from '@/server/student/courses.server';
import { CourseBrowseClient } from '@/components/courses/browse-client';

export default async function CoursesPage() {
  const courses = await getPublishedCourses();
  return <CourseBrowseClient courses={courses} />;
}
