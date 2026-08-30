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

const AssignmentSchema = z.object({
  id: z.string(),
  lesson_id: z.string().nullable().optional(),
  title: z.string(),
  instructions: z.string().nullable().optional(),
  due_days_after_start: z.coerce.number().nullable().optional(),
  max_score: z.coerce.number().nullable().optional(),
  time_limit_seconds: z.coerce.number().nullable().optional(),
  passing_score_percent: z.coerce.number().nullable().optional(),
  max_attempts: z.coerce.number().nullable().optional(),
}).passthrough();

const AssignmentDetailSchema = AssignmentSchema.extend({
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

const AssignmentResponseSchema = z
  .object({
    message: z.string().optional(),
    data: AssignmentSchema,
  })
  .passthrough();

const AssignmentDetailResponseSchema = z
  .object({
    message: z.string().optional(),
    data: AssignmentDetailSchema,
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
  if (error) {
    console.error('assignments.server fetch failed:', error);
    return null;
  }
  return data!.data;
}

export async function createAssignment(payload: {
  lesson_id: string;
  title: string;
  instructions?: string;
  due_days_after_start?: number;
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
  if (error) {
    console.error('assignments.server request failed:', error);
    return { error };
  }
  return { data: data!.data };
}

export async function updateAssignment(
  id: string,
  payload: {
    title?: string;
    instructions?: string;
    due_days_after_start?: number;
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
  if (error) {
    console.error('assignments.server request failed:', error);
    return { error };
  }
  return { data: data!.data };
}

export async function deleteAssignment(id: string) {
  const [error] = await safeFetch(MessageSchema, `/assignments/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(false),
    cache: 'no-store',
  });
  if (error) {
    console.error('assignments.server request failed:', error);
    return { error };
  }
  return { success: true };
}

export async function createAssignmentQuestion(
  id: string,
  payload: {
    question_text: string;
    question_type: AssignmentQuestionType;
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
    `/assignments/${id}/questions`,
    {
      method: 'POST',
      headers: await authHeaders(),
      cache: 'no-store',
      body: JSON.stringify(payload),
    },
  );
  if (error) {
    console.error('assignments.server request failed:', error);
    return { error };
  }
  return { data: data!.data };
}

export async function updateAssignmentQuestion(
  questionId: string,
  payload: {
    question_text?: string;
    question_type?: AssignmentQuestionType;
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
    `/assignments/questions/${questionId}`,
    {
      method: 'PATCH',
      headers: await authHeaders(),
      cache: 'no-store',
      body: JSON.stringify(payload),
    },
  );
  if (error) {
    console.error('assignments.server request failed:', error);
    return { error };
  }
  return { data: data!.data };
}

export async function deleteAssignmentQuestion(questionId: string) {
  const [error] = await safeFetch(MessageSchema, `/assignments/questions/${questionId}`, {
    method: 'DELETE',
    headers: await authHeaders(false),
    cache: 'no-store',
  });
  if (error) {
    console.error('assignments.server request failed:', error);
    return { error };
  }
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
  if (error) {
    console.error('assignments.server request failed:', error);
    return { error };
  }
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
  if (error) {
    console.error('assignments.server request failed:', error);
    return { error };
  }
  return { data: data!.data };
}

export async function gradeAssignmentAttempt(
  attemptId: string,
  grades: { questionId: string; isCorrect: boolean }[],
) {
  const [error, data] = await safeFetch(
    z.object({ message: z.string().optional(), data: z.any() }),
    `/assignments/attempts/${attemptId}/grade`,
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
    assignment_id: z.string(),
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

export type AdminAssignmentAttemptDetail = z.infer<typeof AttemptDetailSchema>['data'];

export async function getAdminAssignmentAttemptDetail(attemptId: string): Promise<AdminAssignmentAttemptDetail | null> {
  const [error, data] = await safeFetch(AttemptDetailSchema, `/assignments/attempts/${attemptId}`, {
    headers: await authHeaders(false),
    cache: 'no-store',
  });
  if (error) return null;
  return data!.data;
}
