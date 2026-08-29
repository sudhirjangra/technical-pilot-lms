import {
  ImportedQuizQuestion,
  QuizQuestionOptionInput,
  QuizQuestionType,
  normalizeQuestionOptions,
  parseQuestionImportFile,
  validateQuestionOptions,
} from '@/common/utils';
import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyRequest } from 'fastify';
import {
  CreateAssignmentDto,
  CreateAssignmentQuestionDto,
  UpdateAssignmentDto,
  UpdateAssignmentQuestionDto,
} from './dto';

type MultipartRequest = FastifyRequest & {
  file: () => Promise<{
    filename: string;
    mimetype: string;
    toBuffer: () => Promise<Buffer>;
  } | undefined>;
};

type QuestionRow = {
  id: string;
  question_type: QuizQuestionType;
  [key: string]: unknown;
};

type QuestionOptionRow = {
  question_id: string;
  option_text: string;
  is_correct: boolean;
  [key: string]: unknown;
};

@Injectable()
export class AssignmentsService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  async create(dto: CreateAssignmentDto) {
    const lesson = await this.getLesson(dto.lesson_id);
    if (lesson.lesson_type !== 'assignment') {
      throw new BadRequestException('Lesson type must be assignment');
    }

    const { data: existingAssignment, error: existingError } =
      await this.supabase
        .from('assignments')
        .select('id')
        .eq('lesson_id', dto.lesson_id)
        .maybeSingle();

    if (existingError) throw new BadRequestException(existingError.message);
    if (existingAssignment) {
      throw new BadRequestException(
        'Assignment already exists for this lesson, use update',
      );
    }

    const { data, error } = await this.supabase
      .from('assignments')
      .insert(dto)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findByLesson(lessonId: string) {
    const { data, error } = await this.supabase
      .from('assignments')
      .select('*')
      .eq('lesson_id', lessonId)
      .single();

    if (error || !data) throw new NotFoundException('Assignment not found');

    const questions = await this.getQuestionsWithOptions(data.id);
    return { ...data, questions };
  }

