'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const EnrollmentSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  course_id: z.string(),
  enrolled_at: z.string(),
  status: z.enum(['active', 'completed', 'expired']),
  completed_at: z.string().nullable(),
  courses: z.object({ id: z.string(), title: z.string(), slug: z.string(), thumbnail_url: z.string().nullable(), status: z.string() }).nullable(),
  profiles: z.object({ id: z.string(), full_name: z.string().nullable(), email: z.string(), avatar_url: z.string().nullable() }).nullable(),
});

const EnrollmentsResponseSchema = z.object({
  data: z.array(EnrollmentSchema),
});

export type Enrollment = z.infer<typeof EnrollmentSchema>;

export async function getCourseEnrollments(courseId: string): Promise<Enrollment[]> {
  const session = await auth();
  const [error, data] = await safeFetch(EnrollmentsResponseSchema, `/enrollments/course/${courseId}`, {
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
    cache: 'no-store',
  });
  if (error) return [];
  return data.data;
}

export async function createEnrollment(studentId: string, courseId: string) {
  const session = await auth();
  const [error, data] = await safeFetch(z.any(), '/enrollments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
    cache: 'no-store',
    body: JSON.stringify({ student_id: studentId, course_id: courseId }),
  });
  if (error) return { error };
  return { data };
}
