import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateEnrollmentDto, UpdateEnrollmentDto } from './dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  async create(dto: CreateEnrollmentDto) {
    // Check if course exists and is published
    const { data: course, error: courseErr } = await this.supabase
      .from('courses')
      .select('id, status, price, discount_price')
      .eq('id', dto.course_id)
      .single();
    if (courseErr || !course) throw new NotFoundException('Course not found');
    if (course.status !== 'published') throw new BadRequestException('Course is not available for enrollment');

    const { data, error } = await this.supabase
      .from('enrollments')
      .insert(dto)
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') throw new ConflictException('Student is already enrolled in this course');
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
      .select('*, profiles(id, full_name, email, avatar_url)')
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data;
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
      .select('id, status, price, discount_price')
      .eq('id', courseId)
      .single();
    if (courseErr || !course) throw new NotFoundException('Course not found');
    if (course.status !== 'published') throw new BadRequestException('Course is not available for enrollment');

    const effectivePrice = course.discount_price ?? course.price;
    if (Number(effectivePrice) !== 0) {
      throw new BadRequestException('Course is not free — complete payment to enroll');
    }

    const { data, error } = await this.supabase
      .from('enrollments')
      .insert({ student_id: studentId, course_id: courseId, status: 'active' })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') throw new ConflictException('Already enrolled in this course');
      throw new BadRequestException(error.message);
    }
    return data;
  }

  /** Verify a student is enrolled in a specific course (active enrollment) */
  async verifyEnrollment(studentId: string, courseId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .single();
    return !!data;
  }
}
