import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyRequest } from 'fastify';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

type MultipartRequest = FastifyRequest & {
  file: () => Promise<{ mimetype: string; toBuffer: () => Promise<Buffer> } | undefined>;
};

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  async create(dto: CreateCategoryDto) {
    const { data, error } = await this.supabase
      .from('categories')
      .insert(dto)
      .select()
      .single();
    if (error) {
      if (error.code === '23505')
        throw new BadRequestException('Slug already exists');
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async findAll(includeInactive = false) {
    let query = this.supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new NotFoundException('Category not found');
    return data;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const { data, error } = await this.supabase
      .from('categories')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      if (error.code === '23505')
        throw new BadRequestException('Slug already exists');
      if (error.code === 'PGRST116')
        throw new NotFoundException('Category not found');
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  async reorder(categories: { id: string; sort_order: number }[]) {
    const results = await Promise.all(
      categories.map(({ id, sort_order }) =>
        this.supabase.from('categories').update({ sort_order }).eq('id', id),
      ),
    );
    const failed = results.find((result) => result.error);
    if (failed?.error) throw new BadRequestException(failed.error.message);
  }

  async uploadThumbnail(id: string, request: FastifyRequest) {
    const { data: category } = await this.supabase
      .from('categories')
      .select('id')
      .eq('id', id)
      .single();
    if (!category) throw new NotFoundException('Category not found');

    const part = await (request as MultipartRequest).file();
    if (!part || !['image/png', 'image/jpeg', 'image/webp'].includes(part.mimetype))
      throw new BadRequestException('A PNG, JPEG, or WEBP image is required');

    const ext = part.mimetype.split('/')[1];
    const filePath = `categories/${id}/thumbnail.${ext}`;
    const buffer = await part.toBuffer();
    const { error: uploadError } = await this.supabase.storage
      .from('course-media')
      .upload(filePath, buffer, { contentType: part.mimetype, upsert: true });
    if (uploadError) throw new BadRequestException(uploadError.message);

    const { data: publicUrlData } = this.supabase.storage
      .from('course-media')
      .getPublicUrl(filePath);

    const { data, error: updateError } = await this.supabase
      .from('categories')
      .update({ thumbnail_url: publicUrlData.publicUrl })
      .eq('id', id)
      .select()
      .single();
    if (updateError) throw new BadRequestException(updateError.message);
    return data;
  }
}
