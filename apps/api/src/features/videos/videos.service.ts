import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import { CreateVideoLessonDto, UpdateVideoLessonDto } from './dto';

const VDOCIPHER_BASE = 'https://dev.vdocipher.com/api';
const MAX_CONCURRENT_SESSIONS = 2;

@Injectable()
export class VideosService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly config: ConfigService,
  ) {}

  // ── Admin: link VdoCipher video to a lesson ──────────────────────────────

  async createVideoLesson(dto: CreateVideoLessonDto) {
    const { data: lesson } = await this.supabase
      .from('lessons')
      .select('id, lesson_type')
      .eq('id', dto.lesson_id)
      .single();
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.lesson_type !== 'video') throw new BadRequestException('Lesson type must be video');

    const { data, error } = await this.supabase
      .from('video_lessons')
      .insert(dto)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateVideoLesson(lessonId: string, dto: UpdateVideoLessonDto) {
    const { data, error } = await this.supabase
      .from('video_lessons')
      .update(dto)
      .eq('lesson_id', lessonId)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Video lesson not found');
    return data;
  }

  async deleteVideoLesson(lessonId: string) {
    const { error } = await this.supabase
      .from('video_lessons')
      .delete()
      .eq('lesson_id', lessonId);
    if (error) throw new BadRequestException(error.message);
  }

  // ── Student: generate OTP for secure playback ────────────────────────────

  async generateOtp(
    lessonId: string,
    userId: string,
    userEmail: string,
    ip: string,
    userAgent: string,
  ): Promise<{ otp: string; playbackInfo: string }> {
    // 1. Fetch video_lesson — lesson must exist and be a video
    const { data: videoLesson } = await this.supabase
      .from('video_lessons')
      .select('vdocipher_video_id, lesson_id')
      .eq('lesson_id', lessonId)
      .single();
    if (!videoLesson) throw new NotFoundException('Video not available');

    // 2. Verify enrollment (lesson → chapter → course)
    const { data: lessonRow } = await this.supabase
      .from('lessons')
      .select('id, is_published, chapters!inner(course_id)')
      .eq('id', lessonId)
      .single();
    if (!lessonRow || !lessonRow.is_published) throw new NotFoundException('Lesson not available');

    const courseId = (lessonRow.chapters as unknown as { course_id: string }).course_id;

    const { data: enrollment } = await this.supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .single();
    if (!enrollment) throw new ForbiddenException('Active enrollment required');

    // 3. Concurrent session guard — block account sharing
    const now = new Date().toISOString();
    const { count: activeSessions } = await this.supabase
      .from('video_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .gt('expires_at', now)
      .neq('ip_address', ip);

    if ((activeSessions ?? 0) >= MAX_CONCURRENT_SESSIONS) {
      throw new ForbiddenException('Too many concurrent sessions — possible account sharing');
    }

    // 4. Record this session (fire-and-forget — don't block OTP on DB write)
    const sessionExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    this.supabase.from('video_sessions').insert({
      user_id: userId,
      lesson_id: lessonId,
      ip_address: ip,
      user_agent: userAgent,
      expires_at: sessionExpiry,
    }).then(({ error }) => {
      if (error) console.error('video_sessions insert failed:', error.message);
    });

    // 5. Request OTP from VdoCipher with watermark
    const ttl = this.config.get<number>('VDOCIPHER_OTP_TTL_SECONDS') ?? 300;
    const apiSecret = this.config.get<string>('VDOCIPHER_API_SECRET');

    const watermark = {
      type: 'rtext',
      text: `${userEmail} | ${new Date().toLocaleDateString('en-IN')}`,
      alpha: '0.5',
      color: '0xFF0000',
      size: '12',
      interval: '4000',
    };

    let response;
    try {
      response = await axios.post(
        `${VDOCIPHER_BASE}/videos/${videoLesson.vdocipher_video_id}/otp`,
        { ttl, annotate: JSON.stringify([watermark]) },
        {
          headers: {
            Authorization: `Apisecret ${apiSecret}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: unknown; status?: number } };
      console.error('VdoCipher OTP error:', axiosErr.response?.status, JSON.stringify(axiosErr.response?.data));
      throw new BadRequestException(
        `VdoCipher error: ${JSON.stringify(axiosErr.response?.data ?? 'unknown')}`,
      );
    }

    return {
      otp: response.data.otp,
      playbackInfo: response.data.playbackInfo,
    };
  }

  // ── Admin: get video lesson details ─────────────────────────────────────

  async findByLesson(lessonId: string) {
    const { data, error } = await this.supabase
      .from('video_lessons')
      .select('*')
      .eq('lesson_id', lessonId)
      .single();
    if (error) throw new NotFoundException('Video lesson not found');
    return data;
  }

  async findByCourse(courseId: string) {
    // Get all lesson IDs for this course via chapters
    const { data: chapters } = await this.supabase
      .from('chapters')
      .select('lessons(id)')
      .eq('course_id', courseId);

    if (!chapters) return [];

    const lessonIds = (chapters as unknown as { lessons: { id: string }[] }[])
      .flatMap((ch) => ch.lessons.map((l) => l.id));

    if (lessonIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from('video_lessons')
      .select('*')
      .in('lesson_id', lessonIds);

    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }
}
