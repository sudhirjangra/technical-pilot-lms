import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateProgressDto, UpdateProgressDto } from './dto';

@Injectable()
export class ProgressService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  /** Initialize or get progress for a lesson — verifies enrollment first */
  async initOrGet(dto: CreateProgressDto, studentId: string) {
    // Verify enrollment: get the course via lesson → chapter → course
    const { data: lesson, error: lessonErr } = await this.supabase
      .from('lessons')
      .select('id, chapters(course_id)')
      .eq('id', dto.lesson_id)
      .single();
    if (lessonErr || !lesson) throw new NotFoundException('Lesson not found');

    const courseId = (lesson.chapters as unknown as { course_id: string })
      .course_id;

    const { data: enrollment } = await this.supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .in('status', ['active', 'completed'])
      .maybeSingle();
    if (!enrollment)
      throw new ForbiddenException(
        'Active enrollment required to access this content',
      );

    // Upsert progress record
    const { data, error } = await this.supabase
      .from('progress')
      .upsert(
        {
          student_id: studentId,
          lesson_id: dto.lesson_id,
          status: 'not_started',
        },
        { onConflict: 'student_id,lesson_id', ignoreDuplicates: true },
      )
      .select('*')
      .single();

    if (error) {
      // If upsert ignored duplicate, fetch existing
      const { data: existing } = await this.supabase
        .from('progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('lesson_id', dto.lesson_id)
        .single();
      return existing;
    }
    return data;
  }

  /** Get progress for a single lesson (returns null if not started) */
  async getByLesson(lessonId: string, studentId: string) {
    const { data } = await this.supabase
      .from('progress')
      .select('last_position_seconds, progress_percent, status')
      .eq('lesson_id', lessonId)
      .eq('student_id', studentId)
      .maybeSingle();
    return data;
  }

  /** Upsert progress — creates record on first save, updates on subsequent saves */
  async update(lessonId: string, studentId: string, dto: UpdateProgressDto) {
    // If incoming is not a completion, check if already completed — if so, only update last watched position
    if (dto.status !== 'completed') {
      const existing = await this.getByLesson(lessonId, studentId);
      if (existing?.status === 'completed') {
        if (dto.last_position_seconds !== undefined) {
          const { data, error } = await this.supabase
            .from('progress')
            .update({ last_position_seconds: dto.last_position_seconds })
            .eq('student_id', studentId)
            .eq('lesson_id', lessonId)
            .select('*')
            .single();
          if (error) throw new BadRequestException(error.message);
          return data;
        }
        return existing;
      }
    }

    const payload: Record<string, unknown> = {
      student_id: studentId,
      lesson_id: lessonId,
      ...dto,
    };
    if (dto.status === 'completed') {
      payload.completed_at = new Date().toISOString();
      payload.progress_percent = 100;
    }

    const { data, error } = await this.supabase
      .from('progress')
      .upsert(payload, { onConflict: 'student_id,lesson_id' })
      .select('*')
      .single();
    if (error) throw new BadRequestException('Failed to update progress');

    if (dto.status === 'completed') {
      this.checkAndUpdateEnrollmentCompletion(lessonId, studentId).catch(() => {});
    }

    return data;
  }

  private async checkAndUpdateEnrollmentCompletion(lessonId: string, studentId: string) {
    const { data: lesson } = await this.supabase
      .from('lessons')
      .select('id, chapters(course_id)')
      .eq('id', lessonId)
      .single();
    if (!lesson) return;

    const courseId = (lesson.chapters as unknown as { course_id: string }).course_id;

    const { data: chapters } = await this.supabase
      .from('chapters')
      .select('id, is_published, lessons(id, is_published)')
      .eq('course_id', courseId)
      .eq('is_published', true);

    const allLessonIds = (chapters ?? []).flatMap((ch: any) =>
      ((ch.lessons ?? []) as any[])
        .filter((l: any) => l.is_published !== false)
        .map((l: any) => l.id),
    );

    if (allLessonIds.length === 0) return;

    const { data: progressRows } = await this.supabase
      .from('progress')
      .select('lesson_id, status')
      .eq('student_id', studentId)
      .in('lesson_id', allLessonIds);

    const completedCount = (progressRows ?? []).filter(
      (p: any) => p.status === 'completed',
    ).length;

    if (completedCount >= allLessonIds.length) {
      await this.supabase
        .from('enrollments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .eq('status', 'active');
    } else {
      const overallStatus = completedCount > 0 ? 'active' : 'active';
      const { data: enrollment } = await this.supabase
        .from('enrollments')
        .select('status')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .single();
      if (enrollment?.status === 'completed' && completedCount < allLessonIds.length) {
        await this.supabase
          .from('enrollments')
          .update({ status: 'active', completed_at: null })
          .eq('student_id', studentId)
          .eq('course_id', courseId);
      }
    }
  }

  /** Get all progress for a student in a course */
  async getCourseProgress(courseId: string, studentId: string) {
    // Get all lessons for the course. Note: nested-table dot filters (e.g. "lessons.is_published")
    // are not reliably applied by PostgREST without an `!inner` join hint, and silently return
    // no matching rows in some client versions — so publish filtering for lessons is done in JS below.
    const { data: chapters, error: chaptersError } = await this.supabase
      .from('chapters')
      .select(
        'id, title, description, sort_order, is_published, lessons(id, title, sort_order, lesson_type, is_published, assignments(id, title, due_days_after_start, max_attempts, passing_score_percent), tests(id, title, passing_score_percent, max_attempts))',
      )
      .eq('course_id', courseId)
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('sort_order', { referencedTable: 'lessons', ascending: true });
    if (chaptersError) throw new BadRequestException(chaptersError.message);

    // Filter out unpublished chapters in JS (belt-and-suspenders; PostgREST nested filter quirk)
    const visibleChapters = (chapters ?? []).filter(
      (ch: { is_published?: boolean }) => ch.is_published !== false,
    );

    if (!visibleChapters.length) return { chapters: [], overall_percent: 0 };

    // chapter_starts anchors every assignment due date inside the chapter.
    const { data: chapterStarts } = await this.supabase
      .from('chapter_starts')
      .select('chapter_id, started_at')
      .eq('student_id', studentId)
      .in(
        'chapter_id',
        visibleChapters.map((ch: { id: string }) => ch.id),
      );

    const startedAtMap = new Map<string, string>(
      (chapterStarts ?? []).map(
        (row: { chapter_id: string; started_at: string }) => [
          row.chapter_id,
          row.started_at,
        ],
      ),
    );

    const lessonIds = visibleChapters.flatMap(
      (ch: { lessons: { id: string; is_published?: boolean }[] }) =>
        ch.lessons
          .filter((l) => l.is_published !== false)
          .map((l) => l.id),
    );

    if (lessonIds.length === 0)
      return {
        chapters: visibleChapters.map((ch: { id: string }) => ({
          ...ch,
          started_at: startedAtMap.get(ch.id) ?? null,
        })),
        overall_percent: 0,
      };

    const { data: progressRecords } = await this.supabase
      .from('progress')
      .select('*')
      .eq('student_id', studentId)
      .in('lesson_id', lessonIds);

    const progressMap = new Map(
      (progressRecords ?? []).map((p: { lesson_id: string }) => [
        p.lesson_id,
        p,
      ]),
    );

    // Calculate chapter-level completion, then overall course completion
    const chapterProgress = visibleChapters.map((ch: { lessons: { id: string; lesson_type: string; is_published?: boolean }[] }) => {
      const publishedLessons = (ch.lessons ?? []).filter((l) => l.is_published !== false);
      if (publishedLessons.length === 0) return 0;

      const lessonProgresses = publishedLessons.map((lesson) => {
        const progress = progressMap.get(lesson.id) as
          | { progress_percent?: number; status?: string }
          | undefined;
        if (lesson.lesson_type === 'assignment' || lesson.lesson_type === 'test') {
          return progress?.status === 'completed' ? 100 : 0;
        }
        return progress?.status === 'completed'
          ? 100
          : Math.min(100, Math.max(0, progress?.progress_percent ?? 0));
      });

      return lessonProgresses.length
        ? Math.round(lessonProgresses.reduce((sum, val) => sum + val, 0) / lessonProgresses.length)
        : 0;
    });

    // Overall course percent is the average of all chapter percents
    const overallPercent = chapterProgress.length
      ? Math.round(chapterProgress.reduce((sum, val) => sum + val, 0) / chapterProgress.length)
      : 0;
    const overallStatus =
      overallPercent === 100
        ? 'completed'
        : overallPercent > 0
          ? 'in_progress'
          : 'not_started';

    const assessmentMap = await this.buildAssessmentStatuses(
      visibleChapters,
      studentId,
    );

    const enrichedChapters = visibleChapters.map(
      (ch: {
        id: string;
        lessons: {
          id: string;
          lesson_type?: string;
          assignments?: unknown;
          is_published?: boolean;
        }[];
      }) => {
        const startedAt = startedAtMap.get(ch.id) ?? null;
        return {
          ...ch,
          started_at: startedAt,
          lessons: ch.lessons
            .filter((l) => l.is_published !== false)
            .map((l) => ({
              ...l,
              progress: progressMap.get(l.id) ?? null,
              due_at: this.computeDueAt(startedAt, l.assignments),
              assessment: assessmentMap.get(l.id) ?? null,
            })),
        };
      },
    );

    return {
      chapters: enrichedChapters,
      overall_percent: overallPercent,
      overall_status: overallStatus,
    };
  }

  /**
   * Per-assessment attempt summary so the UI can distinguish "not started" from
   * "failed every attempt" and offer an extra-attempt request when exhausted.
   */
  private async buildAssessmentStatuses(
    chapters: {
      id: string;
      lessons?: {
        id: string;
        lesson_type?: string;
        assignments?: unknown;
        tests?: unknown;
        is_published?: boolean;
      }[];
    }[],
    studentId: string,
  ) {
    type Meta = {
      id: string;
      max_attempts?: number | null;
      passing_score_percent?: number | null;
    };
    const first = (value: unknown): Meta | null => {
      if (Array.isArray(value)) return (value[0] as Meta) ?? null;
      return (value as Meta) ?? null;
    };

    const assignmentLessons = new Map<string, { lessonId: string; chapterId: string; meta: Meta }>();
    const testLessons = new Map<string, { lessonId: string; chapterId: string; meta: Meta }>();

    for (const chapter of chapters) {
      for (const lesson of chapter.lessons ?? []) {
        if (lesson.is_published === false) continue;
        if (lesson.lesson_type === 'assignment') {
          const meta = first(lesson.assignments);
          if (meta?.id) assignmentLessons.set(meta.id, { lessonId: lesson.id, chapterId: chapter.id, meta });
        } else if (lesson.lesson_type === 'test') {
          const meta = first(lesson.tests);
          if (meta?.id) testLessons.set(meta.id, { lessonId: lesson.id, chapterId: chapter.id, meta });
        }
      }
    }

    const assignmentIds = [...assignmentLessons.keys()];
    const testIds = [...testLessons.keys()];

    const [assignmentAttempts, testAttempts, grants] = await Promise.all([
      assignmentIds.length
        ? this.supabase
            .from('assignment_attempts')
            .select('assignment_id, score, max_score, completed_at')
            .eq('student_id', studentId)
            .in('assignment_id', assignmentIds)
        : Promise.resolve({ data: [] }),
      testIds.length
        ? this.supabase
            .from('test_attempts')
            .select('test_id, score, max_score, completed_at')
            .eq('student_id', studentId)
            .in('test_id', testIds)
        : Promise.resolve({ data: [] }),
      assignmentIds.length
        ? this.supabase
            .from('assessment_attempt_grants')
            .select('assignment_id, extra_attempts')
            .eq('student_id', studentId)
            .in('assignment_id', assignmentIds)
        : Promise.resolve({ data: [] }),
    ]);

    const grantMap = new Map<string, number>();
    for (const g of ((grants as { data?: unknown[] }).data ?? []) as {
      assignment_id: string;
      extra_attempts: number;
    }[]) {
      grantMap.set(g.assignment_id, g.extra_attempts ?? 0);
    }

    const result = new Map<string, unknown>();

    type AttemptRow = {
      score: number | null;
      max_score: number | null;
      completed_at: string | null;
    };

    const summarize = (
      kind: 'assignment' | 'test',
      entries: Map<string, { lessonId: string; chapterId: string; meta: Meta }>,
      attemptsById: Map<string, AttemptRow[]>,
    ) => {
      for (const [id, entry] of entries) {
        const attempts = attemptsById.get(id) ?? [];
        const completed = attempts.filter((a) => a.completed_at);
        const passingPct = entry.meta.passing_score_percent ?? 60;
        const passed = completed.some((a) => {
          const pct = a.max_score && a.max_score > 0 ? ((a.score ?? 0) / a.max_score) * 100 : 0;
          return pct >= passingPct;
        });
        const baseMax = entry.meta.max_attempts ?? null;
        const maxAttempts = baseMax === null ? null : baseMax + (grantMap.get(id) ?? 0);
        const attemptsUsed = attempts.length;
        const exhausted = maxAttempts !== null && attemptsUsed >= maxAttempts;

        result.set(entry.lessonId, {
          kind,
          assessment_id: id,
          chapter_id: entry.chapterId,
          attempts_used: attemptsUsed,
          max_attempts: maxAttempts,
          passed,
          exhausted,
          failed: exhausted && !passed && completed.length > 0,
        });
      }
    };

    const groupBy = (rows: Record<string, unknown>[], key: string) => {
      const map = new Map<string, AttemptRow[]>();
      for (const row of rows) {
        const id = row[key] as string;
        const list = map.get(id) ?? [];
        list.push(row as unknown as AttemptRow);
        map.set(id, list);
      }
      return map;
    };

    summarize(
      'assignment',
      assignmentLessons,
      groupBy(
        ((assignmentAttempts as { data?: unknown[] }).data ?? []) as Record<string, unknown>[],
        'assignment_id',
      ),
    );
    summarize(
      'test',
      testLessons,
      groupBy(
        ((testAttempts as { data?: unknown[] }).data ?? []) as Record<string, unknown>[],
        'test_id',
      ),
    );

    return result;
  }

  /**
   * Assignment due date = chapter start + due_days_after_start days.
   * Null when the chapter was never started or the assignment has no due window.
   */
  private computeDueAt(
    startedAt: string | null,
    assignments: unknown,
  ): string | null {
    if (!startedAt) return null;

    const assignment = Array.isArray(assignments)
      ? (assignments[0] as { due_days_after_start?: number | null } | undefined)
      : (assignments as { due_days_after_start?: number | null } | null);

    const dueDays = assignment?.due_days_after_start;
    if (dueDays === null || dueDays === undefined) return null;

    const due = new Date(startedAt);
    due.setUTCDate(due.getUTCDate() + dueDays);
    return due.toISOString();
  }

  /** Admin: get progress summary for a student */
  async getStudentProgress(studentId: string) {
    const { data, error } = await this.supabase
      .from('progress')
      .select('*, lessons(id, title, chapters(course_id, courses(id, title)))')
      .eq('student_id', studentId)
      .order('updated_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
