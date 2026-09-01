'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

// ── Schemas ──────────────────────────────────────────────────────────────────

const StudentQuestionOptionSchema = z.object({
  id: z.string(),
  question_id: z.string(),
  option_text: z.string(),
  sort_order: z.coerce.number().default(0),
});

const StudentQuestionSchema = z.object({
  id: z.string(),
  test_id: z.string().nullable().optional(),
  question_text: z.string(),
  question_type: z.enum(['mcq', 'msq', 'text']).catch('mcq'),
  question_number: z.coerce.number().nullable().optional(),
  points: z.coerce.number().default(1),
  explanation: z.string().nullable().optional(),
  sort_order: z.coerce.number().default(0),
  topic: z.string().nullable().optional(),
  question_options: z.array(StudentQuestionOptionSchema).default([]),
});

const StudentTestSchema = z.object({
  id: z.string(),
  lesson_id: z.string().nullable().optional(),
  title: z.string(),
  time_limit_seconds: z.coerce.number().nullable().optional(),
  passing_score_percent: z.coerce.number().nullable().optional(),
  max_attempts: z.coerce.number().nullable().optional(),
  questions: z.array(StudentQuestionSchema).default([]),
});

const AttemptSchema = z.object({
  id: z.string(),
  test_id: z.string(),
  student_id: z.string(),
  started_at: z.string(),
  completed_at: z.string().nullable().optional(),
  score: z.coerce.number().nullable().optional(),
  max_score: z.coerce.number().nullable().optional(),
  time_spent_seconds: z.coerce.number().nullable().optional(),
});

const AttemptSummarySchema = z.object({
  id: z.string(),
  started_at: z.string(),
  completed_at: z.string().nullable().optional(),
  score: z.coerce.number().nullable().optional(),
  max_score: z.coerce.number().nullable().optional(),
  percentage: z.coerce.number().nullable().optional(),
  passed: z.boolean().nullable().optional(),
  time_spent_seconds: z.coerce.number().nullable().optional(),
});

const TestForLessonResponseSchema = z.object({
  message: z.string().optional(),
  data: z.object({
    test: StudentTestSchema,
    attempt: AttemptSchema.nullable(),
    attempts_used: z.coerce.number().default(0),
    attempts: z.array(AttemptSummarySchema).default([]),
  }),
});

const StartAttemptResponseSchema = z.object({
  message: z.string().optional(),
  data: AttemptSchema,
});

const QuestionReviewSchema = z.object({
  questionId: z.string(),
  isCorrect: z.boolean().nullable(),
  pointsEarned: z.coerce.number(),
  points: z.coerce.number(),
  explanation: z.string().nullable().optional(),
  correctOptionIds: z.array(z.string()).default([]),
  selectedOptionIds: z.array(z.string()).default([]),
  textAnswer: z.string().nullable().optional(),
  topic: z.string().nullable().optional(),
  timeSpentSeconds: z.coerce.number().default(0),
  questionType: z.enum(['mcq', 'msq', 'text']).catch('mcq'),
  questionText: z.string().default(''),
});

const TopicBreakdownSchema = z.object({
  topic: z.string(),
  total: z.coerce.number(),
  correct: z.coerce.number(),
  totalTime: z.coerce.number(),
  points: z.coerce.number(),
  earnedPoints: z.coerce.number(),
});

