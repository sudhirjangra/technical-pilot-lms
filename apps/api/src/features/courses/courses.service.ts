import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyRequest } from 'fastify';
import { LessonsService } from '../lessons/lessons.service';
import { CreateCourseDto, UpdateCourseDto } from './dto';

type MultipartRequest = FastifyRequest & {
  file: () => Promise<{ mimetype: string; toBuffer: () => Promise<Buffer> } | undefined>;
};

@Injectable()
export class CoursesService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly lessonsService: LessonsService,
  ) {}

  async create(dto: CreateCourseDto, createdBy: string) {
    const { data, error } = await this.supabase
      .from('courses')
      .insert({ ...dto, created_by: createdBy })
      .select('*, categories(id, name, slug)')
      .single();
    if (error) {
      if (error.code === '23505')
        throw new BadRequestException('Course slug already exists');
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async findAll(filters?: { status?: string; category_id?: string }) {
    let query = this.supabase
      .from('courses')
      .select('*, categories(id, name, slug)')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findPublished() {
    const { data, error } = await this.supabase
      .from('courses')
      .select('*, categories(id, name, slug)')
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('courses')
      .select('*, categories(id, name, slug)')
      .eq('id', id)
      .single();
    if (error) throw new NotFoundException('Course not found');
    return data;
  }

  async findBySlug(slug: string) {
    const { data, error } = await this.supabase
      .from('courses')
      .select('*, categories(id, name, slug)')
      .eq('slug', slug)
      .single();
    if (error) throw new NotFoundException('Course not found');
    return data;
  }

  async update(id: string, dto: UpdateCourseDto) {
    const updatePayload: Record<string, unknown> = { ...dto };

    // Keep published_at consistent with the status transition.
    if (dto.status === 'published') {
      const existing = await this.findOne(id);
      if (!existing.published_at) {
        updatePayload.published_at = new Date().toISOString();
      }
    } else if (dto.status === 'draft') {
      updatePayload.published_at = null;
    }

    const { data, error } = await this.supabase
      .from('courses')
      .update(updatePayload)
      .eq('id', id)
      .select('*, categories(id, name, slug)')
      .single();
    if (error) {
      if (error.code === '23505')
        throw new BadRequestException('Course slug already exists');
      if (error.code === 'PGRST116')
        throw new NotFoundException('Course not found');
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async remove(id: string) {
    const { data: chapters } = await this.supabase
      .from('chapters')
      .select('id')
      .eq('course_id', id);
    const chapterIds = (chapters ?? []).map((c) => c.id as string);

    if (chapterIds.length > 0) {
      const { data: lessons } = await this.supabase
        .from('lessons')
        .select('id')
        .in('chapter_id', chapterIds);
      await Promise.all(
        (lessons ?? []).map((lesson) =>
          this.lessonsService.cleanupExternalContent(lesson.id as string),
        ),
      );
    }

    const { error } = await this.supabase.from('courses').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  async uploadThumbnail(id: string, request: FastifyRequest) {
    const { data: course } = await this.supabase
      .from('courses')
      .select('id')
      .eq('id', id)
      .single();
    if (!course) throw new NotFoundException('Course not found');

    const part = await (request as MultipartRequest).file();
    if (!part || !['image/png', 'image/jpeg', 'image/webp'].includes(part.mimetype))
      throw new BadRequestException('A PNG, JPEG, or WEBP image is required');

    const ext = part.mimetype.split('/')[1];
    const filePath = `courses/${id}/thumbnail.${ext}`;
    const buffer = await part.toBuffer();
    const { error: uploadError } = await this.supabase.storage
      .from('course-media')
      .upload(filePath, buffer, { contentType: part.mimetype, upsert: true });
    if (uploadError) throw new BadRequestException(uploadError.message);

    const { data: publicUrlData } = this.supabase.storage
      .from('course-media')
      .getPublicUrl(filePath);

    const { data, error } = await this.supabase
      .from('courses')
      .update({ thumbnail_url: publicUrlData.publicUrl })
      .eq('id', id)
      .select('*, categories(id, name, slug)')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
