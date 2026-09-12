import {
  MongoAttemptDocument,
  MongoService,
  QuestionReviewItem,
  QuestionReviewOption,
  TopicBreakdownItem,
} from '@/common/modules/mongodb.service';
import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

export interface MigrationSummary {
  totalEvaluated: number;
  migratedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: Array<{ attemptId: string; assessmentType: string; error: string }>;
}

@Injectable()
export class AttemptMigrationService {
  private readonly logger = new Logger(AttemptMigrationService.name);

  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly mongoService: MongoService,
  ) {}

  /**
   * Pure mapping function that builds a complete, robust MongoAttemptDocument
   * from Supabase relational attempt data with fallbacks for missing/corrupted historical fields.
   */
  mapSupabaseAttemptToMongoDoc(params: {
    attempt: Record<string, any>;
    assessmentType: 'assignment' | 'test';
    assessment?: Record<string, any> | null;
    profile?: { full_name?: string | null; email?: string | null } | null;
    answers?: Array<Record<string, any>>;
    answerOptions?: Array<Record<string, any>>;
    questions?: Array<Record<string, any>>;
    allOptions?: Array<Record<string, any>>;
    attemptNumber?: number;
  }): Omit<MongoAttemptDocument, 'created_at' | 'updated_at'> {
    const {
      attempt,
      assessmentType,
      assessment,
      profile,
      answers = [],
      answerOptions = [],
      questions = [],
      allOptions = [],
      attemptNumber = 1,
    } = params;

    const assessmentId =
      assessmentType === 'assignment'
        ? attempt.assignment_id || assessment?.id || ''
        : attempt.test_id || assessment?.id || '';

    const passingPct = assessment?.passing_score_percent ?? 60;
    const lesson = assessment?.lessons;
    const chapter = lesson?.chapters;
    const course = chapter?.courses;

    // Build option lookups
    const optionTextMap = new Map<string, string>();
    const correctOptionsMap = new Map<string, string[]>();
    const optionsByQuestion = new Map<string, QuestionReviewOption[]>();

    for (const opt of allOptions) {
      optionTextMap.set(opt.id, opt.option_text ?? '');
      if (opt.is_correct) {
        const current = correctOptionsMap.get(opt.question_id) ?? [];
        current.push(opt.id);
        correctOptionsMap.set(opt.question_id, current);
      }
      const list = optionsByQuestion.get(opt.question_id) ?? [];
      list.push({
        id: opt.id,
        text: opt.option_text ?? '',
        isCorrect: Boolean(opt.is_correct),
      });
      optionsByQuestion.set(opt.question_id, list);
    }

    // Build answer options mapping
    const selectedOptionsMap = new Map<string, string[]>();
    for (const ao of answerOptions) {
      const answerId = ao.assignment_answer_id || ao.test_answer_id;
      if (answerId) {
        const current = selectedOptionsMap.get(answerId) ?? [];
        current.push(ao.option_id);
        selectedOptionsMap.set(answerId, current);
      }
    }

    // Map questions review
    const questionReview: QuestionReviewItem[] = [];
    const questionIdsSeen = new Set<string>();

    for (const q of questions) {
      questionIdsSeen.add(q.id);
      const answer = answers.find((a) => a.question_id === q.id);
      const selectedOptionIds = answer
        ? (selectedOptionsMap.get(answer.id) ?? [])
        : [];
      const correctOptionIds = correctOptionsMap.get(q.id) ?? [];
      const selectedSet = new Set(selectedOptionIds);
      const qOptions = (optionsByQuestion.get(q.id) ?? []).map((opt) => ({
        ...opt,
        isSelected: selectedSet.has(opt.id),
      }));

      const points =
        q.points !== null && q.points !== undefined ? Number(q.points) : 1;
      const pointsEarned = answer?.is_correct === true ? points : 0;

      questionReview.push({
        questionId: q.id,
        questionText: q.question_text || 'Assessment Question',
        questionType: q.question_type || 'mcq',
        topic: q.topic ?? null,
        questionCategory: (q as any).question_category || 'reasoning',
        questionDifficulty: (q as any).question_difficulty || 'medium',
        subtopic: (q as any).subtopic || null,
        isCorrect: answer?.is_correct ?? null,
        timeSpentSeconds: Number(answer?.time_spent_seconds) || 0,
        points,
        pointsEarned,
        explanation: q.explanation ?? null,
        correctOptionIds,
        selectedOptionIds,
        correctOptionTexts: correctOptionIds.map(
          (id) => optionTextMap.get(id) || id,
        ),
        selectedOptionTexts: selectedOptionIds.map(
          (id) => optionTextMap.get(id) || id,
        ),
        options: qOptions,
        textAnswer: answer?.text_answer ?? null,
      });
    }

    // Handle historical answers for questions that might have been deleted from Supabase
    for (const answer of answers) {
      if (!questionIdsSeen.has(answer.question_id)) {
        const selectedOptionIds = selectedOptionsMap.get(answer.id) ?? [];
        const isCorrect = answer.is_correct ?? null;
        const points = 1;
        const pointsEarned = isCorrect === true ? points : 0;

        questionReview.push({
          questionId: answer.question_id,
          questionText: 'Question (Archived)',
          questionType: answer.text_answer ? 'text' : 'mcq',
          topic: 'Archived',
          isCorrect,
          timeSpentSeconds: Number(answer.time_spent_seconds) || 0,
          points,
          pointsEarned,
          explanation: null,
          correctOptionIds: [],
          selectedOptionIds,
          correctOptionTexts: [],
          selectedOptionTexts: selectedOptionIds.map(
            (id) => optionTextMap.get(id) || id,
          ),
          options: selectedOptionIds.map((id) => ({
            id,
            text: optionTextMap.get(id) || 'Option (Archived)',
            isCorrect: isCorrect === true,
            isSelected: true,
          })),
          textAnswer: answer.text_answer ?? null,
        });
      }
    }

    // Build topic breakdown
    const topicMap = new Map<
      string,
      {
        total: number;
        correct: number;
        totalTime: number;
        points: number;
        earnedPoints: number;
      }
    >();

    for (const item of questionReview) {
      const topic = item.topic || 'General';
      const current = topicMap.get(topic) ?? {
        total: 0,
        correct: 0,
        totalTime: 0,
        points: 0,
        earnedPoints: 0,
      };
      current.total += 1;
      if (item.isCorrect === true) current.correct += 1;
      current.totalTime += item.timeSpentSeconds;
      current.points += item.points;
      current.earnedPoints += item.pointsEarned;
      topicMap.set(topic, current);
    }

    const topicBreakdown: TopicBreakdownItem[] = Array.from(
      topicMap.entries(),
    ).map(([topic, stats]) => ({ topic, ...stats }));

    const categoryMap = new Map<
      string,
      {
        total: number;
        correct: number;
        totalTime: number;
        points: number;
        earnedPoints: number;
      }
    >();
    const difficultyMap = new Map<
      string,
      {
        total: number;
        correct: number;
        totalTime: number;
        points: number;
        earnedPoints: number;
      }
    >();

    for (const item of questionReview) {
      const cat = item.questionCategory || 'reasoning';
      const diff = item.questionDifficulty || 'medium';

      const curCat = categoryMap.get(cat) ?? {
        total: 0,
        correct: 0,
        totalTime: 0,
        points: 0,
        earnedPoints: 0,
      };
      const curDiff = difficultyMap.get(diff) ?? {
        total: 0,
        correct: 0,
        totalTime: 0,
        points: 0,
        earnedPoints: 0,
      };

      curCat.total += 1;
      curDiff.total += 1;
      if (item.isCorrect === true) {
        curCat.correct += 1;
        curDiff.correct += 1;
      }
      curCat.totalTime += item.timeSpentSeconds;
      curDiff.totalTime += item.timeSpentSeconds;
      curCat.points += item.points;
      curDiff.points += item.points;
      curCat.earnedPoints += item.pointsEarned;
      curDiff.earnedPoints += item.pointsEarned;

      categoryMap.set(cat, curCat);
      difficultyMap.set(diff, curDiff);
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(
      ([category, stats]) => ({ category, ...stats }),
    );
    const difficultyBreakdown = Array.from(difficultyMap.entries()).map(
      ([difficulty, stats]) => ({ difficulty, ...stats }),
    );

    const totalCount = questionReview.length;
    const correctCount = questionReview.filter(
      (q) => q.isCorrect === true,
    ).length;
    const calculatedMaxScore = questionReview.reduce(
      (acc, q) => acc + q.points,
      0,
    );
    const maxScore =
      attempt.max_score !== null &&
      attempt.max_score !== undefined &&
      attempt.max_score > 0
        ? Number(attempt.max_score)
        : calculatedMaxScore;

    const calculatedScore = questionReview.reduce(
      (acc, q) => acc + q.pointsEarned,
      0,
    );
    // Prefer the larger of Supabase and calculated scores to avoid stale 0 from un-graded submissions
    const supabaseScore =
      attempt.score !== null && attempt.score !== undefined
        ? Number(attempt.score)
        : 0;
    const score = Math.max(supabaseScore, calculatedScore);

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = percentage >= passingPct;

    const startedAt =
      attempt.started_at || attempt.created_at || new Date().toISOString();
    const completedAt = attempt.completed_at || attempt.updated_at || startedAt;

    let timeSpentSeconds = Number(attempt.time_spent_seconds) || 0;
    if (timeSpentSeconds <= 0 && startedAt && completedAt) {
      const diff = Math.round(
        (new Date(completedAt).getTime() - new Date(startedAt).getTime()) /
          1000,
      );
      timeSpentSeconds =
        diff > 0
          ? diff
          : questionReview.reduce((acc, q) => acc + q.timeSpentSeconds, 0);
    }

    const avgTimePerQuestion =
      totalCount > 0 ? Math.round(timeSpentSeconds / totalCount) : 0;

    return {
      attempt_id: attempt.id,
      assessment_type: assessmentType,
      student_id: attempt.student_id,
      student_name: profile?.full_name ?? null,
      student_email: profile?.email ?? null,
      course_id: course?.id ?? null,
      course_title: course?.title ?? null,
      lesson_id: assessment?.lesson_id ?? lesson?.id ?? null,
      assessment_id: assessmentId,
      assessment_title: assessment?.title ?? null,
      attempt_number: attemptNumber,
      started_at: startedAt,
      completed_at: completedAt,
      submitted_at: completedAt,
      score,
      max_score: maxScore,
      percentage,
      passed,
      time_spent_seconds: timeSpentSeconds,
      correct_count: correctCount,
      total_count: totalCount,
      avg_time_per_question: avgTimePerQuestion,
      topic_breakdown: topicBreakdown,
      category_breakdown: categoryBreakdown,
      difficulty_breakdown: difficultyBreakdown,
      question_review: questionReview,
    };
  }

  /**
   * Migrate a single assignment attempt from Supabase to MongoDB.
   */
  async migrateSingleAssignmentAttempt(attemptId: string): Promise<boolean> {
    try {
      const { data: attempt, error: attemptErr } = await this.supabase
        .from('assignment_attempts')
        .select(
          '*, assignments(id, title, passing_score_percent, lesson_id, lessons(id, title, chapter_id, chapters(id, title, course_id, courses(id, title))))',
        )
        .eq('id', attemptId)
        .maybeSingle();

      if (attemptErr || !attempt) {
        this.logger.warn(
          `Assignment attempt ${attemptId} not found in Supabase`,
        );
        return false;
      }

      // Fetch student profile
      let profile: { full_name?: string; email?: string } | null = null;
      if (attempt.student_id) {
        const { data: profileData } = await this.supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', attempt.student_id)
          .maybeSingle();
        profile = profileData ?? null;
      }

      // Fetch answers and answer options
      const { data: answers } = await this.supabase
        .from('assignment_answers')
        .select('id, question_id, text_answer, is_correct, time_spent_seconds')
        .eq('attempt_id', attemptId);

      const answerIds = (answers ?? []).map((a) => a.id);
      const { data: answerOptions } = await this.supabase
        .from('assignment_answer_options')
        .select('assignment_answer_id, option_id')
        .in(
          'assignment_answer_id',
          answerIds.length > 0
            ? answerIds
            : ['00000000-0000-0000-0000-000000000000'],
        );

      // Fetch questions and question options
      const { data: questions } = await this.supabase
        .from('questions')
        .select(
          'id, question_type, points, explanation, topic, question_text, question_category, question_difficulty, subtopic',
        )
        .eq('assignment_id', attempt.assignment_id);

      const questionIds = (questions ?? []).map((q) => q.id);
      const { data: allOptions } = await this.supabase
        .from('question_options')
        .select('id, question_id, option_text, is_correct')
        .in(
          'question_id',
          questionIds.length > 0
            ? questionIds
            : ['00000000-0000-0000-0000-000000000000'],
        );

      const doc = this.mapSupabaseAttemptToMongoDoc({
        attempt,
        assessmentType: 'assignment',
        assessment: attempt.assignments,
        profile,
        answers: answers ?? [],
        answerOptions: answerOptions ?? [],
        questions: questions ?? [],
        allOptions: allOptions ?? [],
      });

      await this.mongoService.saveAttempt(doc);
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to migrate assignment attempt ${attemptId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  /**
   * Migrate a single test attempt from Supabase to MongoDB.
   */
  async migrateSingleTestAttempt(attemptId: string): Promise<boolean> {
    try {
      const { data: attempt, error: attemptErr } = await this.supabase
        .from('test_attempts')
        .select(
          '*, tests(id, title, passing_score_percent, lesson_id, lessons(id, title, chapter_id, chapters(id, title, course_id, courses(id, title))))',
        )
        .eq('id', attemptId)
        .maybeSingle();

      if (attemptErr || !attempt) {
        this.logger.warn(`Test attempt ${attemptId} not found in Supabase`);
        return false;
      }

      // Fetch student profile
      let profile: { full_name?: string; email?: string } | null = null;
      if (attempt.student_id) {
        const { data: profileData } = await this.supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', attempt.student_id)
          .maybeSingle();
        profile = profileData ?? null;
      }

      // Fetch answers and answer options
      const { data: answers } = await this.supabase
        .from('test_answers')
        .select('id, question_id, text_answer, is_correct, time_spent_seconds')
        .eq('attempt_id', attemptId);

      const answerIds = (answers ?? []).map((a) => a.id);
      const { data: answerOptions } = await this.supabase
        .from('test_answer_options')
        .select('test_answer_id, option_id')
        .in(
          'test_answer_id',
          answerIds.length > 0
            ? answerIds
            : ['00000000-0000-0000-0000-000000000000'],
        );

      // Fetch questions and question options
      const { data: questions } = await this.supabase
        .from('questions')
        .select(
          'id, question_type, points, explanation, topic, question_text, question_category, question_difficulty, subtopic',
        )
        .eq('test_id', attempt.test_id);

      const questionIds = (questions ?? []).map((q) => q.id);
      const { data: allOptions } = await this.supabase
        .from('question_options')
        .select('id, question_id, option_text, is_correct')
        .in(
          'question_id',
          questionIds.length > 0
            ? questionIds
            : ['00000000-0000-0000-0000-000000000000'],
        );

      const doc = this.mapSupabaseAttemptToMongoDoc({
        attempt,
        assessmentType: 'test',
        assessment: attempt.tests,
        profile,
        answers: answers ?? [],
        answerOptions: answerOptions ?? [],
        questions: questions ?? [],
        allOptions: allOptions ?? [],
      });

      await this.mongoService.saveAttempt(doc);
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to migrate test attempt ${attemptId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  /**
   * Batch migrates all legacy completed attempts from Supabase to MongoDB.
   */
  async migrateAllAttempts(options?: {
    assessmentType?: 'assignment' | 'test';
    limit?: number;
    offset?: number;
  }): Promise<MigrationSummary> {
    const summary: MigrationSummary = {
      totalEvaluated: 0,
      migratedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
    };

    const type = options?.assessmentType;
    const limit = options?.limit ?? 1000;
    const offset = options?.offset ?? 0;

    if (!type || type === 'assignment') {
      const { data: assignmentAttempts, error: aErr } = await this.supabase
        .from('assignment_attempts')
        .select('id, completed_at')
        .not('completed_at', 'is', null)
        .range(offset, offset + limit - 1);

      if (aErr) {
        this.logger.error(
          `Error querying assignment_attempts for migration: ${aErr.message}`,
        );
      } else {
        for (const a of assignmentAttempts ?? []) {
          summary.totalEvaluated += 1;
          try {
            const success = await this.migrateSingleAssignmentAttempt(a.id);
            if (success) {
              summary.migratedCount += 1;
            } else {
              summary.skippedCount += 1;
            }
          } catch (err) {
            summary.failedCount += 1;
            summary.errors.push({
              attemptId: a.id,
              assessmentType: 'assignment',
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }
    }

    if (!type || type === 'test') {
      const { data: testAttempts, error: tErr } = await this.supabase
        .from('test_attempts')
        .select('id, completed_at')
        .not('completed_at', 'is', null)
        .range(offset, offset + limit - 1);

      if (tErr) {
        this.logger.error(
          `Error querying test_attempts for migration: ${tErr.message}`,
        );
      } else {
        for (const t of testAttempts ?? []) {
          summary.totalEvaluated += 1;
          try {
            const success = await this.migrateSingleTestAttempt(t.id);
            if (success) {
              summary.migratedCount += 1;
            } else {
              summary.skippedCount += 1;
            }
          } catch (err) {
            summary.failedCount += 1;
            summary.errors.push({
              attemptId: t.id,
              assessmentType: 'test',
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }
    }

    this.logger.log(
      `Migration completed. Evaluated: ${summary.totalEvaluated}, Migrated: ${summary.migratedCount}, Skipped: ${summary.skippedCount}, Failed: ${summary.failedCount}`,
    );

    return summary;
  }
}
