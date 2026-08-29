import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
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
