import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import { MailService } from '@/features/mail/mail.service';
import { CoursePurchaseSuccessMail } from '@/features/mail/templates';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'nestjs-pino';
import { CreateEnrollmentDto, ListEnrollmentsQueryDto, UpdateEnrollmentDto } from './dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly mailService: MailService,
    private readonly logger: Logger,
  ) {}


  async create(dto: CreateEnrollmentDto) {
    // Check if course exists and is published
    const { data: course, error: courseErr } = await this.supabase
      .from('courses')
      .select('id, status, price, discount_price')
      .eq('id', dto.course_id)
      .single();
    if (courseErr || !course) throw new NotFoundException('Course not found');
    if (course.status !== 'published')
      throw new BadRequestException('Course is not available for enrollment');

    const { data, error } = await this.supabase
      .from('enrollments')
      .insert(dto)
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505')
        throw new ConflictException(
          'Student is already enrolled in this course',
        );
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async findByStudent(studentId: string) {
    const { data, error } = await this.supabase
      .from('enrollments')
      .select('*, courses(id, title, slug, thumbnail_url, status)')
      .eq('student_id', studentId)
      .order('enrolled_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findByCourse(courseId: string) {
    const { data, error } = await this.supabase
      .from('enrollments')
      .select(
        '*, profiles(id, full_name, email, avatar_url), courses(id, title, slug, thumbnail_url, status)',
      )
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /** Admin: paginated listing of every enrollment, with optional filters */
  async findAll(query: ListEnrollmentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let studentIds: string[] | null = null;
    const search = query.search?.trim();
    if (search) {
      // Resolve matching students first — filtering an embedded relation does
      // not restrict the parent rows reliably.
      const { data: profiles, error: profilesError } = await this.supabase
        .from('profiles')
        .select('id')
        .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      if (profilesError) throw new BadRequestException(profilesError.message);
      studentIds = (profiles ?? []).map((p: { id: string }) => p.id);
      if (studentIds.length === 0) {
        return { data: [], meta: { total: 0, page, limit } };
      }
    }

    let request = this.supabase
      .from('enrollments')
      .select(
        '*, profiles(id, full_name, email, avatar_url), courses(id, title, slug, thumbnail_url, status)',
        { count: 'exact' },
      );

    if (query.studentId) request = request.eq('student_id', query.studentId);
    if (query.courseId) request = request.eq('course_id', query.courseId);
    if (query.status) request = request.eq('status', query.status);
    if (studentIds) request = request.in('student_id', studentIds);

    const { data, error, count } = await request
      .order('enrolled_at', { ascending: false })
      .range(from, to);

    if (error) throw new BadRequestException(error.message);
    return { data: data ?? [], meta: { total: count ?? 0, page, limit } };
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('enrollments')
      .select('*, courses(id, title, slug), profiles(id, full_name, email)')
      .eq('id', id)
      .single();
    if (error) throw new NotFoundException('Enrollment not found');
    return data;
  }

  async update(id: string, dto: UpdateEnrollmentDto) {
    const updatePayload: Record<string, unknown> = { ...dto };
    if (dto.status === 'completed') {
      updatePayload.completed_at = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .from('enrollments')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Enrollment not found');
    return data;
  }

  /** Student self-enroll in a free (price=0) course */
  async enrollFree(studentId: string, courseId: string) {
    const { data: course, error: courseErr } = await this.supabase
      .from('courses')
      .select('id, title, status, price, discount_price')
      .eq('id', courseId)
      .single();
    if (courseErr || !course) throw new NotFoundException('Course not found');
    if (course.status !== 'published')
      throw new BadRequestException('Course is not available for enrollment');

    const effectivePrice = course.discount_price ?? course.price;
    if (Number(effectivePrice) !== 0) {
      throw new BadRequestException(
        'Course is not free — complete payment to enroll',
      );
    }

    const { data, error } = await this.supabase
      .from('enrollments')
      .upsert(
        {
          student_id: studentId,
          course_id: courseId,
          status: 'active',
          enrolled_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,course_id' },
      )
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505')
        throw new ConflictException('Already enrolled in this course');
      throw new BadRequestException(error.message);
    }

    // Send confirmation email asynchronously
    this.sendFreeEnrollmentReceiptEmail(studentId, course.title, courseId).catch(
      (err) => {
        this.logger.warn({ err, studentId, courseId }, 'Failed to dispatch free enrollment email');
      },
    );

    return data;
  }

  private async sendFreeEnrollmentReceiptEmail(
    studentId: string,
    courseTitle: string,
    courseId: string,
  ): Promise<void> {
    try {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', studentId)
        .maybeSingle();

      if (profile?.email) {
        await this.mailService.sendEmail({
          to: [profile.email],
          subject: `Enrollment Confirmed: ${courseTitle}`,
          html: CoursePurchaseSuccessMail({
            name: profile.full_name ?? profile.email,
            courseTitle,
            courseId,
            amount: 0,
            purchaseDate: new Date(),
          }),
        });
      }
    } catch (err) {
      this.logger.warn({ err, studentId, courseId }, 'Failed to send free enrollment receipt email');
    }
  }

  /** Verify a student is enrolled in a specific course (active or completed enrollment, and not archived) */
  async verifyEnrollment(
    studentId: string,
    courseId: string,
  ): Promise<boolean> {
    const { data } = await this.supabase
      .from('enrollments')
      .select('id, courses(status)')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .in('status', ['active', 'completed'])
      .maybeSingle();

    if (!data) return false;
    const course = data.courses as unknown as { status?: string } | null;
    if (course?.status === 'archived') return false;

    return true;
  }
}

