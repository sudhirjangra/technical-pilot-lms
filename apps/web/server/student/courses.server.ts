'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const CourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  price: z.coerce.number(),
  discount_price: z.coerce.number().nullable(),
  status: z.string(),
  categories: z.object({ id: z.string(), name: z.string(), slug: z.string() }).nullable(),
});

const PublicCoursesSchema = z.object({ data: z.array(CourseSchema) });

export type PublicCourse = z.infer<typeof CourseSchema>;

export async function getPublishedCourses(): Promise<PublicCourse[]> {
  const [error, data] = await safeFetch(PublicCoursesSchema, '/courses', { cache: 'no-store' });
  if (error) return [];
  return data!.data;
}

export async function getCourseBySlug(slug: string) {
  const [error, data] = await safeFetch(
    z.object({ data: CourseSchema }),
    `/courses/slug/${slug}`,
    { cache: 'no-store' },
  );
  if (error) return null;
  return data!.data;
}

const EnrollmentSchema = z.object({
  id: z.string(),
  course_id: z.string(),
  status: z.string(),
  enrolled_at: z.string(),
  courses: z.object({
    id: z.string(), title: z.string(), slug: z.string(),
    thumbnail_url: z.string().nullable(), status: z.string(),
  }).nullable(),
});

export type StudentEnrollment = z.infer<typeof EnrollmentSchema>;

export async function getMyEnrollments(): Promise<StudentEnrollment[]> {
  const session = await auth();
  if (!session?.user) return [];
  const [error, data] = await safeFetch(
    z.array(EnrollmentSchema),
    '/enrollments/my',
    { headers: { Authorization: `Bearer ${session.user.tokens.access_token}` }, cache: 'no-store' },
  );
  if (error) return [];
  return data!;
}

export async function checkEnrollment(courseId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  const [error, data] = await safeFetch(
    z.object({ enrolled: z.boolean() }),
    `/enrollments/check/${courseId}`,
    { headers: { Authorization: `Bearer ${session.user.tokens.access_token}` }, cache: 'no-store' },
  );
  if (error) return false;
  return data!.enrolled;
}

const ProgressSchema = z.object({
  chapters: z.array(z.any()),
  overall_percent: z.number(),
});

export async function enrollFreeCourse(courseId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Not authenticated' };
  const [error] = await safeFetch(
    z.any(),
    `/enrollments/free/${courseId}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.user.tokens.access_token}` },
      cache: 'no-store',
    },
  );
  if (error) return { error: typeof error === 'string' ? error : 'Enrollment failed' };
  return {};
}

export async function getCourseProgress(courseId: string) {
  const session = await auth();
  if (!session?.user) return null;
  const [error, data] = await safeFetch(
    ProgressSchema,
    `/progress/course/${courseId}`,
    { headers: { Authorization: `Bearer ${session.user.tokens.access_token}` }, cache: 'no-store' },
  );
  if (error) return null;
  return data;
}
