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

const AssignmentSchema = z.object({
  id: z.string(),
  lesson_id: z.string(),
  title: z.string(),
  instructions: z.string().nullable().optional(),
  due_days_after_enrollment: z.number().nullable().optional(),
  max_score: z.number().nullable().optional(),
  time_limit_seconds: z.number().nullable().optional(),
  passing_score_percent: z.number().nullable().optional(),
  max_attempts: z.number().nullable().optional(),
}).passthrough();

const AssignmentDetailSchema = AssignmentSchema.extend({
  questions: z.array(QuestionWithOptionsSchema),
}).passthrough();

const MessageSchema = z.object({
  message: z.string().optional(),
});

const AssignmentResponseSchema = z.object({
  message: z.string().optional(),
  data: AssignmentSchema,
});

const AssignmentDetailResponseSchema = z.object({
  message: z.string().optional(),
  data: AssignmentDetailSchema,
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

export type Assignment = z.infer<typeof AssignmentSchema>;
export type AssignmentDetail = z.infer<typeof AssignmentDetailSchema>;
export type AssignmentQuestion = z.infer<typeof QuestionSchema>;
export type AssignmentQuestionOption = z.infer<typeof QuestionOptionSchema>;
export type AssignmentQuestionWithOptions = z.infer<typeof QuestionWithOptionsSchema>;
export type AssignmentQuestionType = AssignmentQuestion['question_type'];

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

export async function getAssignmentForLesson(
  lessonId: string,
): Promise<AssignmentDetail | null> {
  const [error, data] = await safeFetch(
    AssignmentDetailResponseSchema,
    `/assignments/lesson/${lessonId}`,
    { headers: await authHeaders(), cache: 'no-store' },
  );
  if (error) return null;
  return data!.data;
}

export async function createAssignment(payload: {
  lesson_id: string;
  title: string;
  instructions?: string;
  due_days_after_enrollment?: number;
  max_score?: number;
  time_limit_seconds?: number;
  passing_score_percent?: number;
  max_attempts?: number;
}) {
  const [error, data] = await safeFetch(AssignmentResponseSchema, '/assignments', {
    method: 'POST',
    headers: await authHeaders(),
    cache: 'no-store',
    body: JSON.stringify(payload),
  });
  if (error) return { error };
  return { data: data!.data };
}

export async function updateAssignment(
  id: string,
  payload: {
    title?: string;
    instructions?: string;
    due_days_after_enrollment?: number;
    max_score?: number;
    time_limit_seconds?: number;
    passing_score_percent?: number;
    max_attempts?: number;
  },
) {
  const [error, data] = await safeFetch(AssignmentResponseSchema, `/assignments/${id}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    cache: 'no-store',
    body: JSON.stringify(payload),
  });
  if (error) return { error };
  return { data: data!.data };
}

export async function deleteAssignment(id: string) {
  const [error] = await safeFetch(MessageSchema, `/assignments/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(false),
    cache: 'no-store',
  });
  if (error) return { error };
  return { success: true };
}

export async function createAssignmentQuestion(
  id: string,
  payload: {
    question_text: string;
    question_type: AssignmentQuestionType;
    points?: number;
    explanation?: string;
    sort_order?: number;
    options?: { option_text: string; is_correct: boolean }[];
  },
) {
  const [error, data] = await safeFetch(
    QuestionResponseSchema,
    `/assignments/${id}/questions`,
    {
      method: 'POST',
      headers: await authHeaders(),
      cache: 'no-store',
      body: JSON.stringify(payload),
    },
  );
  if (error) return { error };
  return { data: data!.data };
}

export async function updateAssignmentQuestion(
  questionId: string,
  payload: {
    question_text?: string;
    question_type?: AssignmentQuestionType;
    points?: number;
    explanation?: string;
    sort_order?: number;
    options?: { option_text: string; is_correct: boolean }[];
  },
) {
  const [error, data] = await safeFetch(
    QuestionResponseSchema,
    `/assignments/questions/${questionId}`,
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

export async function deleteAssignmentQuestion(questionId: string) {
  const [error] = await safeFetch(MessageSchema, `/assignments/questions/${questionId}`, {
    method: 'DELETE',
    headers: await authHeaders(false),
    cache: 'no-store',
  });
  if (error) return { error };
  return { success: true };
}

export async function reorderAssignmentQuestions(
  id: string,
  questions: { id: string; sort_order: number }[],
) {
  const [error] = await safeFetch(
    MessageSchema,
    `/assignments/${id}/questions/reorder`,
    {
      method: 'PATCH',
      headers: await authHeaders(),
      cache: 'no-store',
      body: JSON.stringify({ questions }),
    },
  );
  if (error) return { error };
  return { success: true };
}

export async function importAssignmentQuestions(id: string, file: File) {
  const [error, data] = await safeFetch(
    QuestionImportResponseSchema,
    `/assignments/${id}/import`,
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
