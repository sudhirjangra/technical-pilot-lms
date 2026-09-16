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
      .or(
        `id.eq.${identifier},email.eq.${identifier},full_name.eq.${identifier}`,
      )
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException('User not found.');
    return data;
  }

  async findById(id: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select(
        'id, email, role, full_name, phone, avatar_url, is_active, created_at, updated_at',
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

    if (!isActive) {
      // 1. Immediately revoke all active sessions for this user
      await this.supabase.from('devices').delete().eq('user_id', id);

      // 2. Ban user in Supabase Auth to revoke refresh tokens and block auth
      try {
        await this.supabase.auth.admin.updateUserById(id, {
          ban_duration: '876000h',
        });
        await this.supabase.auth.admin.signOut(id);
      } catch {
        // Continue even if Supabase Auth call fails
      }
    } else {
      // Unban in Supabase Auth when reactivating
      try {
        await this.supabase.auth.admin.updateUserById(id, {
          ban_duration: 'none',
        });
      } catch {
        // Continue even if Supabase Auth call fails
      }
    }

    return data;
  }

  async getUserDevices(userId: string) {
    const { data, error } = await this.supabase
      .from('devices')
      .select('*')
      .eq('user_id', userId)
      .order('last_active_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async logoutUserDevice(userId: string, deviceId: string) {
    const { data: existing, error: findError } = await this.supabase
      .from('devices')
      .select('id')
      .eq('id', deviceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (findError || !existing) {
      throw new NotFoundException('Device session not found');
    }

    const { error } = await this.supabase
      .from('devices')
      .delete()
      .eq('id', deviceId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return { success: true, message: 'Device logged out successfully' };
  }

  async logoutAllUserDevices(userId: string) {
    const { error } = await this.supabase
      .from('devices')
      .delete()
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return { success: true, message: 'All devices logged out successfully' };
  }

  async toggleBanDevice(userId: string, deviceId: string, isBanned: boolean) {
    const { data: existing, error: findError } = await this.supabase
      .from('devices')
      .select('id')
      .eq('id', deviceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (findError || !existing) {
      throw new NotFoundException('Device not found');
    }

    const { data, error } = await this.supabase
      .from('devices')
      .update({
        is_banned: isBanned,
        banned_at: isBanned ? new Date().toISOString() : null,
      })
      .eq('id', deviceId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return {
      success: true,
      message: isBanned
        ? 'Device banned successfully'
        : 'Device unbanned successfully',
      data,
    };
  }
}
