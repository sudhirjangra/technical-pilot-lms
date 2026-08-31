import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Database } from '@repo/supabase/types';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class UsersService {
  constructor(
    @Inject(SUPABASE_ADMIN)
    private readonly supabase: SupabaseClient<Database>,
  ) {}

  async findAll() {
    const { data, error } = await this.supabase
      .from('profiles')
      .select(
        'id, email, role, full_name, phone, avatar_url, is_active, created_at, updated_at',
      );
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findOne(identifier: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select(
        'id, email, role, full_name, phone, avatar_url, is_active, date_of_birth, created_at, updated_at',
      )
      .or(`id.eq.${identifier},email.eq.${identifier},full_name.eq.${identifier}`)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException('User not found.');
    return data;
  }

  async findById(id: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select(
        'id, email, role, full_name, phone, avatar_url, is_active, date_of_birth, created_at, updated_at',
      )
      .eq('id', id)
      .single();
    if (error) throw new NotFoundException('User not found');
    return data;
  }

  async toggleActive(id: string, isActive: boolean) {
    const { data, error } = await this.supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', id)
      .select('id, email, role, full_name, is_active')
      .single();
    if (error) throw new NotFoundException('User not found');
    return data;
  }
}
