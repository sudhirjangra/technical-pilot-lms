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
        'id, email, role, full_name, phone, avatar_url, is_active, created_at, updated_at',
      )
      .or(`email.eq.${identifier},full_name.eq.${identifier}`)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException('User not found.');
    return data;
  }
}
