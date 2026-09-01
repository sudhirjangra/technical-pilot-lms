'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

async function authHeaders() {
  const session = await auth();
  return {
    Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    'Content-Type': 'application/json',
  };
}

// ── Overview / Dashboard ───────────────────────────────────────────

const overviewSchema = z.object({
  totalStudents: z.number(),
  totalCourses: z.number(),
  publishedCourses: z.number(),
  totalEnrollments: z.number(),
  activeEnrollments: z.number(),
  completedEnrollments: z.number(),
  totalRevenue: z.number(),
  recentEnrollments: z.array(
    z.object({
      id: z.string(),
      studentName: z.string(),
      studentEmail: z.string(),
      courseTitle: z.string(),
      enrolledAt: z.string(),
      status: z.string(),
    }),
  ),
  enrollmentsByMonth: z.array(
    z.object({ month: z.string(), count: z.number() }),
  ),
  signupsByMonth: z.array(
    z.object({ month: z.string(), count: z.number() }),
  ).default([]),
  enrollmentTrend: z.array(
    z.object({ month: z.string(), enrollments: z.number(), signups: z.number() }),
  ).default([]),
  courseCompletionStats: z.array(
    z.object({
      courseId: z.string(),
      title: z.string(),
      enrolled: z.number(),
      completed: z.number(),
      avgProgress: z.number(),
    }),
  ),
});

export type OverviewData = z.infer<typeof overviewSchema>;

export async function getOverview() {
  const headers = await authHeaders();
  const [error, data] = await safeFetch(overviewSchema, '/analytics/overview', {
    headers,
  });
  if (error) return null;
  return data;
}

// ── Course analytics ───────────────────────────────────────────────

const courseAnalyticsSchema = z
  .object({
    course: z.any(),
    totalEnrolled: z.number(),
    activeStudents: z.number(),
    completedStudents: z.number(),
    chapters: z.array(z.any()).default([]),
    studentRankings: z.array(z.any()).default([]),
    enrollmentTimeline: z
      .array(z.object({ month: z.string(), count: z.number() }))
      .default([]),
  })
  .passthrough();

const courseStudentsSchema = z.array(
  z
    .object({
      id: z.string(),
      fullName: z.string().nullable(),
      email: z.string().nullable(),
      enrolledAt: z.string(),
      status: z.string(),
      overallProgress: z.number(),
      lessonsCompleted: z.number(),
      totalLessons: z.number(),
      lastActivity: z.string().nullable(),
    })
    .passthrough(),
);

export type CourseAnalyticsData = z.infer<typeof courseAnalyticsSchema>;
export type CourseStudent = z.infer<typeof courseStudentsSchema>[number];

export async function getCourseAnalytics(courseId: string) {
  const headers = await authHeaders();
  const [error, data] = await safeFetch(
    courseAnalyticsSchema,
    `/analytics/courses/${courseId}`,
    { headers },
  );
  if (error) return null;
  return data;
}

export async function getCourseStudents(courseId: string) {
  const headers = await authHeaders();
  const [error, data] = await safeFetch(
    courseStudentsSchema,
    `/analytics/courses/${courseId}/students`,
    { headers },
  );
  if (error) return null;
  return data;
}

// ── Student analytics ──────────────────────────────────────────────

const studentAnalyticsSchema = z
  .object({
    profile: z.any(),
    devices: z
      .array(
        z
          .object({
            id: z.string(),
            device_name: z.string(),
            platform: z.string(),
            last_active_at: z.string(),
            created_at: z.string(),
          })
          .passthrough(),
      )
      .default([]),
    enrollments: z.array(z.any()).default([]),
    recentActivity: z.array(z.any()).default([]),
    summary: z
      .object({
        totalCoursesEnrolled: z.number().default(0),
        completedCourses: z.number().default(0),
        totalLessonsCompleted: z.number().default(0),
        totalTestAttempts: z.number().default(0),
        totalAssignmentAttempts: z.number().default(0),
        totalTimeOnTestsSeconds: z.number().default(0),
        totalTimeOnAssignmentsSeconds: z.number().default(0),
      })
      .default({} as any),
  })
  .passthrough();

const studentAttemptsSchema = z.array(
  z
    .object({
      id: z.string(),
      type: z.string(),
      title: z.string().nullable(),
      lessonTitle: z.string().nullable().optional(),
      startedAt: z.string(),
      completedAt: z.string().nullable(),
      score: z.number().nullable(),
      maxScore: z.number().nullable(),
      percentage: z.number().nullable(),
      passed: z.boolean().nullable(),
      timeSpentSeconds: z.number().nullable(),
    })
    .passthrough(),
);

export type StudentAnalytics = z.infer<typeof studentAnalyticsSchema>;
export type StudentAttempt = z.infer<typeof studentAttemptsSchema>[number];

export async function getStudentAnalytics(studentId: string) {
  const headers = await authHeaders();
  const [error, data] = await safeFetch(
    studentAnalyticsSchema,
    `/analytics/students/${studentId}`,
    { headers },
  );
  if (error) return null;
  return data;
}

export async function getStudentAttempts(studentId: string) {
  const headers = await authHeaders();
  const [error, data] = await safeFetch(
    studentAttemptsSchema,
    `/analytics/students/${studentId}/attempts`,
    { headers },
  );
  if (error) return null;
  return data;
}
