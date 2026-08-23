import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateLessonDto, UpdateLessonDto } from './dto';

@Injectable()
export class LessonsService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  async create(dto: CreateLessonDto) {
    // Verify chapter exists
    const { error: chErr } = await this.supabase
      .from('chapters')
      .select('id')
      .eq('id', dto.chapter_id)
      .single();
    if (chErr) throw new NotFoundException('Chapter not found');

    // Auto-assign sort_order if not provided
    if (dto.sort_order === undefined) {
      const { count } = await this.supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('chapter_id', dto.chapter_id);
      dto.sort_order = (count ?? 0) + 1;
    }

    const { data, error } = await this.supabase
      .from('lessons')
      .insert(dto)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findByChapter(chapterId: string) {
    const { data, error } = await this.supabase
      .from('lessons')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('sort_order', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new NotFoundException('Lesson not found');
    return data;
  }

  async update(id: string, dto: UpdateLessonDto) {
    const { data, error } = await this.supabase
      .from('lessons')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      if (error.code === 'PGRST116')
        throw new NotFoundException('Lesson not found');
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async reorder(lessons: { id: string; sort_order: number }[]) {
    const updates = lessons.map(({ id, sort_order }) =>
      this.supabase.from('lessons').update({ sort_order }).eq('id', id),
    );
    await Promise.all(updates);
  }

  async remove(id: string) {
    const { error } = await this.supabase.from('lessons').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }
}
