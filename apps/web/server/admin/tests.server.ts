'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const QuestionOptionSchema = z.object({
  id: z.string(),
  question_id: z.string(),
  option_text: z.string(),
  is_correct: z.boolean(),
  sort_order: z.number(),
}).passthrough();

const QuestionSchema = z.object({
  id: z.string(),
  test_id: z.string().nullable(),
  assignment_id: z.string().nullable(),
  question_text: z.string(),
  question_type: z.enum(['mcq', 'msq', 'text']),
  points: z.number(),
  explanation: z.string().nullable(),
  sort_order: z.number(),
}).passthrough();

const QuestionWithOptionsSchema = QuestionSchema.extend({
  question_options: z.array(QuestionOptionSchema),
}).passthrough();

const TestSchema = z.object({
  id: z.string(),
  lesson_id: z.string(),
  title: z.string(),
  time_limit_seconds: z.number().nullable().optional(),
  passing_score_percent: z.number().nullable().optional(),
  max_attempts: z.number().nullable().optional(),
}).passthrough();

const TestDetailSchema = TestSchema.extend({
  questions: z.array(QuestionWithOptionsSchema),
}).passthrough();

const MessageSchema = z.object({
  message: z.string().optional(),
});

const TestResponseSchema = z.object({
  message: z.string().optional(),
  data: TestSchema,
});

const TestDetailResponseSchema = z.object({
  message: z.string().optional(),
  data: TestDetailSchema,
});

const QuestionResponseSchema = z.object({
  message: z.string().optional(),
  data: QuestionWithOptionsSchema,
});

const QuestionImportResponseSchema = z.object({
  message: z.string().optional(),
  data: z.object({
    count: z.number(),
    questions: z.array(QuestionWithOptionsSchema),
  }),
});

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
  if (error) return null;
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
  if (error) return { error };
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
  if (error) return { error };
  return { data: data!.data };
}

export async function deleteTest(id: string) {
  const [error] = await safeFetch(MessageSchema, `/tests/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(false),
    cache: 'no-store',
  });
  if (error) return { error };
  return { success: true };
}

export async function createTestQuestion(
  id: string,
  payload: {
    question_text: string;
    question_type: TestQuestionType;
    points?: number;
    explanation?: string;
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
  if (error) return { error };
  return { data: data!.data };
}

export async function updateTestQuestion(
  questionId: string,
  payload: {
    question_text?: string;
    question_type?: TestQuestionType;
    points?: number;
    explanation?: string;
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
  if (error) return { error };
  return { data: data!.data };
}

export async function deleteTestQuestion(questionId: string) {
  const [error] = await safeFetch(MessageSchema, `/tests/questions/${questionId}`, {
    method: 'DELETE',
    headers: await authHeaders(false),
    cache: 'no-store',
  });
  if (error) return { error };
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
  if (error) return { error };
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
  if (error) return { error };
  return { data: data!.data };
}
