import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { VideosService } from '../videos/videos.service';
import { LessonsService } from './lessons.service';

describe('LessonsService', () => {
  let service: LessonsService;
  let mockSupabase: any;
  let mockVideosService: any;

  beforeEach(async () => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
      storage: {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn(),
        createBucket: jest.fn(),
      },
    };

    mockVideosService = {
      deleteVdoCipherAsset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonsService,
        { provide: SUPABASE_ADMIN, useValue: mockSupabase },
        { provide: VideosService, useValue: mockVideosService },
      ],
    }).compile();

    service = module.get<LessonsService>(LessonsService);
  });

  describe('getPdf', () => {
    const mockRequest = { user: { id: 'student-123' } } as any;
    const lessonId = 'b30eb33b-d2a5-47d1-a799-a0400f6c07af';

    it('downloads the full PDF file from Supabase storage bucket when present', async () => {
      // 1. lesson lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: lessonId,
          title: 'SACAA Technical General web visit',
          description: '<p>Test notes</p>',
          lesson_type: 'pdf',
          is_published: true,
          chapter_id: 'chapter-1',
          chapters: {
            course_id: 'course-1',
            title: 'Introduction',
            courses: { title: 'DGCA/SACAA Technical General', status: 'published' },
          },
        },
        error: null,
      });

      // 2. enrollment check
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'enrollment-1', courses: { status: 'published' } },
        error: null,
      });

      // 3. pdf_notes record lookup
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: {
          file_path: 'dgca-sacaa-technical-general/introduction/sacaa-technical-general-web-visit.pdf',
        },
        error: null,
      });

      // 4. storage download
      const samplePdfContent = Buffer.from('%PDF-1.7 full test binary stream content padding for length requirements over 50 bytes');
      mockSupabase.storage.download.mockResolvedValueOnce({
        data: new Blob([samplePdfContent], { type: 'application/pdf' }),
        error: null,
      });

      const result = await service.getPdf(lessonId, mockRequest);

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('course-materials');
      expect(mockSupabase.storage.download).toHaveBeenCalledWith(
        'dgca-sacaa-technical-general/introduction/sacaa-technical-general-web-visit.pdf',
      );
      expect(result.toString()).toContain('%PDF-1.7');
      expect(result.length).toBe(samplePdfContent.length);
    });

    it('throws NotFoundException if user is not authenticated', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: lessonId,
          lesson_type: 'pdf',
          is_published: true,
          chapters: { course_id: 'c1' },
        },
        error: null,
      });

      await expect(service.getPdf(lessonId, { user: null } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException if student is not enrolled', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: lessonId,
          lesson_type: 'pdf',
          is_published: true,
          chapters: { course_id: 'c1' },
        },
        error: null,
      });
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(service.getPdf(lessonId, mockRequest)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
