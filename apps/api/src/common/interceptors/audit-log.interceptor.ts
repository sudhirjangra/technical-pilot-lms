import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Observable, tap } from 'rxjs';

export const AUDIT_KEY = 'audit_action';

/**
 * Mark a handler for audit logging: @Audit('course.create')
 */
export const Audit = (action: string) => SetMetadata(AUDIT_KEY, action);

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string>(AUDIT_KEY, context.getHandler());
    if (!action) return next.handle();

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id ?? null;
    const ip = request.ip ?? request.headers['x-forwarded-for'] ?? null;
    const userAgent = request.headers['user-agent'] ?? null;

    return next.handle().pipe(
      tap((response) => {
        const resourceId =
          request.params?.id ?? (response as Record<string, unknown>)?.data?.id ?? null;
        const resourceType = context.getClass().name.replace('Controller', '').toLowerCase();

        // Fire and forget — don't block the response
        this.supabase
          .from('audit_logs')
          .insert({
            user_id: userId,
            action,
            resource_type: resourceType,
            resource_id: resourceId,
            ip_address: ip,
            user_agent: userAgent,
            metadata: {
              method: request.method,
              path: request.url,
            },
          })
          .then();
      }),
    );
  }
}
