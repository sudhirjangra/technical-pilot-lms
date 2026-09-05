import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import { uploadPublicImage } from '@/common/utils/storage';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyRequest } from 'fastify';
import { LessonsService } from '../lessons/lessons.service';
import { CreateCourseDto, UpdateCourseDto } from './dto';

type MultipartRequest = FastifyRequest & {
  file: () => Promise<{ mimetype: string; toBuffer: () => Promise<Buffer> } | undefined>;
};

@Injectable()
export class CoursesService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly lessonsService: LessonsService,
  ) {}

  async create(dto: CreateCourseDto, createdBy: string) {
    const { data, error } = await this.supabase
      .from('courses')
      .insert({ ...dto, created_by: createdBy })
      .select('*, categories(id, name, slug)')
      .single();
    if (error) {
      if (error.code === '23505')
        throw new BadRequestException('Course slug already exists');
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async findAll(filters?: { status?: string; category_id?: string }) {
    let query = this.supabase
      .from('courses')
      .select('*, categories(id, name, slug)')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findPublished() {
    const { data, error } = await this.supabase
      .from('courses')
      .select('*, categories(id, name, slug)')
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('courses')
      .select('*, categories(id, name, slug)')
      .eq('id', id)
      .single();
    if (error) throw new NotFoundException('Course not found');
    return data;
  }

  async findBySlug(slug: string) {
    const { data, error } = await this.supabase
      .from('courses')
      .select('*, categories(id, name, slug)')
      .eq('slug', slug)
      .single();
    if (error) throw new NotFoundException('Course not found');
    return data;
  }

  async update(id: string, dto: UpdateCourseDto) {
    const updatePayload: Record<string, unknown> = { ...dto };

    // Keep published_at consistent with the status transition.
    if (dto.status === 'published') {
      const existing = await this.findOne(id);
      if (!existing.published_at) {
        updatePayload.published_at = new Date().toISOString();
      }
    } else if (dto.status === 'draft') {
      updatePayload.published_at = null;
    }

    const { data, error } = await this.supabase
      .from('courses')
      .update(updatePayload)
      .eq('id', id)
      .select('*, categories(id, name, slug)')
      .single();
    if (error) {
      if (error.code === '23505')
        throw new BadRequestException('Course slug already exists');
      if (error.code === 'PGRST116')
        throw new NotFoundException('Course not found');
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async remove(id: string) {
    const { data: chapters } = await this.supabase
      .from('chapters')
      .select('id')
      .eq('course_id', id);
    const chapterIds = (chapters ?? []).map((c) => c.id as string);

    if (chapterIds.length > 0) {
      const { data: lessons } = await this.supabase
        .from('lessons')
        .select('id')
        .in('chapter_id', chapterIds);
      await Promise.all(
        (lessons ?? []).map((lesson) =>
          this.lessonsService.cleanupExternalContent(lesson.id as string),
        ),
      );
    }

    const { error } = await this.supabase.from('courses').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  async uploadThumbnail(id: string, request: FastifyRequest) {
    const { data: course } = await this.supabase
      .from('courses')
      .select('id')
      .eq('id', id)
      .single();
    if (!course) throw new NotFoundException('Course not found');

    const part = await (request as MultipartRequest).file();
    if (!part) throw new BadRequestException('A PNG, JPEG, or WEBP image is required');

    const ext = part.mimetype.split('/')[1];
    const publicUrl = await uploadPublicImage(
      this.supabase,
      `courses/${id}/thumbnail.${ext}`,
      await part.toBuffer(),
      part.mimetype,
    );

    const { data, error } = await this.supabase
      .from('courses')
      .update({ thumbnail_url: publicUrl })
      .eq('id', id)
      .select('*, categories(id, name, slug)')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getCourseLeaderboard(courseId: string, currentUserId: string) {
    // 1. Get enrollments for this course
    const { data: enrollments, error: enrollError } = await this.supabase
      .from('enrollments')
      .select('student_id, status, enrolled_at, completed_at')
      .eq('course_id', courseId)
      .in('status', ['active', 'completed']);

    if (enrollError) throw new BadRequestException(enrollError.message);
    if (!enrollments || enrollments.length === 0) {
      return { leaderboard: [], totalEnrolled: 0, currentUserRank: null };
    }

    const studentIds = enrollments.map((e) => e.student_id);

    // 2. Fetch profiles
    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', studentIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    // 3. Fetch course published lessons
    const { data: chapters } = await this.supabase
      .from('chapters')
      .select('id, is_published, lessons(id, lesson_type, is_published)')
      .eq('course_id', courseId)
      .eq('is_published', true);

    const publishedChapters = (chapters ?? []).filter((ch: { is_published?: boolean }) => ch.is_published !== false);
    const allLessons = publishedChapters.flatMap((ch: any) =>
      (ch.lessons ?? []).filter((l: any) => l.is_published !== false),
    );
    const lessonIds = allLessons.map((l: any) => l.id);
    const totalLessons = lessonIds.length;

    // 4. Fetch progress rows for enrolled students
    const { data: progressRows } = lessonIds.length && studentIds.length
      ? await this.supabase
          .from('progress')
          .select('student_id, lesson_id, status, progress_percent')
          .in('lesson_id', lessonIds)
          .in('student_id', studentIds)
      : { data: [] };

    const progressByStudent = new Map<string, any[]>();
    for (const p of progressRows ?? []) {
      const arr = progressByStudent.get(p.student_id) ?? [];
      arr.push(p);
      progressByStudent.set(p.student_id, arr);
    }

    // 5. Fetch tests & assignments best attempts for tie-breaking
    const testLessonIds = allLessons.filter((l: any) => l.lesson_type === 'test').map((l: any) => l.id);
    const assignmentLessonIds = allLessons.filter((l: any) => l.lesson_type === 'assignment').map((l: any) => l.id);

    const [testsRes, assignmentsRes] = await Promise.all([
      testLessonIds.length && studentIds.length
        ? this.supabase
            .from('tests')
            .select('id, lesson_id, test_attempts(student_id, score, max_score)')
            .in('lesson_id', testLessonIds)
            .in('test_attempts.student_id', studentIds)
        : Promise.resolve({ data: [] }),
      assignmentLessonIds.length && studentIds.length
        ? this.supabase
            .from('assignments')
            .select('id, lesson_id, assignment_attempts(student_id, score, max_score)')
            .in('lesson_id', assignmentLessonIds)
            .in('assignment_attempts.student_id', studentIds)
        : Promise.resolve({ data: [] }),
    ]);

    const studentScoreTotals = new Map<string, { totalPct: number; count: number }>();
    for (const t of (testsRes as any).data ?? []) {
      for (const a of t.test_attempts ?? []) {
        if (a.max_score > 0) {
          const pct = Math.round((a.score / a.max_score) * 100);
          const curr = studentScoreTotals.get(a.student_id) ?? { totalPct: 0, count: 0 };
          studentScoreTotals.set(a.student_id, { totalPct: curr.totalPct + pct, count: curr.count + 1 });
        }
      }
    }
    for (const asgn of (assignmentsRes as any).data ?? []) {
      for (const a of asgn.assignment_attempts ?? []) {
        if (a.max_score > 0) {
          const pct = Math.round((a.score / a.max_score) * 100);
          const curr = studentScoreTotals.get(a.student_id) ?? { totalPct: 0, count: 0 };
          studentScoreTotals.set(a.student_id, { totalPct: curr.totalPct + pct, count: curr.count + 1 });
        }
      }
    }

    // 6. Build entry list
    const entries = enrollments.map((e) => {
      const p = profileMap.get(e.student_id);
      const studentProgress = progressByStudent.get(e.student_id) ?? [];
      const completedLessons = studentProgress.filter((row: any) => row.status === 'completed').length;
      const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      const scoreData = studentScoreTotals.get(e.student_id);
      const avgScore = scoreData && scoreData.count > 0 ? Math.round(scoreData.totalPct / scoreData.count) : null;

      return {
        studentId: e.student_id,
        fullName: p?.full_name || 'Anonymous Student',
        avatarUrl: p?.avatar_url || null,
        progressPercent,
        completedLessons,
        totalLessons,
        avgScore,
        status: e.status,
        enrolledAt: e.enrolled_at,
        isCurrentUser: e.student_id === currentUserId,
      };
    });

    // 7. Sort: progressPercent desc, avgScore desc, completedLessons desc, enrolledAt asc
    entries.sort((a, b) => {
      if (b.progressPercent !== a.progressPercent) {
        return b.progressPercent - a.progressPercent;
      }
      const scoreB = b.avgScore ?? 0;
      const scoreA = a.avgScore ?? 0;
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return new Date(a.enrolledAt).getTime() - new Date(b.enrolledAt).getTime();
    });

    const leaderboard = entries.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    const currentUserRank = leaderboard.find((item) => item.isCurrentUser) ?? null;

    return {
      leaderboard,
      totalEnrolled: leaderboard.length,
      currentUserRank,
    };
  }
}
