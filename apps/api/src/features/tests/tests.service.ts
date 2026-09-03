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
  CreateTestDto,
  CreateTestQuestionDto,
  SaveAnswerDto,
  SubmitTestAttemptDto,
  UpdateTestDto,
  UpdateTestQuestionDto,
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
export class TestsService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  async create(dto: CreateTestDto) {
    const lesson = await this.getLesson(dto.lesson_id);
    if (lesson.lesson_type !== 'test') {
      throw new BadRequestException('Lesson type must be test');
    }

    const { data: existingTest, error: existingError } = await this.supabase
      .from('tests')
      .select('id')
      .eq('lesson_id', dto.lesson_id)
      .maybeSingle();

    if (existingError) throw new BadRequestException(existingError.message);
    if (existingTest) {
      throw new BadRequestException(
        'Test already exists for this lesson, use update',
      );
    }

    const { data, error } = await this.supabase
      .from('tests')
      .insert(dto)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findByLesson(lessonId: string) {
    const { data, error } = await this.supabase
      .from('tests')
      .select('*')
      .eq('lesson_id', lessonId)
      .single();

    if (error || !data) throw new NotFoundException('Test not found');

    const questions = await this.getQuestionsWithOptions(data.id);
    return { ...data, questions };
  }

  async update(id: string, dto: UpdateTestDto) {
    const { data, error } = await this.supabase
      .from('tests')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundException('Test not found');
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase.from('tests').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  async createQuestion(testId: string, dto: CreateTestQuestionDto) {
    await this.ensureTestExists(testId);

    const options = normalizeQuestionOptions(dto.options, 'Question');
    validateQuestionOptions(dto.question_type, options, 'Question');

    const sortOrder = dto.sort_order ?? (await this.getNextSortOrder(testId));
    const questionPayload = {
      test_id: testId,
      assignment_id: null,
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

  async updateQuestion(questionId: string, dto: UpdateTestQuestionDto) {
    const existingQuestion = await this.getQuestionWithOptions(questionId);
    this.ensureQuestionBelongsToTest(existingQuestion);
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
    this.ensureQuestionBelongsToTest(question);

    const { error } = await this.supabase
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (error) throw new BadRequestException(error.message);
  }

  async reorderQuestions(
    testId: string,
    questions: { id: string; sort_order: number }[],
  ) {
    const updates = questions.map(({ id, sort_order }) =>
      this.supabase
        .from('questions')
        .update({ sort_order })
        .eq('id', id)
        .eq('test_id', testId),
    );

    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);
    if (failed?.error) throw new BadRequestException(failed.error.message);
  }

  async importQuestions(testId: string, request: FastifyRequest) {
    await this.ensureTestExists(testId);

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
      .eq('test_id', testId)
      .order('question_number', { ascending: false })
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastQuestionError) throw new BadRequestException(lastQuestionError.message);

    const questionNumberOffset = lastQuestion?.question_number ?? 0;
    const sortOrderOffset = lastQuestion?.sort_order ?? 0;

    const insertedQuestions = await this.insertImportedQuestions(
      questions,
      testId,
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

  // ── Student endpoints ─────────────────────────────────────────────────────

  async getTestForStudentLesson(lessonId: string, studentId: string) {
    // Verify enrollment
    await this.checkEnrollmentForLesson(lessonId, studentId);

    const { data: test, error } = await this.supabase
      .from('tests')
      .select('*')
      .eq('lesson_id', lessonId)
      .single();

    if (error || !test) throw new NotFoundException('Test not found');

    // Fetch questions without correct answers
    const questions = await this.getStudentQuestionsWithOptions(test.id);

    // Fetch attempt count + latest attempt for this student
    const { data: rawAttempts } = await this.supabase
      .from('test_attempts')
      .select('id, started_at, completed_at, score, max_score, time_spent_seconds')
      .eq('test_id', test.id)
      .eq('student_id', studentId)
      .order('started_at', { ascending: false });

    const passingPct = test.passing_score_percent ?? 60;
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

    const attemptCount = attempts.length;
    const latestAttempt = attempts[0] ?? null;

    return {
      test: { ...test, questions },
      attempt: latestAttempt,
      attempts_used: attemptCount,
      attempts,
    };
  }

  async startAttempt(testId: string, studentId: string) {
    // Fetch test details in one query
    const { data: testRow, error: testErr } = await this.supabase
      .from('tests')
      .select('id, lesson_id, max_attempts')
      .eq('id', testId)
      .single();

    if (testErr || !testRow) throw new NotFoundException('Test not found');

    // Check enrollment via lesson
    if (testRow.lesson_id) {
      await this.checkEnrollmentForLesson(testRow.lesson_id, studentId);
    }

    // Check max_attempts
    const testDetails = testRow;

    if (testDetails?.max_attempts) {
      const { count } = await this.supabase
        .from('test_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', testId)
        .eq('student_id', studentId);

      if ((count ?? 0) >= testDetails.max_attempts) {
        throw new ForbiddenException('Maximum attempts reached for this test');
      }
    }

    const { data: attempt, error } = await this.supabase
      .from('test_attempts')
      .insert({
        test_id: testId,
        student_id: studentId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return attempt;
  }

  async submitAttempt(
    attemptId: string,
    studentId: string,
    dto: SubmitTestAttemptDto,
  ) {
    // Verify attempt belongs to student and is not completed
    const { data: attempt, error: attemptError } = await this.supabase
      .from('test_attempts')
      .select('*, tests(passing_score_percent)')
      .eq('id', attemptId)
      .eq('student_id', studentId)
      .single();

    if (attemptError || !attempt) throw new NotFoundException('Attempt not found');
    if (attempt.completed_at) {
      throw new BadRequestException('Attempt already submitted');
    }

    // Fetch questions with correct answers for grading
    const { data: questions, error: questionsError } = await this.supabase
      .from('questions')
      .select('id, question_type, points, explanation, correct_text_answer, topic, question_text')
      .eq('test_id', attempt.test_id);

    if (questionsError) throw new BadRequestException(questionsError.message);

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
        const setsMatch =
          selectedSet.size === correctIds.size &&
          [...selectedSet].every((id) => correctIds.has(id));
        isCorrect = setsMatch;
        if (isCorrect) {
          pointsEarned = points;
          correctCount++;
        }
      } else {
        isCorrect = false;
      }

      if (isCorrect) totalScore += pointsEarned;

      answerResults.push({
        questionId: q.id,
        isCorrect,
        points,
        pointsEarned,
        explanation: q.explanation ?? null,
        correctOptionIds: [...correctIds],
      });
    }

    const passingPercent = attempt.tests?.passing_score_percent ?? 60;
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = percentage >= passingPercent;

    // Calculate total time spent
    const startedAt = new Date(attempt.started_at).getTime();
    const totalTimeSeconds = Math.round((Date.now() - startedAt) / 1000);

    // Update attempt
    const { error: updateError } = await this.supabase
      .from('test_attempts')
      .update({
        completed_at: new Date().toISOString(),
        score: totalScore,
        max_score: maxScore,
        time_spent_seconds: totalTimeSeconds,
      })
      .eq('id', attemptId);

    if (updateError) throw new BadRequestException(updateError.message);

    // Upsert test_answers
    for (const answer of dto.answers) {
      const result = answerResults.find((r) => r.questionId === answer.questionId);
      const q = (questions ?? []).find((qq) => qq.id === answer.questionId);

      const { data: upsertedAnswer, error: answerError } = await this.supabase
        .from('test_answers')
        .upsert(
          {
            attempt_id: attemptId,
            question_id: answer.questionId,
            text_answer: answer.textAnswer ?? null,
            is_correct: result?.isCorrect ?? null,
            time_spent_seconds: answer.timeSpentSeconds,
          },
          { onConflict: 'attempt_id,question_id' },
        )
        .select('id')
        .single();

      if (answerError) continue;

      // For MCQ/MSQ, upsert junction table
      if (q?.question_type !== 'text' && answer.selectedOptionIds?.length) {
        await this.supabase
          .from('test_answer_options')
          .delete()
          .eq('test_answer_id', upsertedAnswer.id);

        await this.supabase.from('test_answer_options').insert(
          answer.selectedOptionIds.map((optId) => ({
            test_answer_id: upsertedAnswer.id,
            option_id: optId,
          })),
        );
      }
    }

    // Build per-question review (include correct answers and explanation now)
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
    const topicBreakdown = Array.from(topicMap.entries()).map(([topic, stats]) => ({
      topic,
      ...stats,
    }));

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

  async saveAnswer(
    attemptId: string,
    questionId: string,
    studentId: string,
    dto: SaveAnswerDto,
  ) {
    // Verify attempt belongs to student
    const { data: attempt } = await this.supabase
      .from('test_attempts')
      .select('id')
      .eq('id', attemptId)
      .eq('student_id', studentId)
      .single();

    if (!attempt) throw new NotFoundException('Attempt not found');

    const { data: upsertedAnswer, error } = await this.supabase
      .from('test_answers')
      .upsert(
        {
          attempt_id: attemptId,
          question_id: questionId,
          text_answer: dto.textAnswer ?? null,
          time_spent_seconds: dto.timeSpentSeconds,
        },
        { onConflict: 'attempt_id,question_id' },
      )
      .select('id')
      .single();

    if (error) throw new BadRequestException(error.message);

    if (dto.selectedOptionIds?.length !== undefined) {
      await this.supabase
        .from('test_answer_options')
        .delete()
        .eq('test_answer_id', upsertedAnswer.id);

      if (dto.selectedOptionIds.length > 0) {
        await this.supabase.from('test_answer_options').insert(
          dto.selectedOptionIds.map((optId) => ({
            test_answer_id: upsertedAnswer.id,
            option_id: optId,
          })),
        );
      }
    }
  }

  // ── End student endpoints ──────────────────────────────────────────────────

  // ── Admin analytics endpoints ──────────────────────────────────────────────

  async getTestAttempts(testId: string) {
    await this.ensureTestExists(testId);

    const { data: test } = await this.supabase
      .from('tests')
      .select('passing_score_percent')
      .eq('id', testId)
      .single();

    const passingPct = test?.passing_score_percent ?? 60;

    const { data: attempts, error } = await this.supabase
      .from('test_attempts')
      .select('id, student_id, started_at, completed_at, score, max_score, time_spent_seconds, profiles(full_name, email)')
      .eq('test_id', testId)
      .order('started_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    return (attempts ?? []).map((a) => {
      const percentage =
        a.max_score && a.max_score > 0
          ? Math.round(((a.score ?? 0) / a.max_score) * 100)
          : null;
      const profile = a.profiles as { full_name?: string; email?: string } | null;
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

  /** All of the current student's test attempts across every course, most recent first. */
  async getMyAttempts(studentId: string) {
    const { data: attempts, error } = await this.supabase
      .from('test_attempts')
      .select(
        'id, started_at, completed_at, score, max_score, time_spent_seconds, test_id, tests(id, title, passing_score_percent, lesson_id, lessons(id, title, chapter_id, chapters(id, title, course_id, courses(id, title))))',
      )
      .eq('student_id', studentId)
      .order('started_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);

    return (attempts ?? []).map((a: any) => {
      const test = a.tests;
      const lesson = test?.lessons;
      const chapter = lesson?.chapters;
      const course = chapter?.courses;
      const passingPct = test?.passing_score_percent ?? 60;
      const percentage =
        a.max_score && a.max_score > 0
          ? Math.round(((a.score ?? 0) / a.max_score) * 100)
          : null;
      return {
        id: a.id,
        type: 'test' as const,
        testTitle: test?.title ?? 'Test',
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

  async getAttemptDetail(attemptId: string, studentId?: string) {
    const query = this.supabase
      .from('test_attempts')
      .select('*, tests(passing_score_percent), profiles(full_name, email)')
      .eq('id', attemptId);

    if (studentId) {
      query.eq('student_id', studentId);
    }

    const { data: attempt, error: attemptErr } = await query.single();

    if (attemptErr || !attempt) {
      if (studentId) {
        throw new ForbiddenException('Access denied');
      }
      throw new NotFoundException('Attempt not found');
    }

    const passingPct = (attempt.tests as { passing_score_percent?: number } | null)?.passing_score_percent ?? 60;
    const percentage =
      attempt.max_score && attempt.max_score > 0
        ? Math.round(((attempt.score ?? 0) / attempt.max_score) * 100)
        : null;

    const { data: answers, error: answersErr } = await this.supabase
      .from('test_answers')
      .select('id, question_id, text_answer, is_correct, time_spent_seconds')
      .eq('attempt_id', attemptId);

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

    const profile = attempt.profiles as { full_name?: string; email?: string } | null;

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

    return {
      id: attempt.id,
      test_id: attempt.test_id,
      student_id: attempt.student_id,
      student_name: profile?.full_name ?? null,
      student_email: profile?.email ?? null,
      started_at: attempt.started_at,
      completed_at: attempt.completed_at,
      score: attempt.score,
      max_score: attempt.max_score,
      time_spent_seconds: attempt.time_spent_seconds,
      percentage,
      passed: percentage !== null ? percentage >= passingPct : null,
      questionReview,
    };
  }

  async gradeAttemptAnswers(attemptId: string, grades: { questionId: string; isCorrect: boolean }[]) {
    for (const grade of grades) {
      await this.supabase
        .from('test_answers')
        .update({ is_correct: grade.isCorrect })
        .eq('attempt_id', attemptId)
        .eq('question_id', grade.questionId);
    }

    const { data: attempt } = await this.supabase
      .from('test_attempts')
      .select('test_id, student_id')
      .eq('id', attemptId)
      .single();

    if (!attempt) throw new NotFoundException('Attempt not found');

    const { data: test } = await this.supabase
      .from('tests')
      .select('id, lesson_id, passing_score_percent')
      .eq('id', attempt.test_id)
      .single();

    const { data: questions } = await this.supabase
      .from('questions')
      .select('id, points')
      .eq('test_id', attempt.test_id);

    const { data: answers } = await this.supabase
      .from('test_answers')
      .select('question_id, is_correct')
      .eq('attempt_id', attemptId);

    const pointsMap = new Map((questions ?? []).map((q) => [q.id, q.points ?? 1]));
    const maxScore = (questions ?? []).reduce((sum, q) => sum + (q.points ?? 1), 0);
    const totalScore = (answers ?? [])
      .filter((a) => a.is_correct === true)
      .reduce((sum, a) => sum + (pointsMap.get(a.question_id) ?? 1), 0);

    const { data: updatedAttempt } = await this.supabase
      .from('test_attempts')
      .update({ score: totalScore, max_score: maxScore })
      .eq('id', attemptId)
      .select()
      .single();

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passingPercent = test?.passing_score_percent ?? 60;

    if (test?.lesson_id) {
      await this.syncLessonCompletion(
        test.lesson_id,
        attempt.student_id,
        test.id,
        passingPercent,
      );
    }

    return { ...updatedAttempt, percentage, passed: percentage >= passingPercent };
  }

  /**
   * Manual grading can flip an attempt between pass and fail, so lesson progress and
   * course enrollment status must be recomputed from the student's best attempt.
   */
  private async syncLessonCompletion(
    lessonId: string,
    studentId: string,
    testId: string,
    passingPercent: number,
  ) {
    const { data: attempts } = await this.supabase
      .from('test_attempts')
      .select('score, max_score, completed_at')
      .eq('test_id', testId)
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

  async findAttemptForStudent(attemptId: string, studentId: string, role?: string) {
    const isAdmin = (role ?? '').toUpperCase() === 'ADMIN';
    if (isAdmin) {
      return this.getAttemptDetail(attemptId);
    }

    const { data: attempt, error } = await this.supabase
      .from('test_attempts')
      .select('id, student_id')
      .eq('id', attemptId)
      .single();

    if (error || !attempt || attempt.student_id !== studentId) {
      throw new ForbiddenException('Access denied');
    }

    return this.getAttemptDetail(attemptId);
  }

  // ── End admin analytics endpoints ──────────────────────────────────────────

  private async checkEnrollmentForLesson(lessonId: string, studentId: string) {
    const { data: lesson } = await this.supabase
      .from('lessons')
      .select('chapters(course_id)')
      .eq('id', lessonId)
      .single();

    const courseId = (lesson?.chapters as unknown as { course_id: string })
      ?.course_id;
    if (!courseId) throw new NotFoundException('Lesson not found');

    const { data: enrollment } = await this.supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .in('status', ['active', 'completed'])
      .maybeSingle();

    if (!enrollment) {
      throw new ForbiddenException(
        'Active enrollment required to access this test',
      );
    }
  }

  private async getStudentQuestionsWithOptions(testId: string) {
    const { data: questions, error } = await this.supabase
      .from('questions')
      .select('id, test_id, question_text, question_type, points, explanation, sort_order, question_number, topic')
      .eq('test_id', testId)
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

    return questions.map((q) => ({
      ...q,
      question_options: optionMap.get(q.id) ?? [],
    }));
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

  private async ensureTestExists(testId: string) {
    const { data, error } = await this.supabase
      .from('tests')
      .select('id')
      .eq('id', testId)
      .single();

    if (error || !data) throw new NotFoundException('Test not found');
    return data;
  }

  private async getNextSortOrder(testId: string) {
    const { count, error } = await this.supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('test_id', testId);

    if (error) throw new BadRequestException(error.message);
    return (count ?? 0) + 1;
  }

  private async getQuestionsWithOptions(testId: string) {
    const { data: questions, error } = await this.supabase
      .from('questions')
      .select('*')
      .eq('test_id', testId)
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

  private ensureQuestionBelongsToTest(question: QuestionRow) {
    if (!question.test_id) throw new NotFoundException('Question not found');
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
    testId: string,
    offsets: { questionNumberOffset: number; sortOrderOffset: number },
  ) {
    const insertedQuestions: Array<QuestionRow & { question_options: unknown[] }> =
      [];

    for (const [index, question] of questions.entries()) {
      const { data: insertedQuestion, error } = await this.supabase
        .from('questions')
        .insert({
          test_id: testId,
          assignment_id: null,
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
