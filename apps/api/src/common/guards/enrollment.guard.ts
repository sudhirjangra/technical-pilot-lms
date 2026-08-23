import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Guard that verifies the authenticated student has an active enrollment
 * for the course associated with the requested resource.
 * Expects `courseId` as a route param, or derives it from `chapterId`/`lessonId`.
 */
@Injectable()
export class EnrollmentGuard implements CanActivate {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('Authentication required');

    // Admin/sub-admin bypass enrollment check
    const role = (user.role ?? '').toUpperCase();
    if (role === 'ADMIN' || role === 'SUB_ADMIN') return true;

    const params = request.params;
    let courseId: string | undefined = params.courseId;

    // Derive courseId from lessonId if present
    if (!courseId && params.lessonId) {
      const { data: lesson } = await this.supabase
        .from('lessons')
        .select('chapters(course_id)')
        .eq('id', params.lessonId)
        .single();
      courseId = (lesson?.chapters as unknown as { course_id: string })
        ?.course_id;
    }

    // Derive courseId from chapterId if present
    if (!courseId && params.chapterId) {
      const { data: chapter } = await this.supabase
        .from('chapters')
        .select('course_id')
        .eq('id', params.chapterId)
        .single();
      courseId = chapter?.course_id;
    }

    if (!courseId)
      throw new ForbiddenException('Unable to determine course context');

    const { data: enrollment } = await this.supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .single();

    if (!enrollment)
      throw new ForbiddenException(
        'Active enrollment required to access this content',
      );
    return true;
  }
}
