'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const EnrollmentSchema = z
  .object({
    id: z.string(),
    student_id: z.string(),
    course_id: z.string(),
    enrolled_at: z.string(),
    status: z.string(),
    completed_at: z.string().nullable().optional(),
    courses: z
      .object({
        id: z.string(),
        title: z.string().optional(),
        slug: z.string().optional(),
        thumbnail_url: z.string().nullable().optional(),
        status: z.string().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    profiles: z
      .object({
        id: z.string(),
        full_name: z.string().nullable().optional(),
        email: z.string().optional(),
        avatar_url: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

const EnrollmentsMetaSchema = z
  .object({
    total: z.coerce.number().optional(),
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
  })
  .passthrough();

const EnrollmentsResponseSchema = z
  .object({
    data: z.array(EnrollmentSchema),
    meta: EnrollmentsMetaSchema.nullable().optional(),
  })
  .passthrough();

export type Enrollment = z.infer<typeof EnrollmentSchema>;
export type EnrollmentsMeta = { total: number; page: number; limit: number };
export type EnrollmentsResult = { data: Enrollment[]; meta: EnrollmentsMeta };

export type EnrollmentsQuery = {
  courseId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
};

async function authHeaders(includeContentType = true) {
  const session = await auth();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session?.user?.tokens.access_token}`,
  };
  if (includeContentType) headers['Content-Type'] = 'application/json';
  return headers;
}

const buildMeta = (
  meta: z.infer<typeof EnrollmentsMetaSchema> | null | undefined,
  fallbackTotal: number,
  page: number,
  limit: number,
): EnrollmentsMeta => ({
  total: meta?.total ?? fallbackTotal,
  page: meta?.page ?? page,
  limit: meta?.limit ?? limit,
});

export async function getEnrollments(
  query: EnrollmentsQuery = {},
): Promise<EnrollmentsResult> {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit = query.limit && query.limit > 0 ? query.limit : 20;

  const params = new URLSearchParams();
  if (query.courseId) params.set('courseId', query.courseId);
  if (query.status && query.status !== 'all') params.set('status', query.status);
  if (query.search?.trim()) params.set('search', query.search.trim());
  params.set('page', String(page));
  params.set('limit', String(limit));

  const [error, data] = await safeFetch(
    EnrollmentsResponseSchema,
    `/enrollments?${params.toString()}`,
    { headers: await authHeaders(false), cache: 'no-store' },
  );

  if (error) {
    console.error('getEnrollments failed:', error);
    return { data: [], meta: { total: 0, page, limit } };
  }

  return {
    data: data!.data,
    meta: buildMeta(data!.meta, data!.data.length, page, limit),
  };
}

export async function getCourseEnrollments(courseId: string): Promise<Enrollment[]> {
  const [error, data] = await safeFetch(
    EnrollmentsResponseSchema,
    `/enrollments/course/${courseId}`,
    { headers: await authHeaders(false), cache: 'no-store' },
  );
  if (error) {
    console.error('getCourseEnrollments failed:', error);
    return [];
  }
  return data!.data;
}

// PostgREST returns to-one embeds as an object and to-many as an array; normalise to an array.
const embeddedList = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => (value == null ? [] : Array.isArray(value) ? value : [value]),
    z.array(schema),
  );

const CourseProgressSchema = z
  .object({
    chapters: z.array(z.object({
      id: z.string(),
      title: z.string().nullable().optional(),
      sort_order: z.coerce.number().default(0),
      started_at: z.string().nullable().optional(),
      lessons: z.array(z.object({
        id: z.string(),
        title: z.string().nullable().optional(),
        sort_order: z.coerce.number().default(0),
        lesson_type: z.string().nullable().optional(),
        due_at: z.string().nullable().optional(),
        assignments: embeddedList(z.object({
          id: z.string(),
          title: z.string().nullable().optional(),
          due_days_after_start: z.coerce.number().nullable().optional(),
        }).passthrough()).default([]),
        tests: embeddedList(z.object({
          id: z.string(),
          title: z.string().nullable().optional(),
          passing_score_percent: z.coerce.number().nullable().optional(),
        }).passthrough()).default([]),
        progress: z.object({
          status: z.string().nullable().optional(),
          progress_percent: z.coerce.number().nullable().optional(),
        }).passthrough().nullable().optional(),
      }).passthrough()).default([]),
    }).passthrough()).default([]),
    overall_percent: z.coerce.number().default(0),
    overall_status: z.string().nullable().optional(),
  })
  .passthrough();

export type AdminCourseProgress = z.infer<typeof CourseProgressSchema>;

export async function getStudentCourseProgress(courseId: string, studentId: string) {
  const [error, data] = await safeFetch(
    CourseProgressSchema,
    `/progress/course/${courseId}/student/${studentId}`,
    { headers: await authHeaders(false), cache: 'no-store' },
  );
  if (error) {
    console.error('getStudentCourseProgress failed:', error);
    return null;
  }
  return data!;
}

const AssessmentAttemptSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  student_name: z.string().nullable().optional(),
  student_email: z.string().nullable().optional(),
  started_at: z.string(),
  completed_at: z.string().nullable().optional(),
  score: z.coerce.number().nullable().optional(),
  max_score: z.coerce.number().nullable().optional(),
  time_spent_seconds: z.coerce.number().nullable().optional(),
  percentage: z.coerce.number().nullable().optional(),
  passed: z.boolean().nullable().optional(),
}).passthrough();

export type AssessmentAttempt = z.infer<typeof AssessmentAttemptSchema>;

export async function getAssessmentAttempts(
  assessmentId: string,
  type: 'assignment' | 'test',
): Promise<AssessmentAttempt[]> {
  const [error, data] = await safeFetch(
    z.object({ data: z.array(AssessmentAttemptSchema) }).passthrough(),
    `/${type === 'assignment' ? 'assignments' : 'tests'}/${assessmentId}/attempts`,
    { headers: await authHeaders(false), cache: 'no-store' },
  );
  if (error) return [];
  return data!.data;
}

export async function createEnrollment(studentId: string, courseId: string) {
  const [error, data] = await safeFetch(
    z.object({ data: EnrollmentSchema.nullable().optional() }).passthrough(),
    '/enrollments',
    {
      method: 'POST',
      headers: await authHeaders(),
      cache: 'no-store',
      body: JSON.stringify({ student_id: studentId, course_id: courseId }),
    },
  );
  if (error) {
    console.error('createEnrollment failed:', error);
    return { error };
  }
  revalidatePath('/admin/enrollments');
  return { data: data?.data ?? null };
}
