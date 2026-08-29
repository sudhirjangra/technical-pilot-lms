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
      .eq('status', 'active')
      .single();
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
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /** Get all progress for a student in a course */
  async getCourseProgress(courseId: string, studentId: string) {
    // Get all lessons for the course
    const { data: chapters } = await this.supabase
      .from('chapters')
      .select(
        'id, title, description, sort_order, is_published, lessons(id, title, sort_order, lesson_type, is_published, assignments(id, due_days_after_start))',
      )
      .eq('course_id', courseId)
      .eq('is_published', true)
      .eq('lessons.is_published', true)
      .order('sort_order', { ascending: true })
      .order('sort_order', { referencedTable: 'lessons', ascending: true });

    if (!chapters) return { chapters: [], overall_percent: 0 };

    // chapter_starts anchors every assignment due date inside the chapter.
    const { data: chapterStarts } = await this.supabase
      .from('chapter_starts')
      .select('chapter_id, started_at')
      .eq('student_id', studentId)
      .in(
        'chapter_id',
        chapters.map((ch: { id: string }) => ch.id),
      );

    const startedAtMap = new Map<string, string>(
      (chapterStarts ?? []).map(
        (row: { chapter_id: string; started_at: string }) => [
          row.chapter_id,
          row.started_at,
        ],
      ),
    );

    const lessonIds = chapters.flatMap((ch: { lessons: { id: string }[] }) =>
      ch.lessons.map((l) => l.id),
    );

    if (lessonIds.length === 0)
      return {
        chapters: chapters.map((ch: { id: string }) => ({
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

    const videoLessons = chapters.flatMap(
      (ch: { lessons: { id: string; lesson_type: string }[] }) =>
        ch.lessons.filter((lesson) => lesson.lesson_type === 'video'),
    );
    const videoProgress = videoLessons.map((lesson) => {
      const progress = progressMap.get(lesson.id) as
        | { progress_percent?: number; status?: string }
        | undefined;
      return progress?.status === 'completed'
        ? 100
        : Math.min(100, Math.max(0, progress?.progress_percent ?? 0));
    });
    const overallPercent = videoProgress.length
      ? Math.round(
          videoProgress.reduce((sum, value) => sum + value, 0) /
            videoProgress.length,
        )
      : 0;
    const overallStatus =
      overallPercent === 100
        ? 'completed'
        : overallPercent > 0
          ? 'in_progress'
          : 'not_started';

    const enrichedChapters = chapters.map(
      (ch: {
        id: string;
        lessons: {
          id: string;
          lesson_type?: string;
          assignments?: unknown;
        }[];
      }) => {
        const startedAt = startedAtMap.get(ch.id) ?? null;
        return {
          ...ch,
          started_at: startedAt,
          lessons: ch.lessons.map((l) => ({
            ...l,
            progress: progressMap.get(l.id) ?? null,
            due_at: this.computeDueAt(startedAt, l.assignments),
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
