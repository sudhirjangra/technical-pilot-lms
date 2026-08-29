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
import type { FastifyRequest } from 'fastify';
import { CreateVideoLessonDto, UpdateVideoLessonDto } from './dto';

const VDOCIPHER_BASE = 'https://dev.vdocipher.com/api';
const MAX_CONCURRENT_SESSIONS = 2;

type MultipartRequest = FastifyRequest & {
  file: () => Promise<{
    filename: string;
    mimetype: string;
    toBuffer: () => Promise<Buffer>;
  } | undefined>;
};

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Fields VdoCipher returns inside `clientPayload`, in the order AWS S3 expects.
 * `uploadLink` is the POST target rather than a form field, and `file` must be
 * appended last — S3 ignores every field that follows the file part.
 */
const S3_POLICY_FIELDS = [
  'x-amz-credential',
  'x-amz-algorithm',
  'x-amz-date',
  'x-amz-signature',
  'key',
  'policy',
] as const;

function describeAxiosError(step: string, err: unknown): string {
  const axiosErr = err as {
    response?: { status?: number; data?: unknown };
    message?: string;
  };
  const status = axiosErr.response?.status;
  const body = axiosErr.response?.data;
  const rendered =
    typeof body === 'string' ? body : body ? JSON.stringify(body) : undefined;
  return `VdoCipher ${step} failed${status ? ` (HTTP ${status})` : ''}: ${
    rendered ?? axiosErr.message ?? 'unknown error'
  }`;
}

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
    if (lesson.lesson_type !== 'video')
      throw new BadRequestException('Lesson type must be video');

    const { data, error } = await this.supabase
      .from('video_lessons')
      .insert(dto)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async uploadVideo(lessonId: string, request: FastifyRequest) {
    const { data: lesson } = await this.supabase
      .from('lessons')
      .select('id, title, lesson_type, chapters(title, courses(title, slug))')
      .eq('id', lessonId)
      .single();
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.lesson_type !== 'video')
      throw new BadRequestException('Lesson type must be video');

    const part = await (request as MultipartRequest).file();
    if (!part || !part.mimetype.startsWith('video/'))
      throw new BadRequestException('A video file is required');

    const chapter = lesson.chapters as unknown as {
      title: string;
      courses: { title: string; slug: string };
    };
    const title = `${chapter.courses.title} / ${chapter.title} / ${lesson.title}`;
    const headers = {
      Authorization: `Apisecret ${this.config.get('VDOCIPHER_API_SECRET')}`,
      Accept: 'application/json',
    };

    // Folders are a convenience only — never let them block an upload.
    const courseFolderId = await this.resolveFolder(
      slug(chapter.courses.slug),
      'root',
      headers,
    );
    const folderId = await this.resolveFolder(
      slug(chapter.title),
      courseFolderId,
      headers,
    );

    let response;
    try {
      response = await axios.put(`${VDOCIPHER_BASE}/videos`, undefined, {
        headers,
        params: { title, folderId },
      });
    } catch (err) {
      throw new BadRequestException(
        describeAxiosError('upload credentials request', err),
      );
    }

    const videoId = response.data.videoId as string;
    const clientPayload = response.data.clientPayload as
      | Record<string, string>
      | undefined;
    const uploadLink = clientPayload?.uploadLink;
    if (!videoId || !clientPayload || !uploadLink)
      throw new BadRequestException('VdoCipher did not return an upload link');

    // Field order matters: every policy field first, then `file` last. S3 also
    // rejects the POST (HTTP 403) unless success_action_* are present, because
    // VdoCipher's signed policy declares conditions for them.
    const form = new FormData();
    for (const field of S3_POLICY_FIELDS) {
      const value = clientPayload[field];
      if (value !== undefined) form.append(field, value);
    }
    form.append('success_action_status', '201');
    form.append('success_action_redirect', '');
    form.append(
      'file',
      new Blob([new Uint8Array(await part.toBuffer())], { type: part.mimetype }),
      part.filename,
    );

    try {
      // No Authorization header here: this posts to AWS S3, not VdoCipher.
      await axios.post(uploadLink, form, {
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        validateStatus: (status) => status >= 200 && status < 400,
      });
    } catch (err) {
      throw new BadRequestException(describeAxiosError('file upload', err));
    }

    const { data, error } = await this.supabase
      .from('video_lessons')
      .upsert({ lesson_id: lessonId, vdocipher_video_id: videoId }, { onConflict: 'lesson_id' })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return { ...data, folder: `${slug(chapter.courses.slug)}/${slug(chapter.title)}` };
  }

  /**
   * Returns the id of the named child folder, creating it when needed.
   * Folder organisation is cosmetic, so any VdoCipher failure here (including
   * plan-gated folder APIs returning 403) falls back to the parent folder
   * rather than aborting the upload.
   */
  private async resolveFolder(
    name: string,
    parent: string,
    headers: Record<string, string>,
  ): Promise<string> {
    if (!name) return parent;
    try {
      const { data } = await axios.post(
        `${VDOCIPHER_BASE}/videos/folders`,
        { name, parent },
        { headers },
      );
      return (data?.id ?? data?.folderId ?? parent) as string;
    } catch (err) {
      console.warn(describeAxiosError(`folder "${name}" creation`, err));
      return parent;
    }
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
    // Best-effort cleanup of the hosted VdoCipher asset before dropping the row.
    const { data: videoLesson } = await this.supabase
      .from('video_lessons')
      .select('vdocipher_video_id')
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (videoLesson?.vdocipher_video_id) {
      await this.deleteVdoCipherAsset(videoLesson.vdocipher_video_id as string);
    }

    const { error } = await this.supabase
      .from('video_lessons')
      .delete()
      .eq('lesson_id', lessonId);
    if (error) throw new BadRequestException(error.message);
  }

  /**
   * Deletes a video asset from VdoCipher. Best-effort: logs and swallows
   * errors so a provider outage never blocks lesson/chapter/course deletion.
   */
  async deleteVdoCipherAsset(videoId: string) {
    try {
      await axios.delete(`${VDOCIPHER_BASE}/videos`, {
        headers: {
          Authorization: `Apisecret ${this.config.get('VDOCIPHER_API_SECRET')}`,
          Accept: 'application/json',
        },
        params: { videos: videoId },
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: unknown; status?: number } };
      console.error(
        'VdoCipher delete error:',
        axiosErr.response?.status,
        JSON.stringify(axiosErr.response?.data),
      );
    }
  }

  // ── Student: generate OTP for secure playback ────────────────────────────

  async generateOtp(
    lessonId: string,
    userId: string,
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
    if (!lessonRow || !lessonRow.is_published)
      throw new NotFoundException('Lesson not available');

    const courseId = (lessonRow.chapters as unknown as { course_id: string })
      .course_id;

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
      throw new ForbiddenException(
        'Too many concurrent sessions — possible account sharing',
      );
    }

    // 4. Record this session (fire-and-forget — don't block OTP on DB write)
    const sessionExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    this.supabase
      .from('video_sessions')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        ip_address: ip,
        user_agent: userAgent,
        expires_at: sessionExpiry,
      })
      .then(({ error }) => {
        if (error)
          console.error('video_sessions insert failed:', error.message);
      });

    // 5. Request OTP from VdoCipher with watermark
    const ttl = this.config.get<number>('VDOCIPHER_OTP_TTL_SECONDS') ?? 300;
    const apiSecret = this.config.get<string>('VDOCIPHER_API_SECRET');

    const watermark = {
      type: 'rtext',
      text: 'Technical Pilot. All rights reserved 2026.',
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
      const axiosErr = err as {
        response?: { data?: unknown; status?: number };
      };
      console.error(
        'VdoCipher OTP error:',
        axiosErr.response?.status,
        JSON.stringify(axiosErr.response?.data),
      );
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

    const lessonIds = (
      chapters as unknown as { lessons: { id: string }[] }[]
    ).flatMap((ch) => ch.lessons.map((l) => l.id));

    if (lessonIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from('video_lessons')
      .select('*')
      .in('lesson_id', lessonIds);

    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }
}
