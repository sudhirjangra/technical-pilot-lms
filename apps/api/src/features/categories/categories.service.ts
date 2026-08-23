import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

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
}
