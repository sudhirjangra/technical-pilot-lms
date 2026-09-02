import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyRequest } from 'fastify';
import { VideosService } from '../videos/videos.service';
import { CreateLessonDto, UpdateLessonDto } from './dto';

@Injectable()
export class LessonsService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly videosService: VideosService,
  ) {}

  async uploadPdf(lessonId: string, request: FastifyRequest) {
    const { data: lesson } = await this.supabase
      .from('lessons')
      .select('id, title, lesson_type, chapter_id, chapters(title, courses(slug))')
      .eq('id', lessonId)
      .single();
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.lesson_type !== 'pdf')
      throw new BadRequestException('Lesson type must be pdf');

    const part = await (request as FastifyRequest & {
      file: () => Promise<{ mimetype: string; toBuffer: () => Promise<Buffer> } | undefined>;
    }).file();
    if (!part || part.mimetype !== 'application/pdf')
      throw new BadRequestException('A PDF file is required');

    const chapter = lesson.chapters as unknown as { title: string; courses: { slug: string } };
    const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const filePath = `${safe(chapter.courses.slug)}/${safe(chapter.title)}/${safe(lesson.title)}.pdf`;
    const buffer = await part.toBuffer();
    const { error: uploadError } = await this.supabase.storage
      .from('course-materials')
      .upload(filePath, buffer, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw new BadRequestException(uploadError.message);

    const { data, error } = await this.supabase
      .from('pdf_notes')
      .upsert({ lesson_id: lessonId, file_path: filePath, file_size_bytes: buffer.length }, { onConflict: 'lesson_id' })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deletePdf(lessonId: string) {
    const { data: pdfNote, error } = await this.supabase
      .from('pdf_notes')
      .select('id, file_path')
      .eq('lesson_id', lessonId)
      .single();
    if (error || !pdfNote) throw new NotFoundException('PDF not found');

    const { error: storageError } = await this.supabase.storage
      .from('course-materials')
      .remove([pdfNote.file_path as string]);
    if (storageError) throw new BadRequestException(storageError.message);

    const { error: deleteError } = await this.supabase
      .from('pdf_notes')
      .delete()
      .eq('id', pdfNote.id as string);
    if (deleteError) throw new BadRequestException(deleteError.message);
  }

  async getPdf(lessonId: string, req: FastifyRequest): Promise<Buffer> {
    // Verify lesson exists and is a PDF
    const { data: lesson, error: lessonError } = await this.supabase
      .from('lessons')
      .select('id, lesson_type, is_published, chapter_id, chapters!inner(course_id)')
      .eq('id', lessonId)
      .single();
    if (lessonError || !lesson || !lesson.is_published)
      throw new NotFoundException('Lesson not found');
    if (lesson.lesson_type !== 'pdf')
      throw new BadRequestException('This lesson does not have a PDF');

    // Get user from request
    const user = (req as any).user;
    if (!user?.id) throw new NotFoundException('User not authenticated');

    // Verify enrollment
    const chapter = lesson.chapters as unknown as { course_id: string };
    const { data: enrollment, error: enrollmentError } = await this.supabase
      .from('enrollments')
      .select('id')
      .eq('course_id', chapter.course_id)
      .eq('student_id', user.id)
      .eq('status', 'active')
      .single();
    if (enrollmentError || !enrollment) 
      throw new BadRequestException('Not enrolled in this course');

    // Get PDF file path
    const { data: pdfNote, error: pdfError } = await this.supabase
      .from('pdf_notes')
      .select('file_path')
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (pdfError || !pdfNote?.file_path) 
      throw new NotFoundException('PDF not available for this lesson');

    // Download through the API so provider details never reach the browser.
    const { data: pdfBlob, error: downloadError } = await this.supabase.storage
      .from('course-materials')
      .download(pdfNote.file_path as string);
    if (downloadError || !pdfBlob)
      throw new NotFoundException('PDF file not available');

    return Buffer.from(await pdfBlob.arrayBuffer());
  }

  async create(dto: CreateLessonDto) {
    // Verify chapter exists
    const { error: chErr } = await this.supabase
      .from('chapters')
      .select('id')
      .eq('id', dto.chapter_id)
      .single();
    if (chErr) throw new NotFoundException('Chapter not found');

    // Auto-assign sort_order if not provided
    if (dto.sort_order === undefined) {
      const { count } = await this.supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('chapter_id', dto.chapter_id);
      dto.sort_order = (count ?? 0) + 1;
    }

    const { data, error } = await this.supabase
      .from('lessons')
      .insert(dto)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findByChapter(chapterId: string) {
    const { data, error } = await this.supabase
      .from('lessons')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('sort_order', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new NotFoundException('Lesson not found');
    return data;
  }

  async update(id: string, dto: UpdateLessonDto) {
    const { data, error } = await this.supabase
      .from('lessons')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      if (error.code === 'PGRST116')
        throw new NotFoundException('Lesson not found');
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async reorder(lessons: { id: string; sort_order: number }[]) {
    const results = await Promise.all(
      lessons.map(({ id, sort_order }) =>
        this.supabase.from('lessons').update({ sort_order }).eq('id', id),
      ),
    );
    const failed = results.find((result) => result.error);
    if (failed?.error) throw new BadRequestException(failed.error.message);
  }

  async remove(id: string) {
    await this.cleanupExternalContent(id);
    const { error } = await this.supabase.from('lessons').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  /**
   * Best-effort removal of externally-hosted assets (VdoCipher videos,
   * Supabase Storage PDFs) tied to a lesson before its row is deleted.
   * DB rows (pdf_notes, video_lessons, assignments, tests, questions, etc.)
   * cascade automatically via ON DELETE CASCADE foreign keys.
   */
  async cleanupExternalContent(lessonId: string) {
    const { data: lesson } = await this.supabase
      .from('lessons')
      .select('lesson_type')
      .eq('id', lessonId)
      .maybeSingle();
    if (!lesson) return;

    if (lesson.lesson_type === 'pdf') {
      const { data: pdfNote } = await this.supabase
        .from('pdf_notes')
        .select('file_path')
        .eq('lesson_id', lessonId)
        .maybeSingle();
      if (pdfNote?.file_path) {
        await this.supabase.storage
          .from('course-materials')
          .remove([pdfNote.file_path as string]);
      }
    }

    if (lesson.lesson_type === 'video') {
      const { data: videoLesson } = await this.supabase
        .from('video_lessons')
        .select('vdocipher_video_id')
        .eq('lesson_id', lessonId)
        .maybeSingle();
      if (videoLesson?.vdocipher_video_id) {
        await this.videosService.deleteVdoCipherAsset(
          videoLesson.vdocipher_video_id as string,
        );
      }
    }
  }
}
