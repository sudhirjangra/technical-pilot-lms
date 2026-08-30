'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const QuestionOptionSchema = z
  .object({
    id: z.string(),
    question_id: z.string().nullable().optional(),
    option_text: z.string(),
    is_correct: z.boolean().default(false),
    sort_order: z.coerce.number().default(0),
  })
  .passthrough();

const QuestionSchema = z
  .object({
    id: z.string(),
    test_id: z.string().nullable().optional(),
    assignment_id: z.string().nullable().optional(),
    question_text: z.string(),
    question_type: z.enum(['mcq', 'msq', 'text']).catch('mcq'),
    question_number: z.coerce.number().nullable().optional(),
    correct_text_answer: z.string().nullable().optional(),
    points: z.coerce.number().default(1),
    explanation: z.string().nullable().optional(),
    topic: z.string().nullable().optional(),
    sort_order: z.coerce.number().default(0),
  })
  .passthrough();

const QuestionWithOptionsSchema = QuestionSchema.extend({
  question_options: z
    .array(QuestionOptionSchema)
    .nullish()
    .transform((options) => options ?? []),
}).passthrough();

const TestSchema = z.object({
  id: z.string(),
  lesson_id: z.string().nullable().optional(),
  title: z.string(),
  time_limit_seconds: z.coerce.number().nullable().optional(),
  passing_score_percent: z.coerce.number().nullable().optional(),
  max_attempts: z.coerce.number().nullable().optional(),
}).passthrough();

const TestDetailSchema = TestSchema.extend({
  questions: z
    .array(QuestionWithOptionsSchema)
    .nullish()
    .transform((questions) => questions ?? []),
}).passthrough();

const MessageSchema = z
  .object({
    message: z.string().optional(),
  })
  .passthrough();

const TestResponseSchema = z
  .object({
    message: z.string().optional(),
    data: TestSchema,
  })
  .passthrough();

const TestDetailResponseSchema = z
  .object({
    message: z.string().optional(),
    data: TestDetailSchema,
  })
  .passthrough();

const QuestionResponseSchema = z
  .object({
    message: z.string().optional(),
    data: QuestionWithOptionsSchema,
  })
  .passthrough();

const QuestionImportResponseSchema = z
  .object({
    message: z.string().optional(),
    data: z
      .object({
        count: z.coerce.number().default(0),
        questions: z
          .array(QuestionWithOptionsSchema)
          .nullish()
          .transform((questions) => questions ?? []),
      })
      .passthrough(),
  })
  .passthrough();

export type Test = z.infer<typeof TestSchema>;
export type TestDetail = z.infer<typeof TestDetailSchema>;
export type TestQuestion = z.infer<typeof QuestionSchema>;
export type TestQuestionOption = z.infer<typeof QuestionOptionSchema>;
export type TestQuestionWithOptions = z.infer<typeof QuestionWithOptionsSchema>;
export type TestQuestionType = TestQuestion['question_type'];

async function authHeaders(includeContentType = true) {
  const session = await auth();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session?.user.tokens.access_token}`,
  };
  if (includeContentType) headers['Content-Type'] = 'application/json';
  return headers;
}

function buildFileUploadForm(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
}

export async function getTestForLesson(lessonId: string): Promise<TestDetail | null> {
  const [error, data] = await safeFetch(
    TestDetailResponseSchema,
    `/tests/lesson/${lessonId}`,
    { headers: await authHeaders(), cache: 'no-store' },
  );
  if (error) {
    console.error('tests.server fetch failed:', error);
    return null;
  }
  return data!.data;
}

export async function createTest(payload: {
  lesson_id: string;
  title: string;
  time_limit_seconds?: number;
  passing_score_percent?: number;
  max_attempts?: number;
}) {
  const [error, data] = await safeFetch(TestResponseSchema, '/tests', {
    method: 'POST',
    headers: await authHeaders(),
    cache: 'no-store',
    body: JSON.stringify(payload),
  });
  if (error) {
    console.error('tests.server request failed:', error);
    return { error };
  }
  return { data: data!.data };
}

export async function updateTest(
  id: string,
  payload: {
    title?: string;
    time_limit_seconds?: number;
    passing_score_percent?: number;
    max_attempts?: number;
  },
) {
  const [error, data] = await safeFetch(TestResponseSchema, `/tests/${id}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    cache: 'no-store',
    body: JSON.stringify(payload),
  });
  if (error) {
    console.error('tests.server request failed:', error);
    return { error };
  }
  return { data: data!.data };
}

