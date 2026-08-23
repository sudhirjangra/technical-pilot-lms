import { PERMISSIONS_KEY } from '@/common/decorators/permissions.decorator';
import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Authentication required');

    const role = (user.role ?? '').toUpperCase();
    // Admin bypasses permission checks
    if (role === 'ADMIN') return true;

    if (role !== 'SUB_ADMIN') {
      throw new ForbiddenException('Insufficient role');
    }

    const { data } = await this.supabase
      .from('sub_admin_permissions')
      .select('permissions')
      .eq('user_id', user.id)
      .single();

    const userPerms: string[] = (data?.permissions as string[]) ?? [];
    const hasAll = required.every((p) => userPerms.includes(p));
    if (!hasAll) {
      throw new ForbiddenException('Missing required permissions');
    }

    return true;
  }
}
