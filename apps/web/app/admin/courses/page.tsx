import { getAdminCourses } from '@/server/admin/courses.server';
import { getCategories } from '@/server/admin/categories.server';
import { CoursesClient } from '@/components/admin/courses-client';
import { requireAdminPermission } from '@/server/admin/permissions.server';

export default async function AdminCoursesPage() {
  await requireAdminPermission('courses:read', 'courses:write');

  const [courses, categories] = await Promise.all([
    getAdminCourses(),
    getCategories(),
  ]);

  return <CoursesClient courses={courses} categories={categories} />;
}
