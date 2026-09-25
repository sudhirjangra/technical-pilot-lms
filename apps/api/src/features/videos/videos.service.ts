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
  file: () => Promise<
    | {
        filename: string;
        mimetype: string;
        toBuffer: () => Promise<Buffer>;
      }
    | undefined
  >;
};

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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
  } | null | undefined;
  const status = axiosErr?.response?.status;
  const body = axiosErr?.response?.data;
  const rendered =
    typeof body === 'string' ? body : body ? JSON.stringify(body) : undefined;
  return `VdoCipher ${step} failed${status ? ` (HTTP ${status})` : ''}: ${
    rendered ?? axiosErr?.message ?? 'unknown error'
  }`;
}

@Injectable()
export class VideosService {
  /** Caches resolved `parent/name` → folderId so repeat uploads skip the lookup. */
  private readonly folderCache = new Map<string, string>();

  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly config: ConfigService,
  ) {}

  // ── Admin: link VdoCipher video to a lesson ──────────────────────────────

  private async fetchVdoCipherDetails(videoId: string): Promise<{
    durationSeconds?: number;
    thumbnailUrl?: string;
  }> {
    const apiSecret = this.config.get<string>('VDOCIPHER_API_SECRET');
    if (!apiSecret || !videoId) return {};
    try {
      const response = await axios.get(`${VDOCIPHER_BASE}/videos/${videoId}`, {
        headers: {
          Authorization: `Apisecret ${apiSecret}`,
          Accept: 'application/json',
        },
      });
      const data = response.data;
      const durationSeconds =
        typeof data?.length === 'number' ? Math.round(data.length) : undefined;
      const posters = data?.posters;
      const thumbnailUrl =
        Array.isArray(posters) && posters.length > 0
          ? posters[posters.length - 1]?.url
          : undefined;
      return { durationSeconds, thumbnailUrl };
    } catch (err) {
      console.warn(describeAxiosError(`details fetch for "${videoId}"`, err));
      return {};
    }
  }

  async createVideoLesson(dto: CreateVideoLessonDto) {
    const { data: lesson } = await this.supabase
      .from('lessons')
      .select('id, lesson_type')
      .eq('id', dto.lesson_id)
      .single();
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.lesson_type !== 'video')
      throw new BadRequestException('Lesson type must be video');

    const cleanVideoId = dto.vdocipher_video_id?.trim();
    if (!cleanVideoId) {
      throw new BadRequestException('VdoCipher Video ID is required');
    }

    const { durationSeconds, thumbnailUrl } =
      await this.fetchVdoCipherDetails(cleanVideoId);

    const payload: Record<string, unknown> = {
      lesson_id: dto.lesson_id,
      vdocipher_video_id: cleanVideoId,
    };
    if (dto.thumbnail_url || thumbnailUrl) {
      payload.thumbnail_url = dto.thumbnail_url ?? thumbnailUrl;
    }
    if (durationSeconds !== undefined) {
      payload.duration_seconds = durationSeconds;
    }

    const { data: existing } = await this.supabase
      .from('video_lessons')
      .select('id')
      .eq('lesson_id', dto.lesson_id)
      .maybeSingle();

    const query = existing
      ? this.supabase.from('video_lessons').update(payload).eq('id', existing.id)
      : this.supabase.from('video_lessons').insert(payload);

    const { data, error } = await query.select().single();
    if (error) throw new BadRequestException(error.message);

    if (durationSeconds !== undefined) {
      await this.supabase
        .from('lessons')
        .update({ duration_seconds: durationSeconds })
        .eq('id', dto.lesson_id);
    }

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

    const chapter = lesson.chapters as unknown as
      | {
          title?: string;
          courses?: { title?: string; slug?: string };
        }
      | undefined;
    const courseTitle = chapter?.courses?.title ?? 'Course';
    const courseSlug = chapter?.courses?.slug ?? 'course';
    const chapterTitle = chapter?.title ?? 'Chapter';
    const title = `${courseTitle} / ${chapterTitle} / ${lesson.title}`;
    const headers = {
      Authorization: `Apisecret ${this.config.get('VDOCIPHER_API_SECRET')}`,
      Accept: 'application/json',
    };

    // Folders are a convenience only — never let them block an upload.
    const courseFolderId = await this.resolveFolder(
      slug(courseSlug),
      'root',
      headers,
    );
    const folderId = await this.resolveFolder(
      slug(chapterTitle),
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
      Record<string, string> | undefined;
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
      new Blob([new Uint8Array(await part.toBuffer())], {
        type: part.mimetype,
      }),
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
      // Clean up VdoCipher asset immediately so it never shows as uploading 0kb
      await this.deleteVdoCipherAsset(videoId).catch(() => {});
      throw new BadRequestException(describeAxiosError('file upload', err));
    }

    try {
      const { data, error } = await this.supabase
        .from('video_lessons')
        .upsert(
          { lesson_id: lessonId, vdocipher_video_id: videoId },
          { onConflict: 'lesson_id' },
        )
        .select()
        .single();
      if (error) throw new BadRequestException(error.message);
      return {
        ...data,
        folder: `${slug(courseSlug)}/${slug(chapterTitle)}`,
      };
    } catch (dbErr) {
      await this.deleteVdoCipherAsset(videoId).catch(() => {});
      throw dbErr;
    }
  }

  /**
   * Generates direct upload credentials for client-side direct upload to AWS S3.
   * This bypasses the API server buffer, enabling fast, full-speed uploads for long/large videos,
   * accurate upload progress tracking, and zero server RAM usage.
   */
  async getUploadCredentials(lessonId: string): Promise<{
    videoId: string;
    clientPayload: Record<string, string>;
    folder: string;
  }> {
    const { data: lesson } = await this.supabase
      .from('lessons')
      .select('id, title, lesson_type, chapters(title, courses(title, slug))')
      .eq('id', lessonId)
      .single();
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.lesson_type !== 'video')
      throw new BadRequestException('Lesson type must be video');

    const chapter = lesson.chapters as unknown as
      | {
          title?: string;
          courses?: { title?: string; slug?: string };
        }
      | undefined;
    const courseTitle = chapter?.courses?.title ?? 'Course';
    const courseSlug = chapter?.courses?.slug ?? 'course';
    const chapterTitle = chapter?.title ?? 'Chapter';
    const title = `${courseTitle} / ${chapterTitle} / ${lesson.title}`;
    const headers = {
      Authorization: `Apisecret ${this.config.get('VDOCIPHER_API_SECRET')}`,
      Accept: 'application/json',
    };

    const courseFolderId = await this.resolveFolder(
      slug(courseSlug),
      'root',
      headers,
    );
    const folderId = await this.resolveFolder(
      slug(chapterTitle),
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
    if (!videoId || !clientPayload) {
      throw new BadRequestException('VdoCipher did not return upload credentials');
    }

    return {
      videoId,
      clientPayload,
      folder: `${slug(courseSlug)}/${slug(chapterTitle)}`,
    };
  }

  /**
   * Finalizes video registration after the client finishes uploading directly to S3.
   * Fetches metadata from VdoCipher and saves the video_lessons row in Supabase.
   */
  async completeUpload(lessonId: string, videoId: string) {
    const cleanVideoId = videoId?.trim();
    if (!cleanVideoId) {
      throw new BadRequestException('VdoCipher video ID is required');
    }

    const { data: lesson } = await this.supabase
      .from('lessons')
      .select('id, lesson_type')
      .eq('id', lessonId)
      .single();
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.lesson_type !== 'video')
      throw new BadRequestException('Lesson type must be video');

    const { durationSeconds, thumbnailUrl } =
      await this.fetchVdoCipherDetails(cleanVideoId);

    const payload: Record<string, unknown> = {
      lesson_id: lessonId,
      vdocipher_video_id: cleanVideoId,
    };
    if (thumbnailUrl) payload.thumbnail_url = thumbnailUrl;
    if (durationSeconds !== undefined) payload.duration_seconds = durationSeconds;

    const { data, error } = await this.supabase
      .from('video_lessons')
      .upsert(payload, { onConflict: 'lesson_id' })
      .select()
      .single();

    if (error) {
      await this.deleteVdoCipherAsset(cleanVideoId).catch(() => {});
      throw new BadRequestException(error.message);
    }

    if (durationSeconds !== undefined) {
      await this.supabase
        .from('lessons')
        .update({ duration_seconds: durationSeconds })
        .eq('id', lessonId);
    }

    return data;
  }

  /**
   * Cancels an incomplete or aborted upload, immediately deleting the VdoCipher asset
   * so it does NOT show up as "uploading [0kb]" in VdoCipher dashboard.
   */
  async cancelUpload(videoId: string) {
    const cleanVideoId = videoId?.trim();
    if (!cleanVideoId) return { success: true };

    await this.deleteVdoCipherAsset(cleanVideoId);

    return { success: true };
  }

  /**
   * Returns the id of the named child folder, reusing an existing one when
   * present so repeat uploads do not pile up duplicate subfolders.
   *
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

    const cacheKey = `${parent}/${name}`;
    const cached = this.folderCache.get(cacheKey);
    if (cached) return cached;

    const existing = await this.findChildFolder(name, parent, headers);
    if (existing) {
      this.folderCache.set(cacheKey, existing);
      return existing;
    }

    try {
      const { data } = await axios.post(
        `${VDOCIPHER_BASE}/videos/folders`,
        { name, parent },
        { headers, timeout: 2500 },
      );
      const created = (data?.id ?? data?.folderId) as string | undefined;
      if (!created) return parent;
      this.folderCache.set(cacheKey, created);
      return created;
    } catch (err) {
      console.warn(describeAxiosError(`folder "${name}" creation`, err));
      return parent;
    }
  }

  /** Looks for an existing direct child folder by name. Returns undefined on any failure. */
  private async findChildFolder(
    name: string,
    parent: string,
    headers: Record<string, string>,
  ): Promise<string | undefined> {
    try {
      const { data } = await axios.get(
        `${VDOCIPHER_BASE}/videos/folders/${parent}`,
        {
          headers,
          timeout: 2500,
        },
      );
      const children: Array<Record<string, unknown>> =
        data?.folderList ?? data?.folders ?? data?.children ?? [];
      const match = children.find(
        (folder) =>
          typeof folder?.name === 'string' &&
          folder.name.toLowerCase() === name.toLowerCase(),
      );
      if (!match) return undefined;
      return (match.id ?? match.folderId) as string | undefined;
    } catch (err) {
      console.warn(describeAxiosError(`folder listing for "${parent}"`, err));
      return undefined;
    }
  }

  async updateVideoLesson(lessonId: string, dto: UpdateVideoLessonDto) {
    const videoId = dto.vdocipher_video_id?.trim();
    let durationSeconds: number | undefined;
    let thumbnailUrl = dto.thumbnail_url;

    if (videoId) {
      const details = await this.fetchVdoCipherDetails(videoId);
      durationSeconds = details.durationSeconds;
      if (!thumbnailUrl) thumbnailUrl = details.thumbnailUrl;
    }

    const payload: Record<string, unknown> = {
      lesson_id: lessonId,
      ...(videoId ? { vdocipher_video_id: videoId } : {}),
      ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
      ...(durationSeconds !== undefined
        ? { duration_seconds: durationSeconds }
        : {}),
    };

    const { data: existing } = await this.supabase
      .from('video_lessons')
      .select('id')
      .eq('lesson_id', lessonId)
      .maybeSingle();

    const query = existing
      ? this.supabase.from('video_lessons').update(payload).eq('id', existing.id)
      : this.supabase.from('video_lessons').insert(payload);

    const { data, error } = await query.select().single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Video lesson not found');

    if (durationSeconds !== undefined) {
      await this.supabase
        .from('lessons')
        .update({ duration_seconds: durationSeconds })
        .eq('id', lessonId);
    }

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
   * Deletes one or more video assets from VdoCipher. Best-effort: logs and swallows
   * errors so a provider outage never blocks lesson/chapter/course deletion.
   */
  async deleteVdoCipherAsset(videoIds: string | string[]) {
    const ids = (Array.isArray(videoIds) ? videoIds : [videoIds])
      .map((id) => (typeof id === 'string' ? id.trim() : ''))
      .filter((id): id is string => !!id);
    if (ids.length === 0) return;

    const apiSecret = this.config.get('VDOCIPHER_API_SECRET');
    if (!apiSecret) return;

    try {
      await axios.delete(`${VDOCIPHER_BASE}/videos`, {
        headers: {
          Authorization: `Apisecret ${apiSecret}`,
          Accept: 'application/json',
        },
        params: { videos: ids.join(',') },
      });
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: unknown; status?: number };
      };
      console.error(
        'VdoCipher delete error:',
        axiosErr.response?.status,
        JSON.stringify(axiosErr.response?.data),
      );
    }
  }

  /**
   * Deletes a folder in VdoCipher.
   */
  async deleteFolder(folderId: string, headers?: Record<string, string>) {
    if (!folderId || folderId === 'root') return;
    const apiSecret = this.config.get('VDOCIPHER_API_SECRET');
    if (!apiSecret) return;

    const authHeaders = headers ?? {
      Authorization: `Apisecret ${apiSecret}`,
      Accept: 'application/json',
    };

    try {
      await axios.delete(`${VDOCIPHER_BASE}/videos/folders/${folderId}`, {
        headers: authHeaders,
      });
    } catch (err) {
      console.warn(describeAxiosError(`folder deletion "${folderId}"`, err));
    }
  }

  /**
   * Lists and deletes all videos inside a VdoCipher folder.
   */
  private async deleteVideosInFolder(
    folderId: string,
    headers: Record<string, string>,
  ) {
    if (!folderId) return;
    try {
      const { data } = await axios.get(
        `${VDOCIPHER_BASE}/videos?folderId=${folderId}&limit=100`,
        { headers },
      );
      const rows: Array<Record<string, unknown>> = data?.rows ?? [];
      const videoIds = rows
        .map((r) => r.id as string)
        .filter((id): id is string => typeof id === 'string' && !!id);

      if (videoIds.length > 0) {
        await this.deleteVdoCipherAsset(videoIds);
      }
    } catch (err) {
      console.warn(
        describeAxiosError(`listing/deleting videos in folder "${folderId}"`, err),
      );
    }
  }

  /**
   * Deletes all VdoCipher content for an entire course:
   * 1. Finds the course folder in VdoCipher.
   * 2. For each chapter folder inside: deletes all videos first, then deletes the chapter folder.
   * 3. Deletes any videos placed directly in the course folder.
   * 4. Deletes the course folder itself.
   * 5. Deletes any video IDs from database video_lessons for this course (in case some were outside the folder).
   * 6. Clears the folder cache.
   */
  async deleteCourseVdoCipherContent(courseSlug: string, courseId: string) {
    const apiSecret = this.config.get('VDOCIPHER_API_SECRET');
    if (!apiSecret) return;

    const headers = {
      Authorization: `Apisecret ${apiSecret}`,
      Accept: 'application/json',
    };

    const courseSlugStr = slug(courseSlug);

    try {
      const courseFolderId = await this.findChildFolder(
        courseSlugStr,
        'root',
        headers,
      );

      if (courseFolderId) {
        try {
          const { data: folderData } = await axios.get(
            `${VDOCIPHER_BASE}/videos/folders/${courseFolderId}`,
            { headers },
          );
          const childFolders: Array<Record<string, unknown>> =
            folderData?.folderList ??
            folderData?.folders ??
            folderData?.children ??
            [];

          for (const child of childFolders) {
            const childId = (child.id ?? child.folderId) as string | undefined;
            if (childId) {
              await this.deleteVideosInFolder(childId, headers);
              await this.deleteFolder(childId, headers);
            }
          }
        } catch (err) {
          console.warn(
            describeAxiosError(
              `fetching child folders for course "${courseSlug}"`,
              err,
            ),
          );
        }

        await this.deleteVideosInFolder(courseFolderId, headers);
        await this.deleteFolder(courseFolderId, headers);
      }
    } catch (err) {
      console.warn(
        describeAxiosError(
          `course VdoCipher content deletion for "${courseSlug}"`,
          err,
        ),
      );
    }

    // Delete any remaining video IDs from database records for this course
    try {
      const { data: chapters } = await this.supabase
        .from('chapters')
        .select('id, lessons(id, video_lessons(vdocipher_video_id))')
        .eq('course_id', courseId);

      const dbVideoIds = new Set<string>();
      for (const ch of chapters ?? []) {
        const lessons =
          (
            ch as unknown as {
              lessons?: Array<{
                video_lessons?:
                  | Array<{ vdocipher_video_id?: string }>
                  | { vdocipher_video_id?: string };
              }>;
            }
          ).lessons ?? [];
        for (const l of lessons) {
          const vls = Array.isArray(l.video_lessons)
            ? l.video_lessons
            : l.video_lessons
              ? [l.video_lessons]
              : [];
          for (const vl of vls) {
            if (vl?.vdocipher_video_id) {
              dbVideoIds.add(vl.vdocipher_video_id);
            }
          }
        }
      }

      if (dbVideoIds.size > 0) {
        await this.deleteVdoCipherAsset([...dbVideoIds]);
      }
    } catch (err) {
      console.warn(
        'Failed to query DB video IDs during course deletion cleanup:',
        err,
      );
    }

    for (const key of this.folderCache.keys()) {
      if (key.includes(courseSlugStr)) {
        this.folderCache.delete(key);
      }
    }
  }

  /**
   * Deletes all VdoCipher content for a specific chapter:
   * 1. Finds the chapter folder inside the course folder.
   * 2. Deletes all videos inside the chapter folder first.
   * 3. Deletes the chapter folder.
   * 4. Deletes any video IDs from database video_lessons for this chapter.
   * 5. Clears the folder cache.
   */
  async deleteChapterVdoCipherContent(
    courseSlug: string,
    chapterTitle: string,
    chapterId: string,
  ) {
    const apiSecret = this.config.get('VDOCIPHER_API_SECRET');
    if (!apiSecret) return;

    const headers = {
      Authorization: `Apisecret ${apiSecret}`,
      Accept: 'application/json',
    };

    const courseSlugStr = slug(courseSlug);
    const chapterTitleStr = slug(chapterTitle);

    try {
      const courseFolderId = await this.findChildFolder(
        courseSlugStr,
        'root',
        headers,
      );

      if (courseFolderId) {
        const chapterFolderId = await this.findChildFolder(
          chapterTitleStr,
          courseFolderId,
          headers,
        );

        if (chapterFolderId) {
          await this.deleteVideosInFolder(chapterFolderId, headers);
          await this.deleteFolder(chapterFolderId, headers);
        }
      }
    } catch (err) {
      console.warn(
        describeAxiosError(
          `chapter VdoCipher content deletion for "${chapterTitle}"`,
          err,
        ),
      );
    }

    try {
      const { data: lessons } = await this.supabase
        .from('lessons')
        .select('id, video_lessons(vdocipher_video_id))')
        .eq('chapter_id', chapterId);

      const dbVideoIds = new Set<string>();
      for (const l of lessons ?? []) {
        const vls = Array.isArray((l as any).video_lessons)
          ? (l as any).video_lessons
          : (l as any).video_lessons
            ? [(l as any).video_lessons]
            : [];
        for (const vl of vls) {
          if (vl?.vdocipher_video_id) {
            dbVideoIds.add(vl.vdocipher_video_id);
          }
        }
      }

      if (dbVideoIds.size > 0) {
        await this.deleteVdoCipherAsset([...dbVideoIds]);
      }
    } catch (err) {
      console.warn(
        'Failed to query DB video IDs during chapter deletion cleanup:',
        err,
      );
    }

    for (const key of this.folderCache.keys()) {
      if (key.includes(chapterTitleStr)) {
        this.folderCache.delete(key);
      }
    }
  }

  /**
   * Cleans up orphaned or failed video uploads in VdoCipher.
   * Finds videos in VdoCipher with status 'uploading', 'failed', or 'error'
   * that are older than 15 minutes and not linked to any active video_lessons in DB.
   */
  async cleanupFailedUploads(): Promise<{
    cleanedCount: number;
    cleanedIds: string[];
  }> {
    const apiSecret = this.config.get('VDOCIPHER_API_SECRET');
    if (!apiSecret) return { cleanedCount: 0, cleanedIds: [] };

    const headers = {
      Authorization: `Apisecret ${apiSecret}`,
      Accept: 'application/json',
    };

    try {
      const res = await axios.get(`${VDOCIPHER_BASE}/videos?limit=100`, {
        headers,
      });
      const rows: Array<Record<string, unknown>> = res.data?.rows ?? [];

      const candidateIds: string[] = [];
      const cutoffTime = Date.now() - 15 * 60 * 1000;

      for (const row of rows) {
        const id = row.id as string | undefined;
        const status = (row.status as string | undefined)?.toLowerCase();
        const uploadTime = row.upload_time
          ? new Date(row.upload_time as string | number).getTime()
          : 0;

        if (!id) continue;

        const isFailed = status === 'failed' || status === 'error';
        const isStuckUploading =
          status === 'uploading' && (!uploadTime || uploadTime < cutoffTime);

        if (isFailed || isStuckUploading) {
          candidateIds.push(id);
        }
      }

      if (candidateIds.length === 0) {
        return { cleanedCount: 0, cleanedIds: [] };
      }

      const { data: activeLessons } = await this.supabase
        .from('video_lessons')
        .select('vdocipher_video_id')
        .in('vdocipher_video_id', candidateIds);

      const activeIds = new Set(
        (activeLessons ?? []).map((l) => l.vdocipher_video_id as string),
      );
      const toDelete = candidateIds.filter((id) => !activeIds.has(id));

      if (toDelete.length > 0) {
        await this.deleteVdoCipherAsset(toDelete);
      }

      return { cleanedCount: toDelete.length, cleanedIds: toDelete };
    } catch (err) {
      console.warn(describeAxiosError('cleanup failed uploads', err));
      return { cleanedCount: 0, cleanedIds: [] };
    }
  }

  // ── Student: generate OTP for secure playback ────────────────────────────

  async generateOtp(
    lessonId: string,
    userId: string,
    ip: string,
    userAgent: string,
  ): Promise<{
    otp: string;
    playbackInfo: string;
    thumbnailUrl: string | null;
  }> {
    // 1. Fetch video_lesson — lesson must exist and be a video
    const { data: videoLesson } = await this.supabase
      .from('video_lessons')
      .select('vdocipher_video_id, lesson_id, thumbnail_url')
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
      .select('id, courses(status)')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .in('status', ['active', 'completed'])
      .maybeSingle();
    if (!enrollment) throw new ForbiddenException('Active enrollment required');

    const courseData = enrollment.courses as unknown as {
      status?: string;
    } | null;
    if (courseData?.status === 'archived') {
      throw new ForbiddenException('COURSE_ACCESS_REVOKED');
    }

    // 3. Concurrent session management — rotate stale sessions for smooth device switching
    const now = new Date().toISOString();
    await this.supabase
      .from('video_sessions')
      .delete()
      .lt('expires_at', now)
      .eq('user_id', userId);

    const { data: activeSessions } = await this.supabase
      .from('video_sessions')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .gt('expires_at', now)
      .neq('ip_address', ip)
      .order('created_at', { ascending: true });

    if (activeSessions && activeSessions.length >= MAX_CONCURRENT_SESSIONS) {
      const excessCount = activeSessions.length - MAX_CONCURRENT_SESSIONS + 1;
      const idsToRemove = activeSessions.slice(0, excessCount).map((s) => s.id);
      await this.supabase.from('video_sessions').delete().in('id', idsToRemove);
    }

    // 4. Record this session (fire-and-forget — don't block OTP on DB write)
    const sessionExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
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
      thumbnailUrl:
        (videoLesson as unknown as { thumbnail_url?: string | null })
          .thumbnail_url ?? null,
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

  /**
   * Upload a custom thumbnail image directly to VdoCipher as a poster.
   * Does NOT store in Supabase Storage. Saves the VdoCipher poster URL in video_lessons.
   */
  async uploadThumbnail(
    lessonId: string,
    request: FastifyRequest,
  ): Promise<{ thumbnail_url: string }> {
    const { data: videoLesson } = await this.supabase
      .from('video_lessons')
      .select('vdocipher_video_id, lesson_id')
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (!videoLesson) throw new NotFoundException('Video lesson not found');
    if (!videoLesson.vdocipher_video_id)
      throw new BadRequestException(
        'Please upload a video to VdoCipher first before adding a thumbnail',
      );

    const part = await (request as MultipartRequest).file();
    if (!part || !part.mimetype.startsWith('image/'))
      throw new BadRequestException('An image file is required');

    const buffer = await part.toBuffer();
    const videoId = videoLesson.vdocipher_video_id;
    const apiSecret = this.config.get('VDOCIPHER_API_SECRET');
    const headers = {
      Authorization: `Apisecret ${apiSecret}`,
    };

    // Upload directly to VdoCipher files API (posters/captions)
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(buffer)], { type: part.mimetype }),
      part.filename,
    );

    let vdoPosterUrl: string | null = null;

    try {
      const uploadRes = await axios.post(
        `${VDOCIPHER_BASE}/videos/${videoId}/files`,
        form,
        { headers },
      );
      if (uploadRes.data && typeof uploadRes.data.url === 'string') {
        vdoPosterUrl = uploadRes.data.url;
      }
    } catch (err) {
      throw new BadRequestException(
        describeAxiosError('poster upload to VdoCipher', err),
      );
    }

    // If url was not in the immediate response, fetch files or video details from VdoCipher
    if (!vdoPosterUrl) {
      try {
        const filesRes = await axios.get(
          `${VDOCIPHER_BASE}/videos/${videoId}/files/`,
          { headers },
        );
        const files: Array<{ poster?: boolean; url?: string; type?: string }> =
          Array.isArray(filesRes.data)
            ? filesRes.data
            : (filesRes.data?.files ?? []);
        const posterFile = [...files]
          .reverse()
          .find(
            (f) =>
              f.poster ||
              f.type === 'poster' ||
              f.url?.includes('poster') ||
              f.url?.includes('thumb'),
          );
        if (posterFile?.url) {
          vdoPosterUrl = posterFile.url;
        }
      } catch (err) {
        console.warn(
          describeAxiosError('fetching poster files from VdoCipher', err),
        );
      }
    }

    if (!vdoPosterUrl) {
      try {
        const videoRes = await axios.get(
          `${VDOCIPHER_BASE}/videos/${videoId}`,
          { headers },
        );
        const posters: Array<{ url?: string }> = videoRes.data?.posters ?? [];
        if (posters.length > 0 && posters[posters.length - 1]?.url) {
          vdoPosterUrl = posters[posters.length - 1].url!;
        }
      } catch (err) {
        console.warn(
          describeAxiosError('fetching video details from VdoCipher', err),
        );
      }
    }

    const finalThumbnailUrl = vdoPosterUrl ?? '';

    // Update video_lessons record with the VdoCipher poster URL
    if (finalThumbnailUrl) {
      await this.supabase
        .from('video_lessons')
        .update({ thumbnail_url: finalThumbnailUrl })
        .eq('lesson_id', lessonId);
    }

    return { thumbnail_url: finalThumbnailUrl };
  }
}
