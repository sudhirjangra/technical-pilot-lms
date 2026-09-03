import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  async getMyNotifications(userId: string) {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getUnreadCount(userId: string) {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);
    if (error) throw new BadRequestException(error.message);
    return { count: count ?? 0 };
  }

  async markRead(notificationId: string, userId: string) {
    const { data: notification, error: fetchErr } = await this.supabase
      .from('notifications')
      .select('id, recipient_id')
      .eq('id', notificationId)
      .single();
    if (fetchErr || !notification)
      throw new NotFoundException('Notification not found');
    if (notification.recipient_id !== userId)
      throw new ForbiddenException('Cannot mark another user\'s notification');

    const { data, error } = await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async markAllRead(userId: string) {
    const { error } = await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  async broadcast(title: string, body: string | undefined, type: string) {
    // Get all active students
    // Roles are stored lowercase in profiles.
    const { data: students, error: studentsErr } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('role', 'student')
      .eq('is_active', true);
    if (studentsErr) throw new BadRequestException(studentsErr.message);
    if (!students || students.length === 0) return { sent: 0 };

    const rows = students.map((s) => ({
      recipient_id: s.id,
      title,
      body: body ?? null,
      type,
    }));

    const { error } = await this.supabase
      .from('notifications')
      .insert(rows);
    if (error) throw new BadRequestException(error.message);

    return { sent: students.length };
  }

  async send(
    recipientId: string,
    title: string,
    body: string | undefined,
    type: string,
    metadata?: Record<string, unknown>,
  ) {
    const { data, error } = await this.supabase
      .from('notifications')
      .insert({
        recipient_id: recipientId,
        title,
        body: body ?? null,
        type,
        metadata: metadata ?? {},
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /** Helper: broadcast a "course added" notification to all students */
  async notifyCourseAdded(courseId: string, courseTitle: string) {
    return this.broadcast(
      `New Course: ${courseTitle}`,
      `A new course "${courseTitle}" has been added. Check it out!`,
      'course_added',
    );
  }

  /** Helper: send a congratulation notification to a specific student */
  async notifyCongratulation(studentId: string, title: string, body: string) {
    return this.send(studentId, title, body, 'congratulation');
  }
}
