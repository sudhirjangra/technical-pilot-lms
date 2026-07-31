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
      throw new BadRequestException(`Invalid permissions: ${invalid.join(', ')}`);
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

    const { data, error } = await this.supabase
      .from('sub_admin_permissions')
      .upsert(
        {
          user_id: dto.user_id,
          permissions: dto.permissions,
          granted_by: grantedBy,
        },
        { onConflict: 'user_id' },
      )
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
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
      .eq('role', 'sub_admin');
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
  }

  async promoteToSubAdmin(userId: string) {
    const { error } = await this.supabase
      .from('profiles')
      .update({ role: 'sub_admin' })
      .eq('id', userId);
    if (error) throw new BadRequestException(error.message);
  }

  async demoteToStudent(userId: string) {
    await this.supabase.from('sub_admin_permissions').delete().eq('user_id', userId);
    const { error } = await this.supabase
      .from('profiles')
      .update({ role: 'student' })
      .eq('id', userId);
    if (error) throw new BadRequestException(error.message);
  }
}
