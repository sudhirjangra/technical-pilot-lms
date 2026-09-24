import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { VideosService } from './videos.service';

jest.mock('axios');

describe('VideosService', () => {
  let service: VideosService;
  let mockSupabase: any;
  let mockConfig: any;

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
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'VDOCIPHER_API_SECRET') return 'test-secret';
        if (key === 'VDOCIPHER_OTP_TTL_SECONDS') return 300;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideosService,
        { provide: SUPABASE_ADMIN, useValue: mockSupabase },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<VideosService>(VideosService);
  });

  describe('createVideoLesson', () => {
    it('should throw NotFoundException if lesson does not exist', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

      await expect(
        service.createVideoLesson({
          lesson_id: 'lesson-1',
          vdocipher_video_id: 'vdo-123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if lesson type is not video', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'lesson-1', lesson_type: 'pdf' },
        error: null,
      });

      await expect(
        service.createVideoLesson({
          lesson_id: 'lesson-1',
          vdocipher_video_id: 'vdo-123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should link video to lesson successfully via insert when not existing', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { id: 'lesson-1', lesson_type: 'video' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'vl-1',
            lesson_id: 'lesson-1',
            vdocipher_video_id: 'vdo-123',
          },
          error: null,
        });

      const result = await service.createVideoLesson({
        lesson_id: 'lesson-1',
        vdocipher_video_id: '  vdo-123  ',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('video_lessons');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          lesson_id: 'lesson-1',
          vdocipher_video_id: 'vdo-123',
        }),
      );
      expect(result).toEqual({
        id: 'vl-1',
        lesson_id: 'lesson-1',
        vdocipher_video_id: 'vdo-123',
      });
    });
  });

  describe('updateVideoLesson', () => {
    it('should update video lesson successfully', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'vl-1' },
        error: null,
      });
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'vl-1',
          lesson_id: 'lesson-1',
          vdocipher_video_id: 'vdo-456',
        },
        error: null,
      });

      const result = await service.updateVideoLesson('lesson-1', {
        vdocipher_video_id: 'vdo-456',
      });

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          lesson_id: 'lesson-1',
          vdocipher_video_id: 'vdo-456',
        }),
      );
      expect(result.vdocipher_video_id).toBe('vdo-456');
    });
  });

  describe('deleteVideoLesson', () => {
    it('should delete video lesson record', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { vdocipher_video_id: 'vdo-123' },
        error: null,
      });
      mockSupabase.delete.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      await expect(service.deleteVideoLesson('lesson-1')).resolves.not.toThrow();
    });
  });

  describe('direct upload & lifecycle', () => {
    it('getUploadCredentials should request VdoCipher PUT credentials', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'lesson-1',
          title: 'Lesson 1',
          lesson_type: 'video',
          chapters: {
            title: 'Chapter 1',
            courses: { title: 'Course 1', slug: 'course-1' },
          },
        },
        error: null,
      });

      (axios.get as jest.Mock).mockResolvedValue({ data: { folderList: [] } });
      (axios.post as jest.Mock).mockResolvedValue({ data: { id: 'folder-1' } });
      (axios.put as jest.Mock).mockResolvedValue({
        data: {
          videoId: 'vdo-new-123',
          clientPayload: { uploadLink: 'https://s3.aws.com/upload' },
        },
      });

      const res = await service.getUploadCredentials('lesson-1');
      expect(res.videoId).toBe('vdo-new-123');
      expect(res.clientPayload.uploadLink).toBe('https://s3.aws.com/upload');
    });

    it('cancelUpload should delete VdoCipher asset immediately', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({ data: {} });
      const res = await service.cancelUpload('vdo-abort-123');
      expect(res).toEqual({ success: true });
      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/videos'),
        expect.objectContaining({
          params: { videos: 'vdo-abort-123' },
        }),
      );
    });

    it('completeUpload should upsert video_lessons record', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { id: 'lesson-1', lesson_type: 'video' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'vl-1',
            lesson_id: 'lesson-1',
            vdocipher_video_id: 'vdo-completed-123',
          },
          error: null,
        });

      const res = await service.completeUpload('lesson-1', 'vdo-completed-123');
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          lesson_id: 'lesson-1',
          vdocipher_video_id: 'vdo-completed-123',
        }),
        expect.anything(),
      );
      expect(res.vdocipher_video_id).toBe('vdo-completed-123');
    });

    it('cleanupFailedUploads should delete orphaned/failed uploads', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          rows: [
            { id: 'vdo-failed-1', status: 'failed', upload_time: 1000 },
            { id: 'vdo-active-1', status: 'ready', upload_time: 2000 },
          ],
        },
      });

      mockSupabase.in.mockResolvedValueOnce({
        data: [], // not active in DB
        error: null,
      });

      (axios.delete as jest.Mock).mockResolvedValue({ data: {} });

      const res = await service.cleanupFailedUploads();
      expect(res.cleanedCount).toBe(1);
      expect(res.cleanedIds).toContain('vdo-failed-1');
    });
  });
});
