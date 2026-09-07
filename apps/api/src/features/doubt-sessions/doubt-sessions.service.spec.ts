import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DoubtSessionsService } from './doubt-sessions.service';

describe('DoubtSessionsService', () => {
  let service: DoubtSessionsService;
  let supabase: any;
  let notificationsService: any;

  beforeEach(() => {
    notificationsService = {
      send: jest.fn().mockResolvedValue({ id: 'notif-1' }),
      broadcast: jest.fn().mockResolvedValue({ sent: 5 }),
      notifyAdmins: jest.fn().mockResolvedValue({ sent: 2 }),
    };
  });

  describe('createSlot targeting & notification', () => {
    it('should create an all-student slot and broadcast notification', async () => {
      const mockSlot = {
        id: 'slot-1',
        date: '2026-09-10',
        start_time: '10:00:00',
        end_time: '10:30:00',
        duration_minutes: 30,
        max_bookings: 5,
        topic: 'General Q&A',
        target_type: 'all',
        course_id: null,
        student_id: null,
        created_by: 'admin-1',
      };

      supabase = {
        from: jest.fn((table: string) => {
          if (table === 'doubt_slots') {
            return {
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: mockSlot, error: null }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({ data: [{ id: 'admin-1', full_name: 'Admin', email: 'admin@tp.com' }] }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [] }),
            }),
          };
        }),
      };

      service = new DoubtSessionsService(supabase, notificationsService);

      const result = await service.createSlot(
        {
          date: '2026-09-10',
          start_time: '10:00',
          end_time: '10:30',
          duration_minutes: 30,
          topic: 'General Q&A',
          target_type: 'all',
          notify_students: true,
        },
        'admin-1',
      );

      expect(result.id).toEqual('slot-1');
      expect(notificationsService.broadcast).toHaveBeenCalledWith(
        expect.stringContaining('General Q&A'),
        expect.stringContaining('2026-09-10'),
        'doubt_session',
      );
    });

    it('should create a course-targeted slot and broadcast to course students', async () => {
      const mockSlot = {
        id: 'slot-2',
        date: '2026-09-11',
        start_time: '14:00:00',
        end_time: '14:30:00',
        duration_minutes: 30,
        max_bookings: 3,
        topic: 'Navigation Doubts',
        target_type: 'course',
        course_id: 'course-123',
        student_id: null,
      };

      supabase = {
        from: jest.fn((table: string) => {
          if (table === 'courses') {
            return {
              select: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [{ id: 'course-123', title: 'Air Navigation 101' }],
                  error: null,
                }),
              }),
            };
          }
          if (table === 'doubt_slots') {
            return {
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: mockSlot, error: null }),
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [] }),
            }),
          };
        }),
      };

      service = new DoubtSessionsService(supabase, notificationsService);

      const result = await service.createSlot(
        {
          date: '2026-09-11',
          start_time: '14:00',
          end_time: '14:30',
          duration_minutes: 30,
          topic: 'Navigation Doubts',
          target_type: 'course',
          course_id: 'course-123',
          notify_students: true,
        },
        'admin-1',
      );

      expect(result.id).toEqual('slot-2');
      expect(result.courses).toEqual({ id: 'course-123', title: 'Air Navigation 101' });
      expect(notificationsService.broadcast).toHaveBeenCalledWith(
        expect.stringContaining('Air Navigation 101'),
        expect.stringContaining('2026-09-11'),
        'doubt_session',
        'course-123',
      );
    });

    it('should throw BadRequestException if target_type is course but course_id is missing', async () => {
      supabase = { from: jest.fn() };
      service = new DoubtSessionsService(supabase, notificationsService);

      await expect(
        service.createSlot(
          {
            date: '2026-09-11',
            start_time: '14:00',
            end_time: '14:30',
            duration_minutes: 30,
            target_type: 'course',
          },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a 1-on-1 student-targeted slot and send direct notification', async () => {
      const mockSlot = {
        id: 'slot-3',
        date: '2026-09-12',
        start_time: '16:00:00',
        end_time: '16:30:00',
        duration_minutes: 30,
        max_bookings: 1,
        topic: 'Personal Flight Review',
        target_type: 'student',
        course_id: null,
        student_id: 'student-999',
        meeting_link: 'https://meet.google.com/abc-defg-hij',
      };

      supabase = {
        from: jest.fn((table: string) => {
          if (table === 'doubt_slots') {
            return {
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: mockSlot, error: null }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [{ id: 'student-999', full_name: 'John Pilot', email: 'john@pilot.com' }],
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [] }),
            }),
          };
        }),
      };

      service = new DoubtSessionsService(supabase, notificationsService);

      const result = await service.createSlot(
        {
          date: '2026-09-12',
          start_time: '16:00',
          end_time: '16:30',
          duration_minutes: 30,
          topic: 'Personal Flight Review',
          target_type: 'student',
          student_id: 'student-999',
          meeting_link: 'https://meet.google.com/abc-defg-hij',
          notify_students: true,
        },
        'admin-1',
      );

      expect(result.id).toEqual('slot-3');
      expect(result.target_student).toEqual({
        id: 'student-999',
        full_name: 'John Pilot',
        email: 'john@pilot.com',
      });
      expect(notificationsService.send).toHaveBeenCalledWith(
        'student-999',
        expect.stringContaining('Personal Flight Review'),
        expect.stringContaining('16:00'),
        'doubt_session',
        expect.any(Object),
      );
    });
  });

  describe('getUpcomingSlots course-based filtering', () => {
    it('should filter out slots for courses the student is not enrolled in', async () => {
      const allSlots = [
        { id: 's1', target_type: 'all', course_id: null, student_id: null, status: 'available' },
        { id: 's2', target_type: 'course', course_id: 'course-enrolled', student_id: null, status: 'available' },
        { id: 's3', target_type: 'course', course_id: 'course-other', student_id: null, status: 'available' },
        { id: 's4', target_type: 'student', course_id: null, student_id: 'student-me', status: 'available' },
        { id: 's5', target_type: 'student', course_id: null, student_id: 'student-other', status: 'available' },
      ];

      supabase = {
        from: jest.fn((table: string) => {
          if (table === 'enrollments') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: [{ course_id: 'course-enrolled' }],
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'courses') {
            return {
              select: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [{ id: 'course-enrolled', title: 'Course 1' }],
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [{ id: 'student-me', full_name: 'Me', email: 'me@tp.com' }],
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({
                      data: allSlots,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }),
      };

      service = new DoubtSessionsService(supabase, notificationsService);

      const slots = await service.getUpcomingSlots('student-me');
      const slotIds = slots.map((s) => s.id);

      expect(slotIds).toContain('s1'); // all
      expect(slotIds).toContain('s2'); // enrolled course
      expect(slotIds).not.toContain('s3'); // other course
      expect(slotIds).toContain('s4'); // my 1-on-1
      expect(slotIds).not.toContain('s5'); // other student's 1-on-1
    });
  });

  describe('bookSlot access control', () => {
    it('should prevent student from booking another student 1-on-1 slot', async () => {
      supabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'slot-private',
                  target_type: 'student',
                  student_id: 'student-other',
                  status: 'available',
                  current_bookings: 0,
                  max_bookings: 1,
                },
                error: null,
              }),
            }),
          }),
        }),
      };

      service = new DoubtSessionsService(supabase, notificationsService);

      await expect(
        service.bookSlot({ slot_id: 'slot-private' }, 'student-me'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent student from booking a course slot if not enrolled', async () => {
      supabase = {
        from: jest.fn((table: string) => {
          if (table === 'doubt_slots') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: 'slot-course',
                      target_type: 'course',
                      course_id: 'course-123',
                      status: 'available',
                      current_bookings: 0,
                      max_bookings: 5,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'enrollments') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: null, // Not enrolled!
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      service = new DoubtSessionsService(supabase, notificationsService);

      await expect(
        service.bookSlot({ slot_id: 'slot-course' }, 'student-me'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should succeed when student books an eligible slot and notify admins', async () => {
      const mockSlot = {
        id: 'slot-valid',
        target_type: 'all',
        status: 'available',
        current_bookings: 0,
        max_bookings: 2,
        date: '2026-09-15',
        start_time: '11:00:00',
        topic: 'General Session',
      };

      supabase = {
        from: jest.fn((table: string) => {
          if (table === 'doubt_slots') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockSlot,
                    error: null,
                  }),
                }),
              }),
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: {}, error: null }),
              }),
            };
          }
          if (table === 'doubt_bookings') {
            return {
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'booking-1', slot_id: 'slot-valid', student_id: 'student-me' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { full_name: 'Bob Pilot', email: 'bob@pilot.com' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      service = new DoubtSessionsService(supabase, notificationsService);

      const booking = await service.bookSlot({ slot_id: 'slot-valid' }, 'student-me');
      expect(booking).toBeDefined();
      expect(booking.id).toBe('booking-1');
      expect(notificationsService.notifyAdmins).toHaveBeenCalledWith(
        'New Doubt Session Booked',
        expect.stringContaining('Bob Pilot'),
        'doubt_booking',
        expect.any(Object),
      );
    });
  });
});
