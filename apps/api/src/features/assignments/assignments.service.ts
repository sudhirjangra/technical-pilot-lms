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
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyRequest } from 'fastify';
import {
  CreateAssignmentDto,
  CreateAssignmentQuestionDto,
  SaveAssignmentAnswerDto,
  SubmitAssignmentAttemptDto,
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
      topic: dto.topic?.trim() || null,
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
        topic: dto.topic === undefined ? undefined : dto.topic.trim() || null,
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

    const { data: lastQuestion, error: lastQuestionError } = await this.supabase
      .from('questions')
      .select('question_number, sort_order')
      .eq('assignment_id', assignmentId)
      .order('question_number', { ascending: false })
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastQuestionError) throw new BadRequestException(lastQuestionError.message);

    const questionNumberOffset = lastQuestion?.question_number ?? 0;
    const sortOrderOffset = lastQuestion?.sort_order ?? 0;

    const insertedQuestions = await this.insertImportedQuestions(
      questions,
      assignmentId,
      {
        questionNumberOffset,
        sortOrderOffset,
      },
    );

    return {
      count: insertedQuestions.length,
      questions: insertedQuestions,
    };
  }

  // ── Student endpoints ──────────────────────────────────────────────────────

  async getAssignmentForStudentLesson(lessonId: string, studentId: string) {
    await this.checkEnrollmentForLesson(lessonId, studentId);

    const { data: assignment, error } = await this.supabase
      .from('assignments')
      .select('id, lesson_id, title, instructions, time_limit_seconds, passing_score_percent, max_attempts')
      .eq('lesson_id', lessonId)
      .single();

    if (error || !assignment) throw new NotFoundException('Assignment not found');

    const questions = await this.getStudentQuestionsWithOptions(assignment.id);

    const { data: rawAttempts } = await this.supabase
      .from('assignment_attempts')
      .select('id, assignment_id, student_id, started_at, completed_at, score, max_score, time_spent_seconds')
      .eq('assignment_id', assignment.id)
      .eq('student_id', studentId)
      .order('started_at', { ascending: false });

    const passingPct = assignment.passing_score_percent ?? 60;
    const attempts = (rawAttempts ?? []).map((a) => {
      const percentage =
        a.max_score && a.max_score > 0
          ? Math.round(((a.score ?? 0) / a.max_score) * 100)
          : null;
      return {
        ...a,
        percentage,
        passed: percentage !== null ? percentage >= passingPct : null,
      };
    });

    const { data: grant } = await this.supabase
      .from('assessment_attempt_grants')
      .select('extra_attempts')
      .eq('assignment_id', assignment.id)
      .eq('student_id', studentId)
      .maybeSingle();

    const extraAttempts = grant?.extra_attempts ?? 0;
    const baseAttempts = assignment.max_attempts;
    let effectiveMaxAttempts: number | null = null;
    if (baseAttempts !== null && baseAttempts !== undefined && baseAttempts > 0) {
      effectiveMaxAttempts = baseAttempts + extraAttempts;
    } else if (extraAttempts > 0) {
      // Base was 0 / empty (infinite), but admin explicitly assigned an attempt limit to this specific student
      effectiveMaxAttempts = extraAttempts;
    } else {
      // Infinite attempts
      effectiveMaxAttempts = null;
    }

    return {
      assignment: {
        ...assignment,
        max_attempts: effectiveMaxAttempts,
        questions,
      },
      attempt: attempts[0] ?? null,
      attempts_used: attempts.length,
      attempts,
      extra_attempts_granted: extraAttempts,
    };
  }

  async startAttempt(assignmentId: string, studentId: string) {
    const { data: row, error } = await this.supabase
      .from('assignments')
      .select('id, lesson_id, max_attempts')
      .eq('id', assignmentId)
      .single();

    if (error || !row) throw new NotFoundException('Assignment not found');

    if (row.lesson_id) await this.checkEnrollmentForLesson(row.lesson_id, studentId);

    const [{ count }, { data: grant }] = await Promise.all([
      this.supabase
        .from('assignment_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId),
      this.supabase
        .from('assessment_attempt_grants')
        .select('extra_attempts')
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId)
        .maybeSingle(),
    ]);

    const baseAttempts = row.max_attempts;
    const extraAttempts = grant?.extra_attempts ?? 0;
    let allowedAttempts: number | null = null;
    if (baseAttempts !== null && baseAttempts !== undefined && baseAttempts > 0) {
      allowedAttempts = baseAttempts + extraAttempts;
    } else if (extraAttempts > 0) {
      allowedAttempts = extraAttempts;
    }

    if (allowedAttempts !== null && (count ?? 0) >= allowedAttempts) {
      throw new ForbiddenException('Maximum attempts reached for this assignment');
    }

    const { data: attempt, error: insertErr } = await this.supabase
      .from('assignment_attempts')
      .insert({ assignment_id: assignmentId, student_id: studentId, started_at: new Date().toISOString() })
      .select()
      .single();

    if (insertErr) throw new BadRequestException(insertErr.message);
    return attempt;
  }

  async submitAttempt(attemptId: string, studentId: string, dto: SubmitAssignmentAttemptDto) {
    const { data: attempt, error: attemptErr } = await this.supabase
      .from('assignment_attempts')
      .select('*, assignments(passing_score_percent)')
      .eq('id', attemptId)
      .eq('student_id', studentId)
      .single();

    if (attemptErr || !attempt) throw new NotFoundException('Attempt not found');
    if (attempt.completed_at) throw new BadRequestException('Attempt already submitted');

    const { data: questions, error: questionsErr } = await this.supabase
      .from('questions')
      .select('id, question_type, points, explanation, correct_text_answer, topic, question_text')
      .eq('assignment_id', attempt.assignment_id);

    if (questionsErr) throw new BadRequestException(questionsErr.message);

    const questionIds = (questions ?? []).map((q) => q.id);
    const { data: allOptions } = await this.supabase
      .from('question_options')
      .select('id, question_id, option_text, is_correct')
      .in('question_id', questionIds);

    const correctOptionsMap = new Map<string, Set<string>>();
    for (const opt of allOptions ?? []) {
      const set = correctOptionsMap.get(opt.question_id) ?? new Set<string>();
      if (opt.is_correct) set.add(opt.id);
      correctOptionsMap.set(opt.question_id, set);
    }

    let totalScore = 0;
    let maxScore = 0;
    let correctCount = 0;

    const answerResults: Array<{
      questionId: string;
      isCorrect: boolean | null;
      points: number;
      pointsEarned: number;
      explanation: string | null;
      correctOptionIds: string[];
    }> = [];

    for (const q of questions ?? []) {
      const points = q.points ?? 1;
      maxScore += points;

      const answer = dto.answers.find((a) => a.questionId === q.id);
      const correctIds = correctOptionsMap.get(q.id) ?? new Set<string>();

      let isCorrect: boolean | null = null;
      let pointsEarned = 0;

      if (q.question_type === 'text') {
        const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
        const expected = q.correct_text_answer ? normalize(q.correct_text_answer as string) : null;
        const given = answer?.textAnswer ? normalize(answer.textAnswer) : null;
        if (!expected) {
          isCorrect = null; // no expected answer set → manually graded
        } else if (given) {
          isCorrect = given === expected;
          if (isCorrect) { pointsEarned = points; correctCount++; }
        } else {
          isCorrect = false;
        }
      } else if (answer?.selectedOptionIds?.length) {
        const selectedSet = new Set(answer.selectedOptionIds);
        const setsMatch = selectedSet.size === correctIds.size && [...selectedSet].every((id) => correctIds.has(id));
        isCorrect = setsMatch;
        if (isCorrect) { pointsEarned = points; correctCount++; }
      } else {
        isCorrect = false;
      }

      if (isCorrect) totalScore += pointsEarned;

      answerResults.push({ questionId: q.id, isCorrect, points, pointsEarned, explanation: q.explanation ?? null, correctOptionIds: [...correctIds] });
    }

    const passingPercent = (attempt.assignments as { passing_score_percent?: number } | null)?.passing_score_percent ?? 60;
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = percentage >= passingPercent;
    const totalTimeSeconds = Math.round((Date.now() - new Date(attempt.started_at).getTime()) / 1000);

    const { error: updateErr } = await this.supabase
      .from('assignment_attempts')
      .update({ completed_at: new Date().toISOString(), score: totalScore, max_score: maxScore, time_spent_seconds: totalTimeSeconds })
      .eq('id', attemptId);

    if (updateErr) throw new BadRequestException(updateErr.message);

    for (const answer of dto.answers) {
      const result = answerResults.find((r) => r.questionId === answer.questionId);
      const q = (questions ?? []).find((qq) => qq.id === answer.questionId);

      const { data: upsertedAnswer, error: answerErr } = await this.supabase
        .from('assignment_answers')
        .upsert(
          { attempt_id: attemptId, question_id: answer.questionId, text_answer: answer.textAnswer ?? null, is_correct: result?.isCorrect ?? null, time_spent_seconds: answer.timeSpentSeconds },
          { onConflict: 'attempt_id,question_id' },
        )
        .select('id')
        .single();

      if (answerErr) continue;

      if (q?.question_type !== 'text' && answer.selectedOptionIds?.length) {
        await this.supabase.from('assignment_answer_options').delete().eq('assignment_answer_id', upsertedAnswer.id);
        await this.supabase.from('assignment_answer_options').insert(
          answer.selectedOptionIds.map((optId) => ({ assignment_answer_id: upsertedAnswer.id, option_id: optId })),
        );
      }
    }

    const questionReview = (questions ?? []).map((q) => {
      const result = answerResults.find((r) => r.questionId === q.id)!;
      const answer = dto.answers.find((a) => a.questionId === q.id);
      return {
        questionId: q.id,
        isCorrect: result.isCorrect,
        pointsEarned: result.pointsEarned,
        points: result.points,
        explanation: result.explanation,
        correctOptionIds: result.correctOptionIds,
        selectedOptionIds: answer?.selectedOptionIds ?? [],
        textAnswer: answer?.textAnswer ?? null,
        topic: (q as { topic?: string | null }).topic ?? null,
        timeSpentSeconds: answer?.timeSpentSeconds ?? 0,
        questionType: q.question_type,
        questionText: (q as { question_text?: string }).question_text ?? '',
      };
    });

    // Build topic breakdown
    const topicMap = new Map<string, { total: number; correct: number; totalTime: number; points: number; earnedPoints: number }>();
    for (const q of questions ?? []) {
      const topic = (q as { topic?: string | null }).topic ?? 'General';
      const current = topicMap.get(topic) ?? { total: 0, correct: 0, totalTime: 0, points: 0, earnedPoints: 0 };
      const result = answerResults.find((r) => r.questionId === q.id)!;
      const answer = dto.answers.find((a) => a.questionId === q.id);
      current.total += 1;
      if (result.isCorrect === true) current.correct += 1;
      current.totalTime += answer?.timeSpentSeconds ?? 0;
      current.points += result.points;
      current.earnedPoints += result.pointsEarned;
      topicMap.set(topic, current);
    }
    const topicBreakdown = Array.from(topicMap.entries()).map(([topic, stats]) => ({ topic, ...stats }));

    const totalQCount = (questions ?? []).length;
    const avgTimePerQuestion = totalQCount > 0 ? Math.round(totalTimeSeconds / totalQCount) : 0;

    return {
      score: totalScore,
      maxScore,
      passed,
      percentage,
      correctCount,
      totalCount: totalQCount,
      questionReview,
      totalTimeSeconds,
      topicBreakdown,
      avgTimePerQuestion,
    };
  }

  async saveAnswer(attemptId: string, questionId: string, studentId: string, dto: SaveAssignmentAnswerDto) {
    const { data: attempt } = await this.supabase
      .from('assignment_attempts')
      .select('id')
      .eq('id', attemptId)
      .eq('student_id', studentId)
      .single();

    if (!attempt) throw new NotFoundException('Attempt not found');

    const { data: upsertedAnswer, error } = await this.supabase
      .from('assignment_answers')
      .upsert(
        { attempt_id: attemptId, question_id: questionId, text_answer: dto.textAnswer ?? null, time_spent_seconds: dto.timeSpentSeconds },
        { onConflict: 'attempt_id,question_id' },
      )
      .select('id')
      .single();

    if (error) throw new BadRequestException(error.message);

    if (dto.selectedOptionIds?.length !== undefined) {
      await this.supabase.from('assignment_answer_options').delete().eq('assignment_answer_id', upsertedAnswer.id);
      if (dto.selectedOptionIds.length > 0) {
        await this.supabase.from('assignment_answer_options').insert(
          dto.selectedOptionIds.map((optId) => ({ assignment_answer_id: upsertedAnswer.id, option_id: optId })),
        );
      }
    }
  }

  // ── End student endpoints ──────────────────────────────────────────────────

  // ── Admin analytics endpoints ──────────────────────────────────────────────

  /** All of the current student's assignment attempts across every course, most recent first. */
  async getMyAttempts(studentId: string) {
    const { data: attempts, error } = await this.supabase
      .from('assignment_attempts')
      .select(
        'id, started_at, completed_at, score, max_score, time_spent_seconds, assignment_id, assignments(id, title, passing_score_percent, lesson_id, lessons(id, title, chapter_id, chapters(id, title, course_id, courses(id, title))))',
      )
      .eq('student_id', studentId)
      .order('started_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);

    return (attempts ?? []).map((a: any) => {
      const assignment = a.assignments;
      const lesson = assignment?.lessons;
      const chapter = lesson?.chapters;
      const course = chapter?.courses;
      const passingPct = assignment?.passing_score_percent ?? 60;
      const percentage =
        a.max_score && a.max_score > 0
          ? Math.round(((a.score ?? 0) / a.max_score) * 100)
          : null;
      return {
        id: a.id,
        type: 'assignment' as const,
        testTitle: assignment?.title ?? 'Assignment',
        lessonId: lesson?.id ?? null,
        courseId: course?.id ?? null,
        courseTitle: course?.title ?? 'Unknown course',
        started_at: a.started_at,
        completed_at: a.completed_at,
        score: a.score,
        max_score: a.max_score,
        time_spent_seconds: a.time_spent_seconds,
        percentage,
        passed: percentage !== null ? percentage >= passingPct : null,
      };
    });
  }

  async getAssignmentAttempts(assignmentId: string) {
    const { data: assignment } = await this.supabase
      .from('assignments')
      .select('passing_score_percent')
      .eq('id', assignmentId)
      .single();

    const passingPct = assignment?.passing_score_percent ?? 60;

    const { data: attempts, error } = await this.supabase
      .from('assignment_attempts')
      .select('id, student_id, started_at, completed_at, score, max_score, time_spent_seconds')
      .eq('assignment_id', assignmentId)
      .order('started_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    const studentIds = [...new Set((attempts ?? []).map((a) => a.student_id).filter(Boolean))];
    const profileMap = new Map<string, { full_name?: string; email?: string }>();
    if (studentIds.length > 0) {
      const { data: profiles } = await this.supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds);
      if (profiles) {
        for (const p of profiles) {
          profileMap.set(p.id, { full_name: p.full_name, email: p.email });
        }
      }
    }

    return (attempts ?? []).map((a) => {
      const percentage =
        a.max_score && a.max_score > 0
          ? Math.round(((a.score ?? 0) / a.max_score) * 100)
          : null;
      const profile = profileMap.get(a.student_id);
      return {
        id: a.id,
        student_id: a.student_id,
        student_name: profile?.full_name ?? null,
        student_email: profile?.email ?? null,
        started_at: a.started_at,
        completed_at: a.completed_at,
        score: a.score,
        max_score: a.max_score,
        time_spent_seconds: a.time_spent_seconds,
        percentage,
        passed: percentage !== null ? percentage >= passingPct : null,
      };
    });
  }

  async getAssignmentAttemptDetail(attemptId: string, studentId?: string) {
    const query = this.supabase
      .from('assignment_attempts')
      .select('*')
      .eq('id', attemptId);

    if (studentId) {
      query.eq('student_id', studentId);
    }

    const { data: attempt, error: attemptErr } = await query.maybeSingle();

    if (attemptErr || !attempt) {
      // Fallback check in test_attempts in case an attempt ID for a test was dispatched or cross-referenced
      const testQuery = this.supabase
        .from('test_attempts')
        .select('*')
        .eq('id', attemptId);

      if (studentId) {
        testQuery.eq('student_id', studentId);
      }

      const { data: testAttempt } = await testQuery.maybeSingle();

      if (testAttempt) {
        return this.getTestAttemptDetailDirect(testAttempt);
      }

      if (studentId) {
        throw new ForbiddenException('Access denied');
      }
      throw new NotFoundException('Attempt not found');
    }

    const { data: assignmentData } = await this.supabase
      .from('assignments')
      .select('passing_score_percent')
      .eq('id', attempt.assignment_id)
      .maybeSingle();

    const passingPct = assignmentData?.passing_score_percent ?? 60;
    const percentage =
      attempt.max_score && attempt.max_score > 0
        ? Math.round(((attempt.score ?? 0) / attempt.max_score) * 100)
        : null;

    let profile: { full_name?: string; email?: string } | null = null;
    if (attempt.student_id) {
      const { data: profileData } = await this.supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', attempt.student_id)
        .maybeSingle();
      profile = profileData ?? null;
    }

    const { data: answers, error: answersErr } = await this.supabase
      .from('assignment_answers')
      .select('id, question_id, text_answer, is_correct, time_spent_seconds')
      .eq('attempt_id', attemptId);

    if (answersErr) throw new BadRequestException(answersErr.message);

    const answerIds = (answers ?? []).map((a) => a.id);
    const { data: answerOptions } = await this.supabase
      .from('assignment_answer_options')
      .select('assignment_answer_id, option_id')
      .in('assignment_answer_id', answerIds.length > 0 ? answerIds : ['00000000-0000-0000-0000-000000000000']);

    const selectedOptionsMap = new Map<string, string[]>();
    for (const ao of answerOptions ?? []) {
      const current = selectedOptionsMap.get(ao.assignment_answer_id) ?? [];
      current.push(ao.option_id);
      selectedOptionsMap.set(ao.assignment_answer_id, current);
    }

    const { data: questions } = await this.supabase
      .from('questions')
      .select('id, question_type, points, explanation, topic, question_text')
      .eq('assignment_id', attempt.assignment_id);

    const questionIds = (questions ?? []).map((q) => q.id);
    const { data: allOptions } = await this.supabase
      .from('question_options')
      .select('id, question_id, option_text, is_correct')
      .in('question_id', questionIds.length > 0 ? questionIds : ['00000000-0000-0000-0000-000000000000']);

    const optionTextMap = new Map<string, string>();
    const correctOptionsMap = new Map<string, string[]>();
    const optionsByQuestion = new Map<string, { id: string; text: string; isCorrect: boolean }[]>();
    for (const opt of allOptions ?? []) {
      const option = opt as unknown as { id: string; question_id: string; option_text: string; is_correct: boolean };
      optionTextMap.set(option.id, option.option_text);
      if (option.is_correct) {
        const current = correctOptionsMap.get(option.question_id) ?? [];
        current.push(option.id);
        correctOptionsMap.set(option.question_id, current);
      }
      const list = optionsByQuestion.get(option.question_id) ?? [];
      list.push({ id: option.id, text: option.option_text, isCorrect: option.is_correct });
      optionsByQuestion.set(option.question_id, list);
    }

    const questionReview = (questions ?? []).map((q) => {
      const answer = (answers ?? []).find((a) => a.question_id === q.id);
      const selectedOptionIds = answer ? (selectedOptionsMap.get(answer.id) ?? []) : [];
      const correctOptionIds = correctOptionsMap.get(q.id) ?? [];
      const selectedSet = new Set(selectedOptionIds);
      return {
        questionId: q.id,
        questionText: (q as { question_text?: string }).question_text ?? '',
        questionType: q.question_type,
        topic: (q as { topic?: string | null }).topic ?? null,
        isCorrect: answer?.is_correct ?? null,
        timeSpentSeconds: answer?.time_spent_seconds ?? 0,
        points: q.points ?? 1,
        pointsEarned: answer?.is_correct === true ? q.points ?? 1 : 0,
        explanation: (q as { explanation?: string | null }).explanation ?? null,
        correctOptionIds,
        selectedOptionIds,
        correctOptionTexts: correctOptionIds.map((id) => optionTextMap.get(id) ?? id),
        selectedOptionTexts: selectedOptionIds.map((id) => optionTextMap.get(id) ?? id),
        options: (optionsByQuestion.get(q.id) ?? []).map((opt) => ({
          ...opt,
          isSelected: selectedSet.has(opt.id),
        })),
        textAnswer: answer?.text_answer ?? null,
      };
    });

    // Build topic breakdown
    const topicMap = new Map<string, { total: number; correct: number; totalTime: number; points: number; earnedPoints: number }>();
    for (const q of questions ?? []) {
      const topic = (q as { topic?: string | null }).topic ?? 'General';
      const current = topicMap.get(topic) ?? { total: 0, correct: 0, totalTime: 0, points: 0, earnedPoints: 0 };
      const rev = questionReview.find((r) => r.questionId === q.id);
      current.total += 1;
      if (rev?.isCorrect === true) current.correct += 1;
      current.totalTime += rev?.timeSpentSeconds ?? 0;
      current.points += rev?.points ?? 1;
      current.earnedPoints += rev?.pointsEarned ?? 0;
      topicMap.set(topic, current);
    }
    const topicBreakdown = Array.from(topicMap.entries()).map(([topic, stats]) => ({ topic, ...stats }));

    const totalCount = questionReview.length;
    const correctCount = questionReview.filter((q) => q.isCorrect === true).length;
    const totalTimeSeconds = attempt.time_spent_seconds ?? 0;
    const avgTimePerQuestion = totalCount > 0 ? Math.round(totalTimeSeconds / totalCount) : 0;
    const maxScore = attempt.max_score ?? 0;

    return {
      id: attempt.id,
      assignment_id: attempt.assignment_id,
      student_id: attempt.student_id,
      student_name: profile?.full_name ?? null,
      student_email: profile?.email ?? null,
      started_at: attempt.started_at,
      completed_at: attempt.completed_at,
      score: attempt.score ?? 0,
      max_score: maxScore,
      maxScore,
      time_spent_seconds: totalTimeSeconds,
      totalTimeSeconds,
      percentage,
      passed: percentage !== null ? percentage >= passingPct : null,
      correctCount,
      totalCount,
      avgTimePerQuestion,
      topicBreakdown,
      questionReview,
    };
  }

  async gradeAttemptAnswers(attemptId: string, grades: { questionId: string; isCorrect: boolean }[]) {
    for (const grade of grades) {
      const { error } = await this.supabase
        .from('assignment_answers')
        .update({ is_correct: grade.isCorrect })
        .eq('attempt_id', attemptId)
        .eq('question_id', grade.questionId);

      if (error) throw new BadRequestException(error.message);
    }

    const { data: attempt } = await this.supabase
      .from('assignment_attempts')
      .select('assignment_id, student_id, max_score')
      .eq('id', attemptId)
      .single();

    if (!attempt) throw new NotFoundException('Attempt not found');

    const { data: assignment } = await this.supabase
      .from('assignments')
      .select('id, lesson_id, passing_score_percent')
      .eq('id', attempt.assignment_id)
      .single();

    const { data: questions } = await this.supabase
      .from('questions')
      .select('id, points')
      .eq('assignment_id', attempt.assignment_id);

    const { data: answers } = await this.supabase
      .from('assignment_answers')
      .select('question_id, is_correct')
      .eq('attempt_id', attemptId);

    const pointsMap = new Map((questions ?? []).map((q) => [q.id, q.points ?? 1]));
    const calculatedMaxScore = (questions ?? []).reduce((sum, q) => sum + (q.points ?? 1), 0);
    const maxScore = attempt.max_score ?? calculatedMaxScore;
    const totalScore = (answers ?? [])
      .filter((a) => a.is_correct === true)
      .reduce((sum, a) => sum + (pointsMap.get(a.question_id) ?? 1), 0);

    const { data: updatedAttempt } = await this.supabase
      .from('assignment_attempts')
      .update({ score: totalScore, max_score: maxScore })
      .eq('id', attemptId)
      .select()
      .single();

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = percentage >= (assignment?.passing_score_percent ?? 60);

    if (assignment?.lesson_id) {
      await this.syncLessonCompletion(
        assignment.lesson_id,
        attempt.student_id,
        assignment.id,
        assignment.passing_score_percent ?? 60,
      );
    }

    return { ...updatedAttempt, percentage, passed };
  }

  /**
   * Manual grading can flip an attempt between pass and fail, so lesson progress and
   * course enrollment status must be recomputed from the student's best attempt.
   */
  private async syncLessonCompletion(
    lessonId: string,
    studentId: string,
    assignmentId: string,
    passingPercent: number,
  ) {
    const { data: attempts } = await this.supabase
      .from('assignment_attempts')
      .select('score, max_score, completed_at')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId);

    const passedAny = (attempts ?? []).some((a) => {
      if (!a.completed_at) return false;
      const pct = a.max_score && a.max_score > 0 ? ((a.score ?? 0) / a.max_score) * 100 : 0;
      return pct >= passingPercent;
    });

    await this.supabase.from('progress').upsert(
      {
        student_id: studentId,
        lesson_id: lessonId,
        status: passedAny ? 'completed' : 'in_progress',
        progress_percent: passedAny ? 100 : 0,
        completed_at: passedAny ? new Date().toISOString() : null,
      },
      { onConflict: 'student_id,lesson_id' },
    );

    await this.recomputeEnrollmentStatus(lessonId, studentId);
  }

  private async recomputeEnrollmentStatus(lessonId: string, studentId: string) {
    const { data: lesson } = await this.supabase
      .from('lessons')
      .select('id, chapters(course_id)')
      .eq('id', lessonId)
      .single();
    const courseId = (lesson?.chapters as unknown as { course_id: string })?.course_id;
    if (!courseId) return;

    const { data: chapters } = await this.supabase
      .from('chapters')
      .select('id, lessons(id, is_published)')
      .eq('course_id', courseId)
      .eq('is_published', true);

    const publishedLessonIds = (chapters ?? []).flatMap((ch: any) =>
      ((ch.lessons ?? []) as any[])
        .filter((l: any) => l.is_published !== false)
        .map((l: any) => l.id),
    );
    if (publishedLessonIds.length === 0) return;

    const { data: progressRows } = await this.supabase
      .from('progress')
      .select('lesson_id, status')
      .eq('student_id', studentId)
      .in('lesson_id', publishedLessonIds);

    const completedCount = (progressRows ?? []).filter(
      (p: { status: string }) => p.status === 'completed',
    ).length;
    const courseComplete = completedCount >= publishedLessonIds.length;

    await this.supabase
      .from('enrollments')
      .update(
        courseComplete
          ? { status: 'completed', completed_at: new Date().toISOString() }
          : { status: 'active', completed_at: null },
      )
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .in('status', ['active', 'completed']);
  }

  private async getTestAttemptDetailDirect(attempt: any) {
    const { data: testData } = await this.supabase
      .from('tests')
      .select('passing_score_percent')
      .eq('id', attempt.test_id)
      .maybeSingle();

    const passingPct = testData?.passing_score_percent ?? 60;
    const percentage =
      attempt.max_score && attempt.max_score > 0
        ? Math.round(((attempt.score ?? 0) / attempt.max_score) * 100)
        : null;

    let profile: { full_name?: string; email?: string } | null = null;
    if (attempt.student_id) {
      const { data: profileData } = await this.supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', attempt.student_id)
        .maybeSingle();
      profile = profileData ?? null;
    }

    const { data: answers, error: answersErr } = await this.supabase
      .from('test_answers')
      .select('id, question_id, text_answer, is_correct, time_spent_seconds')
      .eq('attempt_id', attempt.id);

    if (answersErr) throw new BadRequestException(answersErr.message);

    const answerIds = (answers ?? []).map((a) => a.id);
    const { data: answerOptions } = await this.supabase
      .from('test_answer_options')
      .select('test_answer_id, option_id')
      .in('test_answer_id', answerIds.length > 0 ? answerIds : ['00000000-0000-0000-0000-000000000000']);

    const selectedOptionsMap = new Map<string, string[]>();
    for (const ao of answerOptions ?? []) {
      const current = selectedOptionsMap.get(ao.test_answer_id) ?? [];
      current.push(ao.option_id);
      selectedOptionsMap.set(ao.test_answer_id, current);
    }

    const { data: questions } = await this.supabase
      .from('questions')
      .select('id, question_type, points, explanation, topic, question_text')
      .eq('test_id', attempt.test_id);

    const questionIds = (questions ?? []).map((q) => q.id);
    const { data: allOptions } = await this.supabase
      .from('question_options')
      .select('id, question_id, option_text, is_correct')
      .in('question_id', questionIds.length > 0 ? questionIds : ['00000000-0000-0000-0000-000000000000']);

    const optionTextMap = new Map<string, string>();
    const correctOptionsMap = new Map<string, string[]>();
    const optionsByQuestion = new Map<string, { id: string; text: string; isCorrect: boolean }[]>();
    for (const opt of allOptions ?? []) {
      const option = opt as unknown as { id: string; question_id: string; option_text: string; is_correct: boolean };
      optionTextMap.set(option.id, option.option_text);
      if (option.is_correct) {
        const current = correctOptionsMap.get(option.question_id) ?? [];
        current.push(option.id);
        correctOptionsMap.set(option.question_id, current);
      }
      const list = optionsByQuestion.get(option.question_id) ?? [];
      list.push({ id: option.id, text: option.option_text, isCorrect: option.is_correct });
      optionsByQuestion.set(option.question_id, list);
    }

    const questionReview = (questions ?? []).map((q) => {
      const answer = (answers ?? []).find((a) => a.question_id === q.id);
      const selectedOptionIds = answer ? (selectedOptionsMap.get(answer.id) ?? []) : [];
      const correctOptionIds = correctOptionsMap.get(q.id) ?? [];
      const selectedSet = new Set(selectedOptionIds);
      return {
        questionId: q.id,
        questionText: (q as { question_text?: string }).question_text ?? '',
        questionType: q.question_type,
        topic: (q as { topic?: string | null }).topic ?? null,
        isCorrect: answer?.is_correct ?? null,
        timeSpentSeconds: answer?.time_spent_seconds ?? 0,
        points: q.points ?? 1,
        pointsEarned: answer?.is_correct === true ? q.points ?? 1 : 0,
        explanation: (q as { explanation?: string | null }).explanation ?? null,
        correctOptionIds,
        selectedOptionIds,
        correctOptionTexts: correctOptionIds.map((id) => optionTextMap.get(id) ?? id),
        selectedOptionTexts: selectedOptionIds.map((id) => optionTextMap.get(id) ?? id),
        options: (optionsByQuestion.get(q.id) ?? []).map((opt) => ({
          ...opt,
          isSelected: selectedSet.has(opt.id),
        })),
        textAnswer: answer?.text_answer ?? null,
      };
    });

    const topicMap = new Map<string, { total: number; correct: number; totalTime: number; points: number; earnedPoints: number }>();
    for (const q of questions ?? []) {
      const topic = (q as { topic?: string | null }).topic ?? 'General';
      const current = topicMap.get(topic) ?? { total: 0, correct: 0, totalTime: 0, points: 0, earnedPoints: 0 };
      const rev = questionReview.find((r) => r.questionId === q.id);
      current.total += 1;
      if (rev?.isCorrect === true) current.correct += 1;
      current.totalTime += rev?.timeSpentSeconds ?? 0;
      current.points += rev?.points ?? 1;
      current.earnedPoints += rev?.pointsEarned ?? 0;
      topicMap.set(topic, current);
    }
    const topicBreakdown = Array.from(topicMap.entries()).map(([topic, stats]) => ({ topic, ...stats }));

    const totalCount = questionReview.length;
    const correctCount = questionReview.filter((q) => q.isCorrect === true).length;
    const totalTimeSeconds = attempt.time_spent_seconds ?? 0;
    const avgTimePerQuestion = totalCount > 0 ? Math.round(totalTimeSeconds / totalCount) : 0;
    const maxScore = attempt.max_score ?? 0;

    return {
      id: attempt.id,
      test_id: attempt.test_id,
      assignment_id: attempt.test_id,
      student_id: attempt.student_id,
      student_name: profile?.full_name ?? null,
      student_email: profile?.email ?? null,
      started_at: attempt.started_at,
      completed_at: attempt.completed_at,
      score: attempt.score ?? 0,
      max_score: maxScore,
      maxScore,
      time_spent_seconds: totalTimeSeconds,
      totalTimeSeconds,
      percentage,
      passed: percentage !== null ? percentage >= passingPct : null,
      correctCount,
      totalCount,
      avgTimePerQuestion,
      topicBreakdown,
      questionReview,
    };
  }

  async findAttemptForStudent(attemptId: string, studentId: string, role?: string) {
    const isAdmin = (role ?? '').toUpperCase() === 'ADMIN';
    if (isAdmin) {
      return this.getAssignmentAttemptDetail(attemptId);
    }

    const { data: attempt } = await this.supabase
      .from('assignment_attempts')
      .select('id, student_id')
      .eq('id', attemptId)
      .maybeSingle();

    if (attempt) {
      if (attempt.student_id !== studentId) {
        throw new ForbiddenException('Access denied');
      }
      return this.getAssignmentAttemptDetail(attemptId, studentId);
    }

    const { data: testAttempt } = await this.supabase
      .from('test_attempts')
      .select('id, student_id')
      .eq('id', attemptId)
      .maybeSingle();

    if (testAttempt) {
      if (testAttempt.student_id !== studentId) {
        throw new ForbiddenException('Access denied');
      }
      return this.getAssignmentAttemptDetail(attemptId, studentId);
    }

    throw new NotFoundException('Attempt not found');
  }

  async assignStudentAttempts(
    assignmentId: string,
    studentId: string,
    attempts: number,
    grantedBy?: string,
  ) {
    const { data: existing } = await this.supabase
      .from('assessment_attempt_grants')
      .select('id')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await this.supabase
        .from('assessment_attempt_grants')
        .update({
          extra_attempts: attempts,
          granted_by: grantedBy,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw new BadRequestException(error.message);
      return data;
    } else {
      const { data, error } = await this.supabase
        .from('assessment_attempt_grants')
        .insert({
          assignment_id: assignmentId,
          student_id: studentId,
          extra_attempts: attempts,
          granted_by: grantedBy,
        })
        .select('*')
        .single();
      if (error) throw new BadRequestException(error.message);
      return data;
    }
  }

  // ── End admin analytics endpoints ──────────────────────────────────────────

  private async checkEnrollmentForLesson(lessonId: string, studentId: string) {
    const { data: lesson } = await this.supabase
      .from('lessons')
      .select('chapters(course_id)')
      .eq('id', lessonId)
      .single();

    const courseId = (lesson?.chapters as unknown as { course_id: string })?.course_id;
    if (!courseId) throw new NotFoundException('Lesson not found');

    const { data: enrollment } = await this.supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .in('status', ['active', 'completed'])
      .maybeSingle();

    if (!enrollment) throw new ForbiddenException('Active enrollment required to access this assignment');
  }

  private async getStudentQuestionsWithOptions(assignmentId: string) {
    const { data: questions, error } = await this.supabase
      .from('questions')
      .select('id, assignment_id, question_text, question_type, points, explanation, sort_order, question_number, topic')
      .eq('assignment_id', assignmentId)
      .order('sort_order', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    if (!questions || questions.length === 0) return [];

    const questionIds = questions.map((q) => q.id);
    const { data: options, error: optionsError } = await this.supabase
      .from('question_options')
      .select('id, question_id, option_text, sort_order')
      .in('question_id', questionIds)
      .order('sort_order', { ascending: true });

    if (optionsError) throw new BadRequestException(optionsError.message);

    const optionMap = new Map<string, { id: string; question_id: string; option_text: string; sort_order: number }[]>();
    for (const opt of options ?? []) {
      const current = optionMap.get(opt.question_id) ?? [];
      current.push(opt);
      optionMap.set(opt.question_id, current);
    }

    return questions.map((q) => ({ ...q, question_options: optionMap.get(q.id) ?? [] }));
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
    offsets: { questionNumberOffset: number; sortOrderOffset: number },
  ) {
    const insertedQuestions: Array<QuestionRow & { question_options: unknown[] }> =
      [];

    for (const [index, question] of questions.entries()) {
      const { data: insertedQuestion, error } = await this.supabase
        .from('questions')
        .insert({
          test_id: null,
          assignment_id: assignmentId,
          question_text: question.question_text,
          question_type: question.question_type,
          points: question.points,
          explanation: question.explanation ?? null,
          topic: (question as { topic?: string | null }).topic ?? null,
          sort_order: offsets.sortOrderOffset + index + 1,
          question_number: offsets.questionNumberOffset + question.question_number,
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
