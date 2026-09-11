import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import { MailService } from '@/features/mail/mail.service';
import { NotificationsService } from '@/features/notifications/notifications.service';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { LessonsService } from '../lessons/lessons.service';
import { CoursesService } from './courses.service';

describe('CoursesService', () => {
  let service: CoursesService;
  let mockSupabase: any;
  let mockMailService: any;
  let mockNotificationsService: any;

  beforeEach(async () => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    };

    mockMailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    mockNotificationsService = {
      notifyCourseAdded: jest.fn().mockResolvedValue({ sent: 1 }),
      broadcast: jest.fn().mockResolvedValue({ sent: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: SUPABASE_ADMIN, useValue: mockSupabase },
        {
          provide: LessonsService,
          useValue: { cleanupExternalContent: jest.fn() },
        },
        { provide: MailService, useValue: mockMailService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        {
          provide: Logger,
          useValue: { error: jest.fn(), warn: jest.fn(), log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('should notify and send emails when a course is updated to published', async () => {
    const courseId = 'c1';
    const existingCourse = {
      id: courseId,
      title: 'Aviation 101',
      slug: 'aviation-101',
      status: 'draft',
      published_at: null,
    };
    const updatedCourse = {
      ...existingCourse,
      status: 'published',
      published_at: new Date().toISOString(),
    };

    // First findOne call for existing course check
    mockSupabase.single
      .mockResolvedValueOnce({ data: existingCourse, error: null }) // findOne
      .mockResolvedValueOnce({ data: updatedCourse, error: null }); // update single

    // Mock students lookup for emails
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [
                  { id: 's1', full_name: 'Student One', email: 's1@test.com' },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      return mockSupabase;
    });

    const result = await service.update(courseId, { status: 'published' });

    expect(result.status).toBe('published');
    expect(mockNotificationsService.notifyCourseAdded).toHaveBeenCalledWith(
      courseId,
      'Aviation 101',
    );
  });

  it('should notify and send emails when a course is updated to archived', async () => {
    const courseId = 'c2';
    const existingCourse = {
      id: courseId,
      title: 'Aviation 102',
      slug: 'aviation-102',
      status: 'published',
      published_at: new Date().toISOString(),
    };
    const updatedCourse = {
      ...existingCourse,
      status: 'archived',
    };

    mockSupabase.single
      .mockResolvedValueOnce({ data: existingCourse, error: null })
      .mockResolvedValueOnce({ data: updatedCourse, error: null });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'enrollments') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  student_id: 's2',
                  profiles: {
                    id: 's2',
                    full_name: 'Student Two',
                    email: 's2@test.com',
                  },
                },
              ],
              error: null,
            }),
          }),
        };
      }
      return mockSupabase;
    });

    const result = await service.update(courseId, { status: 'archived' });

    expect(result.status).toBe('archived');
    expect(mockNotificationsService.broadcast).toHaveBeenCalledWith(
      'Course Archived: Aviation 102',
      expect.stringContaining('archived by Technical Pilot'),
      'course_archived',
      courseId,
    );
  });
});
