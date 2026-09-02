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
