import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { LessonsService } from '../lessons/lessons.service';
import { CreateChapterDto, UpdateChapterDto } from './dto';

// Lessons must be returned with every column the admin UI validates against
// (chapter_id, description, duration_seconds), otherwise the frontend Zod
// schema rejects the payload and renders an empty chapter list.
const CHAPTER_WITH_LESSONS_SELECT = '*, lessons(*)';

@Injectable()
export class ChaptersService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly lessonsService: LessonsService,
  ) {}

  async create(dto: CreateChapterDto) {
    // Verify course exists
    const { error: courseErr } = await this.supabase
      .from('courses')
      .select('id')
      .eq('id', dto.course_id)
      .single();
    if (courseErr) throw new NotFoundException('Course not found');

    // Auto-assign sort_order if not provided
    if (dto.sort_order === undefined) {
      const { count } = await this.supabase
        .from('chapters')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', dto.course_id);
      dto.sort_order = (count ?? 0) + 1;
    }

    const { data, error } = await this.supabase
      .from('chapters')
      .insert(dto)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findByCourse(courseId: string) {
    const { data, error } = await this.supabase
      .from('chapters')
      .select(CHAPTER_WITH_LESSONS_SELECT)
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true })
      .order('sort_order', { referencedTable: 'lessons', ascending: true });
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('chapters')
      .select(CHAPTER_WITH_LESSONS_SELECT)
      .eq('id', id)
      .order('sort_order', { referencedTable: 'lessons', ascending: true })
      .single();
    if (error) throw new NotFoundException('Chapter not found');
    return data;
  }

  async update(id: string, dto: UpdateChapterDto) {
    const { data, error } = await this.supabase
      .from('chapters')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      if (error.code === 'PGRST116')
        throw new NotFoundException('Chapter not found');
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async reorder(chapters: { id: string; sort_order: number }[]) {
    const results = await Promise.all(
      chapters.map(({ id, sort_order }) =>
        this.supabase.from('chapters').update({ sort_order }).eq('id', id),
      ),
    );
    const failed = results.find((result) => result.error);
    if (failed?.error) throw new BadRequestException(failed.error.message);
  }

  /**
   * Student pressed "Start now" on a chapter. Insert-if-absent so re-pressing
   * never moves the assignment deadlines anchored to `started_at`.
   */
  async startChapter(chapterId: string, studentId: string) {
    const courseId = await this.getCourseIdForChapter(chapterId);
    await this.ensureActiveEnrollment(studentId, courseId);
    await this.ensurePreviousChapterCompleted(chapterId, courseId, studentId);

    const { error } = await this.supabase.from('chapter_starts').upsert(
      { student_id: studentId, chapter_id: chapterId },
      { onConflict: 'student_id,chapter_id', ignoreDuplicates: true },
    );
    if (error) throw new BadRequestException(error.message);

    return this.getChapterStart(chapterId, studentId);
  }

  /**
   * A chapter can only be started once every lesson in the immediately preceding
   * (by sort_order) published chapter has been marked completed for this student.
   */
  private async ensurePreviousChapterCompleted(
    chapterId: string,
    courseId: string,
    studentId: string,
  ) {
    const { data: chapters, error } = await this.supabase
      .from('chapters')
      .select('id, sort_order, is_published, lessons(id, is_published)')
      .eq('course_id', courseId)
      .eq('is_published', true)
      .order('sort_order', { ascending: true });
    if (error) throw new BadRequestException(error.message);

    const ordered = (chapters ?? []) as {
      id: string;
      sort_order: number;
      lessons: { id: string; is_published?: boolean }[];
    }[];
    const currentIndex = ordered.findIndex((ch) => ch.id === chapterId);
    if (currentIndex <= 0) return; // first chapter or not found — nothing to gate on

    const previousChapter = ordered[currentIndex - 1];
    const lessonIds = (previousChapter.lessons ?? [])
      .filter((l) => l.is_published !== false)
      .map((l) => l.id);
    if (lessonIds.length === 0) return;

    const { data: progressRows, error: progressError } = await this.supabase
      .from('progress')
      .select('lesson_id, status')
      .eq('student_id', studentId)
      .in('lesson_id', lessonIds);
    if (progressError) throw new BadRequestException(progressError.message);

    const completedLessonIds = new Set(
      (progressRows ?? [])
        .filter((p) => p.status === 'completed')
        .map((p) => p.lesson_id),
    );
    const allCompleted = lessonIds.every((id) => completedLessonIds.has(id));
    if (!allCompleted) {
      throw new BadRequestException(
        'Complete every lesson in the previous chapter before starting this one.',
      );
    }
  }

  /** Current student's chapter_start row, or null when not started yet. */
  async getChapterStart(chapterId: string, studentId: string) {
    const { data, error } = await this.supabase
      .from('chapter_starts')
      .select('*')
      .eq('chapter_id', chapterId)
      .eq('student_id', studentId)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  private async getCourseIdForChapter(chapterId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('chapters')
      .select('course_id')
      .eq('id', chapterId)
      .single();
    if (error || !data) throw new NotFoundException('Chapter not found');
    return data.course_id as string;
  }

  private async ensureActiveEnrollment(studentId: string, courseId: string) {
    const { data } = await this.supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .maybeSingle();
    if (!data)
      throw new ForbiddenException(
        'Active enrollment required to access this content',
      );
  }

  async remove(id: string) {
    const { data: lessons } = await this.supabase
      .from('lessons')
      .select('id')
      .eq('chapter_id', id);
    await Promise.all(
      (lessons ?? []).map((lesson) =>
        this.lessonsService.cleanupExternalContent(lesson.id as string),
      ),
    );

    const { error } = await this.supabase
      .from('chapters')
      .delete()
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }
}
