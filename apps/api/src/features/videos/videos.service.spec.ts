import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { VideosService } from './videos.service';

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
});