export async function deleteTest(id: string) {
  const [error] = await safeFetch(MessageSchema, `/tests/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(false),
    cache: 'no-store',
  });
  if (error) {
    console.error('tests.server request failed:', error);
    return { error };
  }
  return { success: true };
}

export async function createTestQuestion(
  id: string,
  payload: {
    question_text: string;
    question_type: TestQuestionType;
    question_number?: number;
    correct_text_answer?: string | null;
    points?: number;
    explanation?: string;
    topic?: string;
    sort_order?: number;
    options?: { option_text: string; is_correct: boolean }[];
  },
) {
  const [error, data] = await safeFetch(QuestionResponseSchema, `/tests/${id}/questions`, {
    method: 'POST',
    headers: await authHeaders(),
    cache: 'no-store',
    body: JSON.stringify(payload),
  });
  if (error) {
    console.error('tests.server request failed:', error);
    return { error };
  }
  return { data: data!.data };
}

export async function updateTestQuestion(
  questionId: string,
  payload: {
    question_text?: string;
    question_type?: TestQuestionType;
    question_number?: number;
    correct_text_answer?: string | null;
    points?: number;
    explanation?: string;
    topic?: string;
    sort_order?: number;
    options?: { option_text: string; is_correct: boolean }[];
  },
) {
  const [error, data] = await safeFetch(
    QuestionResponseSchema,
    `/tests/questions/${questionId}`,
    {
      method: 'PATCH',
      headers: await authHeaders(),
      cache: 'no-store',
      body: JSON.stringify(payload),
    },
  );
  if (error) {
    console.error('tests.server request failed:', error);
    return { error };
  }
  return { data: data!.data };
}

export async function deleteTestQuestion(questionId: string) {
  const [error] = await safeFetch(MessageSchema, `/tests/questions/${questionId}`, {
    method: 'DELETE',
    headers: await authHeaders(false),
    cache: 'no-store',
  });
  if (error) {
    console.error('tests.server request failed:', error);
    return { error };
  }
  return { success: true };
}

export async function reorderTestQuestions(
  id: string,
  questions: { id: string; sort_order: number }[],
) {
  const [error] = await safeFetch(MessageSchema, `/tests/${id}/questions/reorder`, {
    method: 'PATCH',
    headers: await authHeaders(),
    cache: 'no-store',
    body: JSON.stringify({ questions }),
  });
  if (error) {
    console.error('tests.server request failed:', error);
    return { error };
  }
  return { success: true };
}

export async function importTestQuestions(id: string, file: File) {
  const [error, data] = await safeFetch(
    QuestionImportResponseSchema,
    `/tests/${id}/import`,
    {
      method: 'POST',
      headers: await authHeaders(false),
      cache: 'no-store',
      body: buildFileUploadForm(file),
    },
  );
  if (error) {
    console.error('tests.server request failed:', error);
    return { error };
  }
  return { data: data!.data };
}

export async function gradeTestAttempt(
  attemptId: string,
  grades: { questionId: string; isCorrect: boolean }[],
) {
  const [error, data] = await safeFetch(
    z.object({ message: z.string().optional(), data: z.any() }),
    `/tests/attempts/${attemptId}/grade`,
    {
      method: 'PATCH',
      headers: await authHeaders(),
      cache: 'no-store',
      body: JSON.stringify({ grades }),
    },
  );
  if (error) return { error };
  return { data };
}

const AttemptDetailSchema = z.object({
  message: z.string().optional(),
  data: z.object({
    id: z.string(),
    test_id: z.string(),
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
    questionReview: z.array(z.object({
      questionId: z.string(),
      questionText: z.string().default(''),
      questionType: z.enum(['mcq', 'msq', 'text']).catch('mcq'),
      topic: z.string().nullable().optional(),
      isCorrect: z.boolean().nullable(),
      timeSpentSeconds: z.coerce.number().default(0),
      points: z.coerce.number().default(1),
      explanation: z.string().nullable().optional(),
      correctOptionIds: z.array(z.string()).default([]),
      selectedOptionIds: z.array(z.string()).default([]),
      textAnswer: z.string().nullable().optional(),
    })).default([]),
  }),
}).passthrough();

export type AdminAttemptDetail = z.infer<typeof AttemptDetailSchema>['data'];

export async function getAdminTestAttemptDetail(attemptId: string): Promise<AdminAttemptDetail | null> {
  const [error, data] = await safeFetch(AttemptDetailSchema, `/tests/attempts/${attemptId}`, {
    headers: await authHeaders(false),
    cache: 'no-store',
  });
  if (error) return null;
  return data!.data;
}