const SubmitResultSchema = z.object({
  message: z.string().optional(),
  data: z.object({
    score: z.coerce.number(),
    maxScore: z.coerce.number(),
    passed: z.boolean(),
    percentage: z.coerce.number(),
    correctCount: z.coerce.number(),
    totalCount: z.coerce.number(),
    questionReview: z.array(QuestionReviewSchema).default([]),
    totalTimeSeconds: z.coerce.number().default(0),
    topicBreakdown: z.array(TopicBreakdownSchema).default([]),
    avgTimePerQuestion: z.coerce.number().default(0),
  }),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type StudentTest = z.infer<typeof StudentTestSchema>;
export type StudentQuestion = z.infer<typeof StudentQuestionSchema>;
export type StudentQuestionOption = z.infer<typeof StudentQuestionOptionSchema>;
export type TestAttempt = z.infer<typeof AttemptSchema>;
export type AttemptSummary = z.infer<typeof AttemptSummarySchema>;
export type TopicBreakdown = z.infer<typeof TopicBreakdownSchema>;
export type TestForLesson = {
  test: StudentTest;
  attempt: TestAttempt | null;
  attempts_used: number;
  attempts: AttemptSummary[];
};
export type SubmitResult = z.infer<typeof SubmitResultSchema>['data'];
export type QuestionReview = z.infer<typeof QuestionReviewSchema>;

export type AnswerPayload = {
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string;
  timeSpentSeconds: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function authHeaders(includeContentType = true) {
  const session = await auth();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session?.user.tokens.access_token}`,
  };
  if (includeContentType) headers['Content-Type'] = 'application/json';
  return headers;
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function getTestForLesson(
  lessonId: string,
): Promise<{ data: z.infer<typeof TestForLessonResponseSchema>['data'] } | { error: string }> {
  const [error, data] = await safeFetch(
    TestForLessonResponseSchema,
    `/tests/student/lesson/${lessonId}`,
    { headers: await authHeaders(false), cache: 'no-store' },
  );
  if (error) return { error };
  return { data: data!.data };
}

export async function startTestAttempt(
  testId: string,
): Promise<{ data: TestAttempt } | { error: string }> {
  const [error, data] = await safeFetch(
    StartAttemptResponseSchema,
    `/tests/student/${testId}/attempts`,
    {
      method: 'POST',
      headers: await authHeaders(),
      cache: 'no-store',
      body: JSON.stringify({}),
    },
  );
  if (error) return { error };
  return { data: data!.data };
}

export async function submitTestAttempt(
  attemptId: string,
  answers: AnswerPayload[],
): Promise<{ data: SubmitResult } | { error: string }> {
  const [error, data] = await safeFetch(
    SubmitResultSchema,
    `/tests/student/attempts/${attemptId}/submit`,
    {
      method: 'POST',
      headers: await authHeaders(),
      cache: 'no-store',
      body: JSON.stringify({ answers }),
    },
  );
  if (error) return { error };
  return { data: data!.data };
}

export async function saveAnswer(
  attemptId: string,
  questionId: string,
  payload: {
    selectedOptionIds?: string[];
    textAnswer?: string;
    timeSpentSeconds: number;
  },
): Promise<void> {
  // Fire-and-forget: errors are intentionally swallowed
  const headers = await authHeaders();
  safeFetch(
    z.object({ message: z.string().optional() }),
    `/tests/student/attempts/${attemptId}/answers/${questionId}`,
    {
      method: 'PATCH',
      headers,
      cache: 'no-store',
      body: JSON.stringify(payload),
    },
  ).catch(() => {});
}

const AttemptDetailResponseSchema = z.object({
  message: z.string().optional(),
  data: z.object({
    id: z.string(),
    test_id: z.string(),
    student_id: z.string(),
    started_at: z.string(),
    completed_at: z.string().nullable().optional(),
    score: z.coerce.number().nullable().optional(),
    max_score: z.coerce.number().nullable().optional(),
    time_spent_seconds: z.coerce.number().nullable().optional(),
    percentage: z.coerce.number().nullable().optional(),
    passed: z.boolean().nullable().optional(),
    questionReview: z.array(QuestionReviewSchema).default([]),
    topicBreakdown: z.array(TopicBreakdownSchema).default([]),
    avgTimePerQuestion: z.coerce.number().default(0),
    totalTimeSeconds: z.coerce.number().default(0),
    totalCount: z.coerce.number().default(0),
    correctCount: z.coerce.number().default(0),
  }),
}).passthrough();

export async function getStudentAttemptDetail(
  attemptId: string,
): Promise<{ data: SubmitResult } | { error: string }> {
  const [error, data] = await safeFetch(
    AttemptDetailResponseSchema,
    `/tests/student/attempts/${attemptId}`,
    { headers: await authHeaders(false), cache: 'no-store' },
  );
  if (error) return { error };
  const attempt = data!.data;
  const maxScore = attempt.max_score ?? 0;
  const score = attempt.score ?? 0;
  return {
    data: {
      score,
      maxScore,
      passed: attempt.passed ?? false,
      percentage: attempt.percentage ?? (maxScore > 0 ? (score / maxScore) * 100 : 0),
      correctCount: attempt.correctCount,
      totalCount: attempt.totalCount,
      questionReview: attempt.questionReview,
      totalTimeSeconds: attempt.totalTimeSeconds,
      topicBreakdown: attempt.topicBreakdown,
      avgTimePerQuestion: attempt.avgTimePerQuestion,
    },
  };
}

const MyAttemptSchema = z.object({
  id: z.string(),
  type: z.literal('test'),
  testTitle: z.string(),
  lessonId: z.string().nullable().optional(),
  courseId: z.string().nullable().optional(),
  courseTitle: z.string(),
  started_at: z.string(),
  completed_at: z.string().nullable().optional(),
  score: z.coerce.number().nullable().optional(),
  max_score: z.coerce.number().nullable().optional(),
  time_spent_seconds: z.coerce.number().nullable().optional(),
  percentage: z.coerce.number().nullable().optional(),
  passed: z.boolean().nullable().optional(),
});

export type MyTestAttempt = z.infer<typeof MyAttemptSchema>;

export async function getMyTestAttempts(): Promise<MyTestAttempt[]> {
  const [error, data] = await safeFetch(
    z.object({ data: z.array(MyAttemptSchema).default([]) }),
    '/tests/student/my-attempts',
    { headers: await authHeaders(false), cache: 'no-store' },
  );
  if (error) return [];
  return data!.data;
}