  async update(id: string, dto: UpdateAssignmentDto) {
    const { data, error } = await this.supabase
      .from('assignments')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Assignment not found');
      }
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase
      .from('assignments')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
  }

  async createQuestion(assignmentId: string, dto: CreateAssignmentQuestionDto) {
    await this.ensureAssignmentExists(assignmentId);

    const options = normalizeQuestionOptions(dto.options, 'Question');
    validateQuestionOptions(dto.question_type, options, 'Question');

    const sortOrder =
      dto.sort_order ?? (await this.getNextSortOrder(assignmentId));
    const questionPayload = {
      test_id: null,
      assignment_id: assignmentId,
      question_text: dto.question_text.trim(),
      question_type: dto.question_type,
      points: dto.points ?? 1,
      explanation: dto.explanation?.trim() || null,
      sort_order: sortOrder,
      question_number: dto.question_number ?? sortOrder,
      correct_text_answer:
        dto.question_type === 'text'
          ? dto.correct_text_answer?.trim() || null
          : null,
    };

    const { data: question, error } = await this.supabase
      .from('questions')
      .insert(questionPayload)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.replaceQuestionOptions(question.id, options);
    return this.getQuestionWithOptions(question.id);
  }

  async updateQuestion(questionId: string, dto: UpdateAssignmentQuestionDto) {
    const existingQuestion = await this.getQuestionWithOptions(questionId);
    this.ensureQuestionBelongsToAssignment(existingQuestion);
    const currentOptions = (existingQuestion.question_options ??
      []) as QuestionOptionRow[];
    const nextQuestionType =
      (dto.question_type ?? existingQuestion.question_type) as QuizQuestionType;

    const nextOptions =
      dto.options !== undefined
        ? normalizeQuestionOptions(dto.options, 'Question')
        : nextQuestionType === 'text'
          ? []
          : currentOptions.map((option) => ({
              option_text: option.option_text,
              is_correct: option.is_correct,
            }));

    validateQuestionOptions(nextQuestionType, nextOptions, 'Question');

    const { error } = await this.supabase
      .from('questions')
      .update({
        question_text: dto.question_text?.trim(),
        question_type: dto.question_type,
        points: dto.points,
        explanation:
          dto.explanation === undefined ? undefined : dto.explanation.trim() || null,
        sort_order: dto.sort_order,
        question_number: dto.question_number,
        correct_text_answer:
          nextQuestionType === 'text'
            ? dto.correct_text_answer === undefined
              ? undefined
              : dto.correct_text_answer.trim() || null
            : null,
      })
      .eq('id', questionId);

    if (error) {
      if (error.code === 'PGRST116')
        throw new NotFoundException('Question not found');
      throw new BadRequestException(error.message);
    }

    if (dto.options !== undefined || nextQuestionType === 'text') {
      await this.replaceQuestionOptions(questionId, nextOptions);
    }

    return this.getQuestionWithOptions(questionId);
  }

  async removeQuestion(questionId: string) {
    const question = await this.getQuestionWithOptions(questionId);
    this.ensureQuestionBelongsToAssignment(question);

    const { error } = await this.supabase
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (error) throw new BadRequestException(error.message);
  }

  async reorderQuestions(
    assignmentId: string,
    questions: { id: string; sort_order: number }[],
  ) {
    const updates = questions.map(({ id, sort_order }) =>
      this.supabase
        .from('questions')
        .update({ sort_order })
        .eq('id', id)
        .eq('assignment_id', assignmentId),
    );

    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);
    if (failed?.error) throw new BadRequestException(failed.error.message);
  }

  async importQuestions(assignmentId: string, request: FastifyRequest) {
    await this.ensureAssignmentExists(assignmentId);

    const part = await (request as MultipartRequest).file();
    if (!part) throw new BadRequestException('A file is required');

    const questions = parseQuestionImportFile({
      buffer: await part.toBuffer(),
      filename: part.filename,
      mimetype: part.mimetype,
    });

    // Import replaces the entire question bank for this assignment.
    const { error: deleteError } = await this.supabase
      .from('questions')
      .delete()
      .eq('assignment_id', assignmentId);

    if (deleteError) throw new BadRequestException(deleteError.message);

    const insertedQuestions = await this.insertImportedQuestions(
      questions,
      assignmentId,
    );

    return {
      count: insertedQuestions.length,
      questions: insertedQuestions,
    };
  }

  private async getLesson(lessonId: string) {
    const { data, error } = await this.supabase
      .from('lessons')
      .select('id, lesson_type')
      .eq('id', lessonId)
      .single();

    if (error || !data) throw new NotFoundException('Lesson not found');
    return data as { id: string; lesson_type: string };
  }

  private async ensureAssignmentExists(assignmentId: string) {
    const { data, error } = await this.supabase
      .from('assignments')
      .select('id')
      .eq('id', assignmentId)
      .single();

    if (error || !data) throw new NotFoundException('Assignment not found');
    return data;
  }

  private async getNextSortOrder(assignmentId: string) {
    const { count, error } = await this.supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('assignment_id', assignmentId);

    if (error) throw new BadRequestException(error.message);
    return (count ?? 0) + 1;
  }

  private async getQuestionsWithOptions(assignmentId: string) {
    const { data: questions, error } = await this.supabase
      .from('questions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('sort_order', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    if (!questions || questions.length === 0) return [];

    const questionIds = questions.map((question) => question.id);
    const { data: options, error: optionsError } = await this.supabase
      .from('question_options')
      .select('*')
      .in('question_id', questionIds)
      .order('sort_order', { ascending: true });

    if (optionsError) throw new BadRequestException(optionsError.message);

    const optionMap = new Map<string, QuestionOptionRow[]>();
    for (const option of (options ?? []) as QuestionOptionRow[]) {
      const current = optionMap.get(option.question_id) ?? [];
      current.push(option);
      optionMap.set(option.question_id, current);
    }

    return questions.map((question) => ({
      ...question,
      question_options: optionMap.get(question.id) ?? [],
    }));
  }

  private async getQuestionWithOptions(questionId: string) {
    const { data: question, error } = await this.supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (error || !question) throw new NotFoundException('Question not found');

    const { data: options, error: optionsError } = await this.supabase
      .from('question_options')
      .select('*')
      .eq('question_id', questionId)
      .order('sort_order', { ascending: true });

    if (optionsError) throw new BadRequestException(optionsError.message);

    return {
      ...(question as QuestionRow),
      question_options: (options ?? []) as QuestionOptionRow[],
    };
  }

  private ensureQuestionBelongsToAssignment(question: QuestionRow) {
    if (!question.assignment_id)
      throw new NotFoundException('Question not found');
  }

  private async replaceQuestionOptions(
    questionId: string,
    options: QuizQuestionOptionInput[],
  ) {
    const { error: deleteError } = await this.supabase
      .from('question_options')
      .delete()
      .eq('question_id', questionId);

    if (deleteError) throw new BadRequestException(deleteError.message);

    if (options.length === 0) return [];

    const { data, error } = await this.supabase
      .from('question_options')
      .insert(
        options.map((option, index) => ({
          question_id: questionId,
          option_text: option.option_text,
          is_correct: option.is_correct,
          sort_order: index + 1,
        })),
      )
      .select();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  private async insertImportedQuestions(
    questions: ImportedQuizQuestion[],
    assignmentId: string,
  ) {
    const insertedQuestions: Array<QuestionRow & { question_options: unknown[] }> =
      [];

    for (const question of questions) {
      const { data: insertedQuestion, error } = await this.supabase
        .from('questions')
        .insert({
          test_id: null,
          assignment_id: assignmentId,
          question_text: question.question_text,
          question_type: question.question_type,
          points: question.points,
          explanation: question.explanation ?? null,
          sort_order: question.sort_order,
          question_number: question.question_number,
          correct_text_answer: question.correct_text_answer,
        })
        .select()
        .single();

      if (error) throw new BadRequestException(error.message);

      const questionOptions = await this.replaceQuestionOptions(
        insertedQuestion.id,
        question.options,
      );

      insertedQuestions.push({
        ...(insertedQuestion as QuestionRow),
        question_options: questionOptions ?? [],
      });
    }

    return insertedQuestions;
  }
}
