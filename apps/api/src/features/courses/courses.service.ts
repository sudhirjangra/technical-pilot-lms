import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateCourseDto, UpdateCourseDto } from './dto';

@Injectable()
export class CoursesService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  async create(dto: CreateCourseDto, createdBy: string) {
    const { data, error } = await this.supabase
      .from('courses')
      .insert({ ...dto, created_by: createdBy })
      .select('*, categories(id, name, slug)')
      .single();
    if (error) {
      if (error.code === '23505') throw new BadRequestException('Course slug already exists');
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

    // Set published_at when publishing
    if (dto.status === 'published') {
      updatePayload.published_at = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .from('courses')
      .update(updatePayload)
      .eq('id', id)
      .select('*, categories(id, name, slug)')
      .single();
    if (error) {
      if (error.code === '23505') throw new BadRequestException('Course slug already exists');
      if (error.code === 'PGRST116') throw new NotFoundException('Course not found');
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase
      .from('courses')
      .delete()
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }
}
