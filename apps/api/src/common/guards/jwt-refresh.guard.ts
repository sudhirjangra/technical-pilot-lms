import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import { Env } from '@/common/utils';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Database } from '@repo/supabase/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { Request } from 'express';

@Injectable()
export class JwtRefreshGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService<Env>,
    @Inject(SUPABASE_ADMIN)
    private readonly supabase: SupabaseClient<Database>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) throw new UnauthorizedException('Invalid Refresh Token');

    try {
      request.user = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid Refresh Token');
    }

    const { data } = await this.supabase
      .from('devices')
      .select('id')
      .eq('user_id', request.user.id)
      .eq('device_fingerprint', token)
      .maybeSingle();

    if (!data) throw new UnauthorizedException('Invalid Refresh Token');
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
