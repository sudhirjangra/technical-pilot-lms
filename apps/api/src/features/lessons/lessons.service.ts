import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyRequest } from 'fastify';
import { CreateLessonDto, UpdateLessonDto } from './dto';

@Injectable()
export class LessonsService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  async uploadPdf(lessonId: string, request: FastifyRequest) {
    const { data: lesson } = await this.supabase
      .from('lessons')
      .select('id, title, lesson_type, chapter_id, chapters(title, courses(slug))')
      .eq('id', lessonId)
      .single();
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.lesson_type !== 'pdf')
      throw new BadRequestException('Lesson type must be pdf');

    const part = await (request as FastifyRequest & {
      file: () => Promise<{ mimetype: string; toBuffer: () => Promise<Buffer> } | undefined>;
    }).file();
    if (!part || part.mimetype !== 'application/pdf')
      throw new BadRequestException('A PDF file is required');

    const chapter = lesson.chapters as unknown as { title: string; courses: { slug: string } };
    const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const filePath = `${safe(chapter.courses.slug)}/${safe(chapter.title)}/${safe(lesson.title)}.pdf`;
    const buffer = await part.toBuffer();
    const { error: uploadError } = await this.supabase.storage
      .from('course-materials')
      .upload(filePath, buffer, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw new BadRequestException(uploadError.message);

    const { data, error } = await this.supabase
      .from('pdf_notes')
      .upsert({ lesson_id: lessonId, file_path: filePath, file_size_bytes: buffer.length }, { onConflict: 'lesson_id' })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

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
