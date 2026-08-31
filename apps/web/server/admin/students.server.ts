'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const StudentSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    role: z.string(),
    full_name: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
    is_active: z.boolean().nullable().optional(),
    date_of_birth: z.string().nullable().optional(),
    created_at: z.coerce.string(),
    updated_at: z.coerce.string().optional(),
  })
  .passthrough();

export type StudentDetail = z.infer<typeof StudentSchema>;

const EnrollmentSchema = z
  .object({
    id: z.string(),
    student_id: z.string(),
    course_id: z.string(),
    status: z.string(),
    enrolled_at: z.string(),
    completed_at: z.string().nullable().optional(),
    courses: z
      .object({
        id: z.string(),
        title: z.string(),
        slug: z.string(),
        thumbnail_url: z.string().nullable().optional(),
        status: z.string(),
      })
      .nullable()
      .optional(),
    profiles: z.any().nullable().optional(),
  })
  .passthrough();

export type StudentEnrollment = z.infer<typeof EnrollmentSchema>;

const ProgressRecordSchema = z
  .object({
    id: z.string().optional(),
    lesson_id: z.string(),
    student_id: z.string().optional(),
    status: z.string(),
    progress_percent: z.number().nullable().optional(),
    last_position_seconds: z.number().nullable().optional(),
    completed_at: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    lessons: z
      .object({
        id: z.string(),
        title: z.string(),
        chapters: z.any().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

export type ProgressRecord = z.infer<typeof ProgressRecordSchema>;

const AttemptSchema = z
  .object({
    id: z.string(),
    student_id: z.string().optional(),
    started_at: z.string(),
    completed_at: z.string().nullable().optional(),
    score: z.number().nullable().optional(),
    max_score: z.number().nullable().optional(),
    time_spent_seconds: z.number().nullable().optional(),
    percentage: z.number().nullable().optional(),
    passed: z.boolean().nullable().optional(),
    student_name: z.string().nullable().optional(),
    student_email: z.string().nullable().optional(),
  })
  .passthrough();

export type Attempt = z.infer<typeof AttemptSchema>;

const AttemptDetailSchema = z
  .object({
    id: z.string(),
    student_id: z.string().optional(),
    assignment_id: z.string().optional(),
    test_id: z.string().optional(),
    started_at: z.string(),
    completed_at: z.string().nullable().optional(),
    score: z.number().nullable().optional(),
    max_score: z.number().nullable().optional(),
    time_spent_seconds: z.number().nullable().optional(),
    percentage: z.number().nullable().optional(),
    passed: z.boolean().nullable().optional(),
    student_name: z.string().nullable().optional(),
    student_email: z.string().nullable().optional(),
    questionReview: z
      .array(
        z
          .object({
            questionId: z.string(),
            questionText: z.string().optional(),
            questionType: z.string().optional(),
            topic: z.string().nullable().optional(),
            isCorrect: z.boolean().nullable().optional(),
            timeSpentSeconds: z.number().optional(),
            points: z.number().optional(),
            pointsEarned: z.number().optional(),
            explanation: z.string().nullable().optional(),
            correctOptionIds: z.array(z.string()).optional(),
            selectedOptionIds: z.array(z.string()).optional(),
            textAnswer: z.string().nullable().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

export type AttemptDetail = z.infer<typeof AttemptDetailSchema>;

async function headers() {
  const session = await auth();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.user?.tokens.access_token}`,
  };
}

export async function getStudentDetail(id: string): Promise<StudentDetail | null> {
  const h = await headers();
  const [error, data] = await safeFetch(
    z.object({ data: StudentSchema }).passthrough(),
    `/users/${id}`,
    { headers: h, cache: 'no-store' },
  );
  if (error) return null;
  return data!.data;
}

export async function getStudentEnrollments(studentId: string): Promise<StudentEnrollment[]> {
  const h = await headers();
  const [error, data] = await safeFetch(
    z.object({ data: z.array(EnrollmentSchema), meta: z.any() }).passthrough(),
    `/enrollments?studentId=${studentId}&limit=100`,
    { headers: h, cache: 'no-store' },
  );
  if (error) return [];
  return data!.data;
}

export async function getStudentProgress(studentId: string): Promise<ProgressRecord[]> {
  const h = await headers();
  const [error, data] = await safeFetch(
    z.array(ProgressRecordSchema),
    `/progress/student/${studentId}`,
    { headers: h, cache: 'no-store' },
  );
  if (error) return [];
  return data!;
}

export async function toggleStudentActive(userId: string, isActive: boolean) {
  const h = await headers();
  const [error] = await safeFetch(z.any(), `/users/${userId}/toggle-active`, {
    method: 'PATCH',
    headers: h,
    cache: 'no-store',
    body: JSON.stringify({ is_active: isActive }),
  });
  if (error) return { error };
  return { success: true };
}

export async function getAttemptDetail(
  attemptId: string,
  type: 'assignment' | 'test',
): Promise<AttemptDetail | null> {
  const h = await headers();
  const prefix = type === 'assignment' ? 'assignments' : 'tests';
  const [error, data] = await safeFetch(
    z.object({ data: AttemptDetailSchema }).passthrough(),
    `/${prefix}/attempts/${attemptId}`,
    { headers: h, cache: 'no-store' },
  );
  if (error) return null;
  return data!.data;
}

export async function gradeAttemptAnswers(
  attemptId: string,
  type: 'assignment' | 'test',
  grades: { questionId: string; isCorrect: boolean }[],
) {
  const h = await headers();
  const prefix = type === 'assignment' ? 'assignments' : 'tests';
  const [error, data] = await safeFetch(
    z.any(),
    `/${prefix}/attempts/${attemptId}/grade`,
    {
      method: 'PATCH',
      headers: h,
      cache: 'no-store',
      body: JSON.stringify({ grades }),
    },
  );
  if (error) return { error };
  return { data };
}

export async function updateEnrollmentStatus(enrollmentId: string, status: string) {
  const h = await headers();
  const [error] = await safeFetch(z.any(), `/enrollments/${enrollmentId}`, {
    method: 'PATCH',
    headers: h,
    cache: 'no-store',
    body: JSON.stringify({ status }),
  });
  if (error) return { error };
  return { success: true };
}
