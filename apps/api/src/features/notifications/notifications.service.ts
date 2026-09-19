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

  async getAdminNotificationLogs() {
    const { data: notifications, error } = await this.supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new BadRequestException(error.message);
    if (!notifications || notifications.length === 0) return [];

    const recipientIds = [
      ...new Set(notifications.map((n) => n.recipient_id).filter(Boolean)),
    ];
    let profilesMap = new Map<
      string,
      { id: string; full_name: string | null; email: string }
    >();
    if (recipientIds.length > 0) {
      const { data: profiles } = await this.supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', recipientIds);
      if (profiles) {
        profilesMap = new Map(profiles.map((p) => [p.id, p]));
      }
    }

    return notifications.map((n) => ({
      ...n,
      profiles: profilesMap.get(n.recipient_id) || null,
    }));
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
      throw new ForbiddenException("Cannot mark another user's notification");

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

  async broadcast(
    title: string,
    body: string | undefined,
    type: string,
    courseId?: string,
    metadata?: Record<string, unknown>,
  ) {
    let targetRecipientIds: string[] = [];

    if (courseId) {
      const { data: enrollments, error: enrollmentsErr } = await this.supabase
        .from('enrollments')
        .select('student_id')
        .eq('course_id', courseId)
        .in('status', ['active', 'completed']);
      if (enrollmentsErr) throw new BadRequestException(enrollmentsErr.message);
      const studentIds = [
        ...new Set(
          (enrollments ?? []).map((enrollment) => enrollment.student_id),
        ),
      ];
      if (studentIds.length === 0) {
        throw new BadRequestException(
          'No enrolled students found in the selected course to notify.',
        );
      }
      targetRecipientIds = studentIds;
    } else {
      // For global broadcasts, target all active students (excluding admin and sub_admin)
      const { data: students, error: studentsErr } = await this.supabase
        .from('profiles')
        .select('id, role, is_active');
      if (studentsErr) throw new BadRequestException(studentsErr.message);

      targetRecipientIds = (students ?? [])
        .filter((s) => {
          const role = (s.role ?? 'student').toLowerCase();
          const isAdmin = role === 'admin' || role === 'sub_admin';
          return !isAdmin && s.is_active !== false;
        })
        .map((s) => s.id);
    }

    if (targetRecipientIds.length === 0) {
      throw new BadRequestException('No active students found to notify.');
    }

    const mergedMetadata = {
      ...(metadata ?? {}),
      ...(courseId ? { course_id: courseId } : {}),
    };

    const rows = targetRecipientIds.map((recipientId) => ({
      recipient_id: recipientId,
      title,
      body: body ?? null,
      type,
      metadata: mergedMetadata,
    }));

    const { error } = await this.supabase.from('notifications').insert(rows);
    if (error) throw new BadRequestException(error.message);

    return { sent: rows.length };
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

  /** Helper: notify all active admins and sub-admins */
  async notifyAdmins(
    title: string,
    body: string | undefined,
    type: string,
    metadata?: Record<string, unknown>,
  ) {
    const { data: admins, error } = await this.supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'sub_admin'])
      .eq('is_active', true);

    if (error || !admins || admins.length === 0) return { sent: 0 };

    const rows = admins.map((admin) => ({
      recipient_id: admin.id,
      title,
      body: body ?? null,
      type,
      metadata: metadata ?? {},
    }));

    await this.supabase.from('notifications').insert(rows);
    return { sent: admins.length };
  }
}
