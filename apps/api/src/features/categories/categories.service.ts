import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import { uploadPublicImage } from '@/common/utils/storage';
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
    if (!part) throw new BadRequestException('A PNG, JPEG, or WEBP image is required');

    const ext = part.mimetype.split('/')[1];
    const publicUrl = await uploadPublicImage(
      this.supabase,
      `categories/${id}/thumbnail.${ext}`,
      await part.toBuffer(),
      part.mimetype,
    );

    const { data, error: updateError } = await this.supabase
      .from('categories')
      .update({ thumbnail_url: publicUrl })
      .eq('id', id)
      .select()
      .single();
    if (updateError) throw new BadRequestException(updateError.message);
    return data;
  }
}
