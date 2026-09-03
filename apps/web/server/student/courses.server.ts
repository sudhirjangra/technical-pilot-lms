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

const PublicCategorySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable().optional(),
    thumbnail_url: z.string().nullable().optional(),
    sort_order: z.coerce.number().nullable().optional(),
  })
  .passthrough();

export type PublicCategory = z.infer<typeof PublicCategorySchema>;

export async function getPublicCategories(): Promise<PublicCategory[]> {
  const [error, data] = await safeFetch(
    z.object({ data: z.array(PublicCategorySchema) }).passthrough(),
    '/categories',
    { cache: 'no-store' },
  );
  if (error) return [];
  return [...data!.data].sort(
    (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0),
  );
}

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

const LessonProgressRecordSchema = z
  .object({
    status: z.string().nullable().optional(),
    progress_percent: z.coerce.number().nullable().optional(),
    last_position_seconds: z.coerce.number().nullable().optional(),
    completed_at: z.string().nullable().optional(),
  })
  .passthrough();

const AssessmentStateSchema = z
  .object({
    kind: z.string().nullable().optional(),
    assessment_id: z.string().nullable().optional(),
    attempts_used: z.coerce.number().nullable().optional(),
    max_attempts: z.coerce.number().nullable().optional(),
    passed: z.boolean().nullable().optional(),
    exhausted: z.boolean().nullable().optional(),
    failed: z.boolean().nullable().optional(),
  })
  .passthrough();

const ProgressLessonSchema = z
  .object({
    id: z.string(),
    title: z.string().nullable().optional(),
    sort_order: z.coerce.number().nullable().optional(),
    lesson_type: z.string().nullable().optional(),
    due_at: z.string().nullable().optional(),
    assessment: AssessmentStateSchema.nullable().optional(),
    progress: LessonProgressRecordSchema.nullable().optional(),
  })
  .passthrough();

const ProgressChapterSchema = z
  .object({
    id: z.string(),
    title: z.string().nullable().optional(),
    sort_order: z.coerce.number().nullable().optional(),
    started_at: z.string().nullable().optional(),
    lessons: z.array(ProgressLessonSchema).nullable().optional(),
  })
  .passthrough();

const ProgressSchema = z
  .object({
    chapters: z.array(ProgressChapterSchema).nullable().optional(),
    overall_percent: z.coerce.number().nullable().optional(),
    overall_status: z.string().nullable().optional(),
  })
  .passthrough();

export type StudentAssessmentState = {
  assessment_id: string | null;
  attempts_used: number;
  max_attempts: number | null;
  passed: boolean;
  exhausted: boolean;
  failed: boolean;
};

export type StudentLessonProgress = {
  id: string;
  title: string;
  sort_order: number;
  lesson_type: string;
  due_at: string | null;
  assessment: StudentAssessmentState | null;
  progress: {
    status: string;
    progress_percent: number;
    last_position_seconds: number;
    completed_at: string | null;
  } | null;
};

export type StudentChapterProgress = {
  id: string;
  title: string;
  sort_order: number;
  started_at: string | null;
  lessons: StudentLessonProgress[];
};

export type StudentCourseProgress = {
  chapters: StudentChapterProgress[];
  overall_percent: number;
  overall_status: 'not_started' | 'in_progress' | 'completed';
};

const toOverallStatus = (
  value: string | null | undefined,
): StudentCourseProgress['overall_status'] =>
  value === 'completed' || value === 'in_progress' ? value : 'not_started';

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

const PaymentOrderSchema = z.object({
  payment_id: z.string(),
  razorpay_order_id: z.string(),
  razorpay_key_id: z.string(),
  amount: z.coerce.number(),
  currency: z.string(),
  course_title: z.string(),
});

export type PaymentOrder = z.infer<typeof PaymentOrderSchema>;

export async function createPaymentOrder(
  courseId: string,
): Promise<{ error?: string; order?: PaymentOrder }> {
  const session = await auth();
  if (!session?.user) return { error: 'Not authenticated' };

  const [error, data] = await safeFetch(
    PaymentOrderSchema,
    '/payments/order',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.user.tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ course_id: courseId }),
      cache: 'no-store',
    },
  );
  if (error) return { error: typeof error === 'string' ? error : 'Unable to start payment' };
  return { order: data! };
}

export async function verifyPayment(payment: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Not authenticated' };

  const [error] = await safeFetch(
    z.object({ message: z.string() }).passthrough(),
    '/payments/verify',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.user.tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payment),
      cache: 'no-store',
    },
  );
  return error ? { error: typeof error === 'string' ? error : 'Payment verification failed' } : {};
}

export async function getCourseProgress(
  courseId: string,
): Promise<StudentCourseProgress | null> {
  const session = await auth();
  if (!session?.user) return null;
  const [error, data] = await safeFetch(
    ProgressSchema,
    `/progress/course/${courseId}`,
    { headers: { Authorization: `Bearer ${session.user.tokens.access_token}` }, cache: 'no-store' },
  );
  if (error) {
    console.error('getCourseProgress failed:', error);
    return null;
  }

  // Defensive client-side ordering: student order must never diverge from admin order.
  const chapters: StudentChapterProgress[] = (data!.chapters ?? [])
    .map((chapter) => ({
      id: chapter.id,
      title: chapter.title ?? 'Untitled chapter',
      sort_order: chapter.sort_order ?? 0,
      started_at: chapter.started_at ?? null,
      lessons: (chapter.lessons ?? [])
        .map((lesson) => ({
          id: lesson.id,
          title: lesson.title ?? 'Untitled lesson',
          sort_order: lesson.sort_order ?? 0,
          lesson_type: lesson.lesson_type ?? 'video',
          due_at: lesson.due_at ?? null,
          assessment: lesson.assessment
            ? {
                assessment_id: lesson.assessment.assessment_id ?? null,
                attempts_used: lesson.assessment.attempts_used ?? 0,
                max_attempts: lesson.assessment.max_attempts ?? null,
                passed: lesson.assessment.passed ?? false,
                exhausted: lesson.assessment.exhausted ?? false,
                failed: lesson.assessment.failed ?? false,
              }
            : null,
          progress: lesson.progress
            ? {
                status: lesson.progress.status ?? 'not_started',
                progress_percent: lesson.progress.progress_percent ?? 0,
                last_position_seconds: lesson.progress.last_position_seconds ?? 0,
                completed_at: lesson.progress.completed_at ?? null,
              }
            : null,
        }))
        .sort((left, right) => left.sort_order - right.sort_order),
    }))
    .sort((left, right) => left.sort_order - right.sort_order);

  return {
    chapters,
    overall_percent: data!.overall_percent ?? 0,
    overall_status: toOverallStatus(data!.overall_status),
  };
}
