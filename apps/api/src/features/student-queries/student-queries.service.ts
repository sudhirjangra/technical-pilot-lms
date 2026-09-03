import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class StudentQueriesService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(studentId: string, subject: string, body: string) {
    const { data, error } = await this.supabase
      .from('student_queries')
      .insert({ student_id: studentId, subject, body })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getMyQueries(studentId: string) {
    const { data, error } = await this.supabase
      .from('student_queries')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findAll(status?: string) {
    let query = this.supabase
      .from('student_queries')
      .select(
        '*, profiles!student_queries_student_id_fkey(id, full_name, email)',
      )
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('student_queries')
      .select(
        '*, profiles!student_queries_student_id_fkey(id, full_name, email)',
      )
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException('Query not found');
    return data;
  }

  /**
   * Student asks for one more attempt on an assignment they have failed out of.
   * Only allowed once every attempt is used and none of them passed.
   */
  async requestExtraAttempt(
    studentId: string,
    assignmentId: string,
    reason?: string,
  ) {
    const { data: assignment } = await this.supabase
      .from('assignments')
      .select('id, title, lesson_id, max_attempts, passing_score_percent')
      .eq('id', assignmentId)
      .single();
    if (!assignment) throw new NotFoundException('Assignment not found');

    const { data: attempts } = await this.supabase
      .from('assignment_attempts')
      .select('id, score, max_score, completed_at')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId);

    const { data: grant } = await this.supabase
      .from('assessment_attempt_grants')
      .select('extra_attempts')
      .eq('student_id', studentId)
      .eq('assignment_id', assignmentId)
      .maybeSingle();

    const allowed =
      assignment.max_attempts === null || assignment.max_attempts === undefined
        ? null
        : assignment.max_attempts + (grant?.extra_attempts ?? 0);

    if (allowed === null) {
      throw new BadRequestException('This assignment has unlimited attempts');
    }
    if ((attempts ?? []).length < allowed) {
      throw new BadRequestException('You still have attempts remaining');
    }

    const passingPct = assignment.passing_score_percent ?? 60;
    const passed = (attempts ?? []).some((a) => {
      const pct = a.max_score && a.max_score > 0 ? ((a.score ?? 0) / a.max_score) * 100 : 0;
      return a.completed_at && pct >= passingPct;
    });
    if (passed) {
      throw new BadRequestException('You have already passed this assignment');
    }

    const { data: existing } = await this.supabase
      .from('student_queries')
      .select('id')
      .eq('student_id', studentId)
      .eq('type', 'extra_attempt_request')
      .eq('status', 'open')
      .contains('metadata', { assignment_id: assignmentId })
      .maybeSingle();
    if (existing) {
      throw new BadRequestException(
        'A request for this assignment is already pending review',
      );
    }

    const { data, error } = await this.supabase
      .from('student_queries')
      .insert({
        student_id: studentId,
        subject: `Extra attempt request: ${assignment.title}`,
        body:
          reason?.trim() ||
          'All attempts have been used without a passing score. Requesting one additional attempt.',
        type: 'extra_attempt_request',
        metadata: {
          assignment_id: assignmentId,
          lesson_id: assignment.lesson_id,
          attempts_used: (attempts ?? []).length,
        },
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /** Admin approves an extra-attempt request and increments the student's allowance. */
  async grantExtraAttempt(
    queryId: string,
    grantedBy: string,
    extraAttempts = 1,
    adminReply?: string,
  ) {
    const { data: query } = await this.supabase
      .from('student_queries')
      .select('id, student_id, subject, type, metadata')
      .eq('id', queryId)
      .single();
    if (!query) throw new NotFoundException('Query not found');
    if (query.type !== 'extra_attempt_request') {
      throw new BadRequestException('This query is not an extra-attempt request');
    }

    const assignmentId = (query.metadata as { assignment_id?: string } | null)
      ?.assignment_id;
    if (!assignmentId) {
      throw new BadRequestException('Request is missing its assignment reference');
    }

    const { data: existing } = await this.supabase
      .from('assessment_attempt_grants')
      .select('id, extra_attempts')
      .eq('student_id', query.student_id)
      .eq('assignment_id', assignmentId)
      .maybeSingle();

    if (existing) {
      const { error } = await this.supabase
        .from('assessment_attempt_grants')
        .update({
          extra_attempts: (existing.extra_attempts ?? 0) + extraAttempts,
          granted_by: grantedBy,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) throw new BadRequestException(error.message);
    } else {
      const { error } = await this.supabase
        .from('assessment_attempt_grants')
        .insert({
          student_id: query.student_id,
          assignment_id: assignmentId,
          extra_attempts: extraAttempts,
          granted_by: grantedBy,
        });
      if (error) throw new BadRequestException(error.message);
    }

    const reply =
      adminReply?.trim() ||
      `Approved. You have been granted ${extraAttempts} additional attempt${extraAttempts === 1 ? '' : 's'}.`;

    return this.reply(queryId, reply, grantedBy);
  }

  async reply(id: string, adminReply: string, repliedBy: string) {
    // Fetch the query to get student_id and subject
    const { data: existing, error: fetchErr } = await this.supabase
      .from('student_queries')
      .select('id, student_id, subject')
      .eq('id', id)
      .single();
    if (fetchErr || !existing) throw new NotFoundException('Query not found');

    const { data, error } = await this.supabase
      .from('student_queries')
      .update({
        admin_reply: adminReply,
        status: 'answered',
        replied_by: repliedBy,
        replied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);

    // Send notification to the student
    await this.notificationsService.send(
      existing.student_id,
      `Reply to: ${existing.subject}`,
      adminReply,
      'query_reply',
      { query_id: id },
    );

    return data;
  }
}
