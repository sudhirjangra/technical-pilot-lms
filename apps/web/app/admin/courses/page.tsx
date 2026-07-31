import { getAdminCourses } from '@/server/admin/courses.server';
import { getCategories } from '@/server/admin/categories.server';
import { CoursesClient } from '@/components/admin/courses-client';

export default async function AdminCoursesPage() {
  const [courses, categories] = await Promise.all([
    getAdminCourses(),
    getCategories(),
  ]);

  return <CoursesClient courses={courses} categories={categories} />;
}
