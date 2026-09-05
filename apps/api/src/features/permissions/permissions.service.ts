import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ALL_PERMISSIONS, SetPermissionsDto } from './dto';

@Injectable()
export class PermissionsService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  async setPermissions(dto: SetPermissionsDto, grantedBy: string) {
    // Validate permission slugs
    const invalid = dto.permissions.filter(
      (p) => !(ALL_PERMISSIONS as readonly string[]).includes(p),
    );
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Invalid permissions: ${invalid.join(', ')}`,
      );
    }

    // Verify user is a sub_admin
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('role')
      .eq('id', dto.user_id)
      .single();
    if (!profile) throw new NotFoundException('User not found');
    if (profile.role !== 'sub_admin') {
      throw new BadRequestException('User must have sub_admin role');
    }

    const { data: existing } = await this.supabase
      .from('sub_admin_permissions')
      .select('id')
      .eq('user_id', dto.user_id)
      .maybeSingle();

    if (existing) {
      const { error } = await this.supabase
        .from('sub_admin_permissions')
        .update({
          permissions: dto.permissions,
          granted_by: grantedBy,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', dto.user_id);
      if (error) throw new BadRequestException(error.message);
    } else {
      const { error } = await this.supabase
        .from('sub_admin_permissions')
        .insert({
          user_id: dto.user_id,
          permissions: dto.permissions,
          granted_by: grantedBy,
        });
      if (error) throw new BadRequestException(error.message);
    }
    return { success: true };
  }

  async getPermissions(userId: string): Promise<string[]> {
    const { data } = await this.supabase
      .from('sub_admin_permissions')
      .select('permissions')
      .eq('user_id', userId)
      .single();
    return (data?.permissions as string[]) ?? [];
  }

  async getAllSubAdmins() {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, email, full_name, role, is_active')
      .in('role', ['sub_admin', 'admin']);
    if (error) throw new BadRequestException(error.message);

    const userIds = (data ?? []).map((u: { id: string }) => u.id);
    const { data: permsData } = await this.supabase
      .from('sub_admin_permissions')
      .select('*')
      .in('user_id', userIds.length > 0 ? userIds : ['__none__']);

    const permsMap = new Map(
      (permsData ?? []).map((p: { user_id: string }) => [p.user_id, p]),
    );

    return (data ?? []).map((u: { id: string }) => ({
      ...u,
      permissions: permsMap.get(u.id) ?? null,
    }));
  }

  async revokePermissions(userId: string) {
    const { error } = await this.supabase
      .from('sub_admin_permissions')
      .delete()
      .eq('user_id', userId);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  async promote(userId: string, role: 'sub_admin' | 'admin') {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single();
    if (!profile) throw new NotFoundException('User not found');

    const { data, error } = await this.supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select('id')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new BadRequestException('Failed to promote user');

    // A full admin has implicit access to everything, so scoped grants are redundant.
    if (role === 'admin') {
      await this.supabase
        .from('sub_admin_permissions')
        .delete()
        .eq('user_id', userId);
    }

    return { success: true, role };
  }

  async demoteToStudent(userId: string) {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single();
    if (!profile) throw new NotFoundException('User not found');
    if (profile.role !== 'sub_admin' && profile.role !== 'admin') {
      throw new BadRequestException('User is not a sub-admin or admin');
    }

    const { error: revokeError } = await this.supabase
      .from('sub_admin_permissions')
      .delete()
      .eq('user_id', userId);
    if (revokeError) throw new BadRequestException(revokeError.message);

    const { data, error } = await this.supabase
      .from('profiles')
      .update({ role: 'student' })
      .eq('id', userId)
      .select('id')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new BadRequestException('Failed to demote user');
    return { success: true };
  }
}
