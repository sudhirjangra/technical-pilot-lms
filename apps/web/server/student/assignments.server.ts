'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const StudentQuestionOptionSchema = z.object({
  id: z.string(),
  question_id: z.string(),
  option_text: z.string(),
  sort_order: z.coerce.number().default(0),
});

const StudentQuestionSchema = z.object({
  id: z.string(),
  assignment_id: z.string().nullable().optional(),
  question_text: z.string(),
  question_type: z.enum(['mcq', 'msq', 'text']).catch('mcq'),
  question_number: z.coerce.number().nullable().optional(),
  points: z.coerce.number().default(1),
  explanation: z.string().nullable().optional(),
  sort_order: z.coerce.number().default(0),
  topic: z.string().nullable().optional(),
  question_options: z.array(StudentQuestionOptionSchema).default([]),
});

const StudentAssignmentSchema = z.object({
  id: z.string(),
  lesson_id: z.string().nullable().optional(),
  title: z.string(),
  instructions: z.string().nullable().optional(),
  time_limit_seconds: z.coerce.number().nullable().optional(),
  passing_score_percent: z.coerce.number().nullable().optional(),
  max_attempts: z.coerce.number().nullable().optional(),
  questions: z.array(StudentQuestionSchema).default([]),
});

const AttemptSchema = z.object({
  id: z.string(),
  assignment_id: z.string(),
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

const AssignmentForLessonResponseSchema = z.object({
  message: z.string().optional(),
  data: z.object({
    assignment: StudentAssignmentSchema,
    attempt: AttemptSchema.nullable(),
    attempts_used: z.coerce.number().default(0),
    attempts: z.array(AttemptSummarySchema).default([]),
  }),
});

const StartAttemptResponseSchema = z.object({
  message: z.string().optional(),
  data: AttemptSchema,
});

const QuestionReviewOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  isCorrect: z.boolean(),
  isSelected: z.boolean().optional(),
});

const QuestionReviewSchema = z.object({
  questionId: z.string(),
  isCorrect: z.boolean().nullable(),
  pointsEarned: z.coerce.number(),
  points: z.coerce.number(),
  explanation: z.string().nullable().optional(),
  correctOptionIds: z.array(z.string()).default([]),
  selectedOptionIds: z.array(z.string()).default([]),
  correctOptionTexts: z.array(z.string()).optional().default([]),
  selectedOptionTexts: z.array(z.string()).optional().default([]),
  options: z.array(QuestionReviewOptionSchema).optional().default([]),
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

export type StudentAssignment = z.infer<typeof StudentAssignmentSchema>;
export type AssignmentAttempt = z.infer<typeof AttemptSchema>;
export type AssignmentAttemptSummary = z.infer<typeof AttemptSummarySchema>;
export type AssignmentTopicBreakdown = z.infer<typeof TopicBreakdownSchema>;
export type AssignmentQuestionReview = z.infer<typeof QuestionReviewSchema>;
export type AssignmentSubmitResult = z.infer<typeof SubmitResultSchema>['data'];

export type AssignmentAnswerPayload = {
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string;
  timeSpentSeconds: number;
};

async function authHeaders(includeContentType = true) {
  const session = await auth();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session?.user.tokens.access_token}`,
  };
  if (includeContentType) headers['Content-Type'] = 'application/json';
  return headers;
}

export async function getAssignmentForLesson(
  lessonId: string,
): Promise<{ data: z.infer<typeof AssignmentForLessonResponseSchema>['data'] } | { error: string }> {
  const [error, data] = await safeFetch(
    AssignmentForLessonResponseSchema,
    `/assignments/student/lesson/${lessonId}`,
    { headers: await authHeaders(false), cache: 'no-store' },
  );
  if (error) return { error };
  return { data: data!.data };
}

export async function startAssignmentAttempt(
  assignmentId: string,
): Promise<{ data: AssignmentAttempt } | { error: string }> {
  const [error, data] = await safeFetch(
    StartAttemptResponseSchema,
    `/assignments/student/${assignmentId}/attempts`,
    { method: 'POST', headers: await authHeaders(), cache: 'no-store', body: JSON.stringify({}) },
  );
  if (error) return { error };
  return { data: data!.data };
}

export async function submitAssignmentAttempt(
  attemptId: string,
  answers: AssignmentAnswerPayload[],
): Promise<{ data: AssignmentSubmitResult } | { error: string }> {
  const [error, data] = await safeFetch(
    SubmitResultSchema,
    `/assignments/student/attempts/${attemptId}/submit`,
    { method: 'POST', headers: await authHeaders(), cache: 'no-store', body: JSON.stringify({ answers }) },
  );
  if (error) return { error };
  return { data: data!.data };
}

export async function saveAssignmentAnswer(
  attemptId: string,
  questionId: string,
  payload: { selectedOptionIds?: string[]; textAnswer?: string; timeSpentSeconds: number },
): Promise<void> {
  const headers = await authHeaders();
  safeFetch(
    z.object({ message: z.string().optional() }),
    `/assignments/student/attempts/${attemptId}/answers/${questionId}`,
    { method: 'PATCH', headers, cache: 'no-store', body: JSON.stringify(payload) },
  ).catch(() => {});
}

const AttemptDetailResponseSchema = z.object({
  message: z.string().optional(),
  data: z.object({
    id: z.string(),
    assignment_id: z.string().nullable().optional(),
    test_id: z.string().nullable().optional(),
    student_id: z.string().nullable().optional(),
    started_at: z.string().nullable().optional(),
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
  }).passthrough(),
}).passthrough();

export async function getStudentAssignmentAttemptDetail(
  attemptId: string,
): Promise<{ data: AssignmentSubmitResult } | { error: string }> {
  const [error, data] = await safeFetch(
    AttemptDetailResponseSchema,
    `/assignments/student/attempts/${attemptId}`,
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
  type: z.literal('assignment'),
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

export type MyAssignmentAttempt = z.infer<typeof MyAttemptSchema>;

export async function getMyAssignmentAttempts(): Promise<MyAssignmentAttempt[]> {
  const [error, data] = await safeFetch(
    z.object({ data: z.array(MyAttemptSchema).default([]) }),
    '/assignments/student/my-attempts',
    { headers: await authHeaders(false), cache: 'no-store' },
  );
  if (error) return [];
  return data!.data;
}
