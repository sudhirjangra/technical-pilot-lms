import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { NotificationsService } from '../notifications/notifications.service';

function formatQueryRecord(row: any) {
  if (!row) return row;
  const meta = (row.metadata as Record<string, any>) || {};
  const queryNumber = meta.query_number || `Q-${row.id.slice(0, 6).toUpperCase()}`;
  return {
    ...row,
    query_number: queryNumber,
  };
}

function generateQueryNumber(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `Q-${num}`;
}

@Injectable()
export class StudentQueriesService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(studentId: string, subject: string, body: string) {
    const queryNumber = generateQueryNumber();
    const { data, error } = await this.supabase
      .from('student_queries')
      .insert({
        student_id: studentId,
        subject,
        body,
        metadata: { query_number: queryNumber },
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);

    try {
      const { data: student } = await this.supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', studentId)
        .maybeSingle();
      const studentName = student?.full_name || student?.email || 'A student';
      await this.notificationsService.notifyAdmins(
        `New Student Query #${queryNumber}`,
        `${studentName}: ${subject}`,
        'student_query',
        { query_id: data.id, query_number: queryNumber, student_id: studentId },
      );
    } catch {
      // Notification is non-blocking
    }

    return formatQueryRecord(data);
  }

  async getMyQueries(studentId: string) {
    const { data, error } = await this.supabase
      .from('student_queries')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return (data ?? []).map(formatQueryRecord);
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
    return (data ?? []).map(formatQueryRecord);
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
    return formatQueryRecord(data);
  }

  /**
   * Student asks for one more attempt on an assignment they have failed out of.
   * Only allowed once every attempt is used and none of them passed.
   */
  async requestExtraAttempt(
    studentId: string,
    assessmentType: 'assignment' | 'test',
    assessmentId: string,
    reason?: string,
  ) {
    const table = assessmentType === 'assignment' ? 'assignments' : 'tests';
    const attemptsTable = assessmentType === 'assignment' ? 'assignment_attempts' : 'test_attempts';
    const targetColumn = assessmentType === 'assignment' ? 'assignment_id' : 'test_id';
    const { data: assessment } = await this.supabase
      .from(table)
      .select('id, title, lesson_id, max_attempts, passing_score_percent')
      .eq('id', assessmentId)
      .single();
    if (!assessment) throw new NotFoundException(`${assessmentType === 'assignment' ? 'Assignment' : 'Test'} not found`);

    const { data: attempts } = await this.supabase
      .from(attemptsTable)
      .select('id, score, max_score, completed_at')
      .eq(targetColumn, assessmentId)
      .eq('student_id', studentId);

    const { data: grant } = await this.supabase
      .from('assessment_attempt_grants')
      .select('extra_attempts')
      .eq('student_id', studentId)
      .eq(targetColumn, assessmentId)
      .maybeSingle();

    const allowed =
      assessment.max_attempts === null || assessment.max_attempts === undefined
        ? null
        : assessment.max_attempts + (grant?.extra_attempts ?? 0);

    if (allowed === null) {
      throw new BadRequestException('This assignment has unlimited attempts');
    }
    if ((attempts ?? []).length < allowed) {
      throw new BadRequestException('You still have attempts remaining');
    }

    const passingPct = assessment.passing_score_percent ?? 60;
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
      .contains('metadata', { [targetColumn]: assessmentId })
      .maybeSingle();
    if (existing) {
      throw new BadRequestException(
        'A request for this assignment is already pending review',
      );
    }

    const queryNumber = generateQueryNumber();
    const { data, error } = await this.supabase
      .from('student_queries')
      .insert({
        student_id: studentId,
        subject: `Extra attempt request: ${assessment.title}`,
        body:
          reason?.trim() ||
          'All attempts have been used without a passing score. Requesting one additional attempt.',
        type: 'extra_attempt_request',
        metadata: {
          query_number: queryNumber,
          [targetColumn]: assessmentId,
          assessment_type: assessmentType,
          lesson_id: assessment.lesson_id,
          attempts_used: (attempts ?? []).length,
        },
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);

    try {
      const { data: student } = await this.supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', studentId)
        .maybeSingle();
      const studentName = student?.full_name || student?.email || 'A student';
      await this.notificationsService.notifyAdmins(
        `Extra Attempt Request #${queryNumber}`,
        `${studentName} requested an extra attempt for ${assessment.title}.`,
        'extra_attempt_request',
        { query_id: data.id, query_number: queryNumber, student_id: studentId },
      );
    } catch {
      // Non-blocking
    }

    return formatQueryRecord(data);
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

    const metadata = query.metadata as {
      assignment_id?: string;
      test_id?: string;
      assessment_type?: 'assignment' | 'test';
    } | null;
    const assessmentType = metadata?.assessment_type ?? (metadata?.test_id ? 'test' : 'assignment');
    const assessmentId = assessmentType === 'test' ? metadata?.test_id : metadata?.assignment_id;
    if (!assessmentId) {
      throw new BadRequestException('Request is missing its assignment reference');
    }
    const targetColumn = assessmentType === 'test' ? 'test_id' : 'assignment_id';

    const { data: existing } = await this.supabase
      .from('assessment_attempt_grants')
      .select('id, extra_attempts')
      .eq('student_id', query.student_id)
      .eq(targetColumn, assessmentId)
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
          [targetColumn]: assessmentId,
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
