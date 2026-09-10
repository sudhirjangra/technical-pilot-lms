import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import { MailService } from '@/features/mail/mail.service';
import { DoubtBookingSuccessMail } from '@/features/mail/templates';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'nestjs-pino';
import { NotificationsService } from '../notifications/notifications.service';
import {
  BookSlotDto,
  CreateSlotDto,
  UpdateBookingDto,
  UpdateSlotDto,
} from './dto';

@Injectable()
export class DoubtSessionsService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly logger: Logger,
  ) {}


  private async hydrateSlots(slots: any[]): Promise<any[]> {
    if (!slots || slots.length === 0) return [];

    const courseIds = [
      ...new Set(slots.map((s) => s.course_id).filter(Boolean)),
    ] as string[];
    const studentIds = [
      ...new Set(slots.map((s) => s.student_id).filter(Boolean)),
    ] as string[];
    const creatorIds = [
      ...new Set(slots.map((s) => s.created_by).filter(Boolean)),
    ] as string[];

    const profileIds = [...new Set([...studentIds, ...creatorIds])];

    const [coursesRes, profilesRes] = await Promise.all([
      courseIds.length > 0
        ? this.supabase.from('courses').select('id, title').in('id', courseIds)
        : Promise.resolve({ data: [] }),
      profileIds.length > 0
        ? this.supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', profileIds)
        : Promise.resolve({ data: [] }),
    ]);

    const courseMap = new Map(
      (coursesRes.data ?? []).map((c: { id: string; title: string }) => [c.id, c]),
    );
    const profileMap = new Map(
      (profilesRes.data ?? []).map(
        (p: { id: string; full_name: string | null; email: string }) => [
          p.id,
          p,
        ],
      ),
    );

    return slots.map((slot) => ({
      ...slot,
      courses: slot.course_id ? courseMap.get(slot.course_id) || null : null,
      target_student: slot.student_id
        ? profileMap.get(slot.student_id) || null
        : null,
      profiles: slot.created_by ? profileMap.get(slot.created_by) || null : null,
    }));
  }

  async createSlot(dto: CreateSlotDto, createdBy: string) {
    const { notify_students = true, ...slotData } = dto;
    const targetType = slotData.target_type || 'all';

    if (targetType === 'course' && !slotData.course_id) {
      throw new BadRequestException(
        'Target course is required when target type is course',
      );
    }
    if (targetType === 'student' && !slotData.student_id) {
      throw new BadRequestException(
        'Target student is required when target type is student',
      );
    }

    const payload = {
      ...slotData,
      target_type: targetType,
      course_id: targetType === 'course' ? slotData.course_id : null,
      student_id: targetType === 'student' ? slotData.student_id : null,
      created_by: createdBy,
    };

    const { data, error } = await this.supabase
      .from('doubt_slots')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    const [hydrated] = await this.hydrateSlots([data]);

    // Automatically notify targeted audience if requested
    if (notify_students) {
      try {
        const topicText = hydrated.topic ? ` (${hydrated.topic})` : '';
        const timeText = hydrated.start_time
          ? hydrated.start_time.slice(0, 5)
          : '';

        if (targetType === 'student' && hydrated.student_id) {
          await this.notificationsService.send(
            hydrated.student_id,
            `New 1-on-1 Doubt Session: ${hydrated.topic || 'Doubt Clearing'}`,
            `A 1-on-1 session has been scheduled for you on ${hydrated.date} at ${timeText}.${hydrated.meeting_link ? ' Meeting link: ' + hydrated.meeting_link : ''}`,
            'doubt_session',
            {
              slot_id: hydrated.id,
              date: hydrated.date,
              start_time: hydrated.start_time,
              meeting_link: hydrated.meeting_link,
            },
          );
        } else if (targetType === 'course' && hydrated.course_id) {
          const courseTitle =
            hydrated.courses?.title || 'your course';
          await this.notificationsService.broadcast(
            `Doubt Session: ${courseTitle}${topicText}`,
            `A doubt clearing session for "${courseTitle}" is scheduled on ${hydrated.date} at ${timeText}. Book your slot now!`,
            'doubt_session',
            hydrated.course_id,
          );
        } else {
          await this.notificationsService.broadcast(
            `Doubt Session: ${hydrated.topic || 'General Doubt Clearing'}`,
            `A doubt clearing session is scheduled on ${hydrated.date} at ${timeText}. Book your slot now!`,
            'doubt_session',
          );
        }
      } catch {
        // Notification failure should not fail slot creation
      }
    }

    return hydrated;
  }

  async getSlots(filters?: {
    date?: string;
    status?: string;
    target_type?: string;
  }) {
    let query = this.supabase
      .from('doubt_slots')
      .select('*')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (filters?.date) query = query.eq('date', filters.date);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.target_type)
      query = query.eq('target_type', filters.target_type);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return this.hydrateSlots(data || []);
  }

  async getUpcomingSlots(studentId?: string) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await this.supabase
      .from('doubt_slots')
      .select('*')
      .eq('status', 'available')
      .gte('date', today)
      .order('date')
      .order('start_time');

    if (error) throw new BadRequestException(error.message);
    if (!data) return [];

    let filtered = data;

    if (!studentId) {
      filtered = data.filter((s) => !s.target_type || s.target_type === 'all');
    } else {
      // Retrieve student's active enrollments to filter course-targeted slots
      const { data: enrollments } = await this.supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', studentId)
        .eq('status', 'active');

      const enrolledCourseIds = new Set(
        (enrollments ?? []).map((e) => e.course_id),
      );

      filtered = data.filter((slot) => {
        if (!slot.target_type || slot.target_type === 'all') {
          return true;
        }
        if (slot.target_type === 'course') {
          return slot.course_id ? enrolledCourseIds.has(slot.course_id) : true;
        }
        if (slot.target_type === 'student') {
          return slot.student_id === studentId;
        }
        return true;
      });
    }

    return this.hydrateSlots(filtered);
  }

  async updateSlot(id: string, dto: UpdateSlotDto) {
    const updateData: Record<string, unknown> = { ...dto };
    if (dto.target_type === 'all') {
      updateData.course_id = null;
      updateData.student_id = null;
    } else if (dto.target_type === 'course') {
      updateData.student_id = null;
    } else if (dto.target_type === 'student') {
      updateData.course_id = null;
    }

    const { data, error } = await this.supabase
      .from('doubt_slots')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) throw new NotFoundException('Slot not found');
    const [hydrated] = await this.hydrateSlots([data]);
    return hydrated;
  }

  async deleteSlot(id: string) {
    // Cancel all active bookings before deleting the slot
    await this.supabase
      .from('doubt_bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('slot_id', id)
      .in('status', ['confirmed', 'pending']);

    const { error } = await this.supabase
      .from('doubt_slots')
      .delete()
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  async bookSlot(dto: BookSlotDto, studentId: string) {
    // Check slot availability
    const { data: slot, error: slotErr } = await this.supabase
      .from('doubt_slots')
      .select('*')
      .eq('id', dto.slot_id)
      .single();
    if (slotErr || !slot) throw new NotFoundException('Slot not found');
    if (slot.status !== 'available')
      throw new BadRequestException('Slot is not available');
    if (slot.current_bookings >= slot.max_bookings)
      throw new BadRequestException('Slot is full');

    // Enforce targeting rules for booking
    if (
      slot.target_type === 'student' &&
      slot.student_id &&
      slot.student_id !== studentId
    ) {
      throw new ForbiddenException(
        'You do not have permission to book this 1-on-1 doubt session',
      );
    }

    if (slot.target_type === 'course' && slot.course_id) {
      const { data: enrollment } = await this.supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId)
        .eq('course_id', slot.course_id)
        .eq('status', 'active')
        .maybeSingle();

      if (!enrollment) {
        throw new ForbiddenException(
          'You must be actively enrolled in the course to book this doubt session',
        );
      }
    }

    // Create booking
    const { data: booking, error } = await this.supabase
      .from('doubt_bookings')
      .insert({ slot_id: dto.slot_id, student_id: studentId })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505')
        throw new ConflictException('Already booked this slot');
      throw new BadRequestException(error.message);
    }

    // Increment current_bookings, mark full if needed
    const newCount = slot.current_bookings + 1;
    await this.supabase
      .from('doubt_slots')
      .update({
        current_bookings: newCount,
        status: newCount >= slot.max_bookings ? 'full' : 'available',
      })
      .eq('id', dto.slot_id);

    // Notify admins and student about new doubt session booking
    try {
      const { data: student } = await this.supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', studentId)
        .maybeSingle();

      const studentName = student?.full_name || student?.email || 'A student';
      await this.notificationsService.notifyAdmins(
        `New Doubt Session Booked`,
        `${studentName} booked a session for ${slot.date} at ${slot.start_time.slice(0, 5)} (${slot.topic || 'General'}).`,
        'doubt_booking',
        { booking_id: booking.id, slot_id: slot.id, student_id: studentId },
      );

      if (student?.email) {
        this.mailService
          .sendEmail({
            to: [student.email],
            subject: `Doubt Session Confirmed: ${slot.topic || 'General Session'}`,
            html: DoubtBookingSuccessMail({
              name: student.full_name ?? student.email,
              topic: slot.topic,
              date: slot.date,
              startTime: slot.start_time,
              endTime: slot.end_time,
              meetingLink: slot.meeting_link,
            }),
          })
          .catch((err) => {
            this.logger.warn({ err, studentId }, 'Failed to send doubt booking confirmation email');
          });
      }
    } catch {
      // Don't fail booking if notification fails
    }


    return booking;
  }

  async cancelBooking(bookingId: string, studentId: string) {
    const { data: booking, error: bErr } = await this.supabase
      .from('doubt_bookings')
      .select('*, doubt_slots(id, current_bookings)')
      .eq('id', bookingId)
      .eq('student_id', studentId)
      .single();
    if (bErr || !booking) throw new NotFoundException('Booking not found');
    if (booking.status === 'cancelled')
      throw new BadRequestException('Already cancelled');

    await this.supabase
      .from('doubt_bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', bookingId);

    // Decrement slot counter, reopen if was full
    const slot = booking.doubt_slots as {
      id: string;
      current_bookings: number;
    };
    const newCount = Math.max(0, (slot?.current_bookings ?? 1) - 1);
    await this.supabase
      .from('doubt_slots')
      .update({ current_bookings: newCount, status: 'available' })
      .eq('id', slot.id);
  }

  async getMyBookings(studentId: string) {
    const { data, error } = await this.supabase
      .from('doubt_bookings')
      .select(
        'id, slot_id, student_id, status, booked_at, cancelled_at, meeting_link, updated_at, doubt_slots(*)',
      )
      .eq('student_id', studentId)
      .neq('status', 'cancelled')
      .order('booked_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);

    if (!data || data.length === 0) return [];

    // Hydrate course info on slots
    const rawSlots = data
      .map((b) => (Array.isArray(b.doubt_slots) ? b.doubt_slots[0] : b.doubt_slots))
      .filter(Boolean);
    const hydratedSlots = await this.hydrateSlots(rawSlots);
    const slotMap = new Map(hydratedSlots.map((s) => [s.id, s]));

    return data.map((b) => {
      const slotObj = Array.isArray(b.doubt_slots) ? b.doubt_slots[0] : b.doubt_slots;
      return {
        ...b,
        doubt_slots: slotObj ? slotMap.get(slotObj.id) || slotObj : null,
      };
    });
  }

  async getSlotBookings(slotId: string) {
    const { data, error } = await this.supabase
      .from('doubt_bookings')
      .select('*')
      .eq('slot_id', slotId)
      .order('booked_at');
    if (error) throw new BadRequestException(error.message);

    if (!data || data.length === 0) return [];

    const studentIds = [
      ...new Set(data.map((b) => b.student_id).filter(Boolean)),
    ] as string[];
    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    return data.map((b) => ({
      ...b,
      profiles: profileMap.get(b.student_id) || null,
    }));
  }

  async updateBooking(bookingId: string, dto: UpdateBookingDto) {
    const { data, error } = await this.supabase
      .from('doubt_bookings')
      .update({ status: dto.status })
      .eq('id', bookingId)
      .select('*')
      .single();
    if (error || !data) throw new NotFoundException('Booking not found');
    return data;
  }
}
