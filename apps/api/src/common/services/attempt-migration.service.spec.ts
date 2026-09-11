import { AttemptMigrationService } from './attempt-migration.service';

describe('AttemptMigrationService', () => {
  let service: AttemptMigrationService;
  let supabaseMock: any;
  let mongoServiceMock: any;

  beforeEach(() => {
    mongoServiceMock = {
      saveAttempt: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
    };

    supabaseMock = {
      from: jest.fn(),
    };

    service = new AttemptMigrationService(
      supabaseMock as any,
      mongoServiceMock as any,
    );
  });

  describe('mapSupabaseAttemptToMongoDoc', () => {
    it('should correctly map a complete Supabase attempt with questions and options', () => {
      const mapped = service.mapSupabaseAttemptToMongoDoc({
        attempt: {
          id: 'attempt-101',
          student_id: 'student-1',
          assignment_id: 'assignment-1',
          started_at: '2026-01-01T10:00:00.000Z',
          completed_at: '2026-01-01T10:15:00.000Z',
          score: 15,
          max_score: 20,
          time_spent_seconds: 900,
        },
        assessmentType: 'assignment',
        assessment: {
          id: 'assignment-1',
          title: 'Meteorology Quiz',
          passing_score_percent: 70,
          lessons: {
            id: 'lesson-1',
            chapters: {
              id: 'ch-1',
              courses: {
                id: 'course-1',
                title: 'Aviation Meteorology',
              },
            },
          },
        },
        profile: {
          full_name: 'John Pilot',
          email: 'john@pilot.com',
        },
        questions: [
          {
            id: 'q-1',
            question_text: 'What is QNH?',
            question_type: 'mcq',
            points: 10,
            topic: 'Altimetry',
            explanation: 'Altimeter setting',
          },
          {
            id: 'q-2',
            question_text: 'What is QFE?',
            question_type: 'mcq',
            points: 10,
            topic: 'Altimetry',
            explanation: 'Field elevation',
          },
        ],
        allOptions: [
          {
            id: 'opt-1',
            question_id: 'q-1',
            option_text: 'Sea level pressure',
            is_correct: true,
          },
          {
            id: 'opt-2',
            question_id: 'q-1',
            option_text: 'Standard pressure',
            is_correct: false,
          },
          {
            id: 'opt-3',
            question_id: 'q-2',
            option_text: 'Station pressure',
            is_correct: true,
          },
        ],
        answers: [
          {
            id: 'ans-1',
            question_id: 'q-1',
            is_correct: true,
            time_spent_seconds: 400,
          },
          {
            id: 'ans-2',
            question_id: 'q-2',
            is_correct: false,
            time_spent_seconds: 500,
          },
        ],
        answerOptions: [
          { assignment_answer_id: 'ans-1', option_id: 'opt-1' },
          { assignment_answer_id: 'ans-2', option_id: 'opt-2' },
        ],
      });

      expect(mapped.attempt_id).toBe('attempt-101');
      expect(mapped.assessment_type).toBe('assignment');
      expect(mapped.student_name).toBe('John Pilot');
      expect(mapped.student_email).toBe('john@pilot.com');
      expect(mapped.course_title).toBe('Aviation Meteorology');
      expect(mapped.assessment_title).toBe('Meteorology Quiz');
      expect(mapped.score).toBe(15);
      expect(mapped.max_score).toBe(20);
      expect(mapped.percentage).toBe(75);
      expect(mapped.passed).toBe(true);
      expect(mapped.time_spent_seconds).toBe(900);
      expect(mapped.question_review).toHaveLength(2);
      expect(mapped.topic_breakdown).toEqual([
        expect.objectContaining({
          topic: 'Altimetry',
          total: 2,
          correct: 1,
        }),
      ]);
    });

    it('should gracefully handle missing questions and deleted options in historical records', () => {
      const mapped = service.mapSupabaseAttemptToMongoDoc({
        attempt: {
          id: 'attempt-legacy-1',
          student_id: 'student-2',
          test_id: 'test-99',
          started_at: '2026-01-01T12:00:00.000Z',
          completed_at: '2026-01-01T12:05:00.000Z',
          score: null,
          max_score: null,
          time_spent_seconds: null,
        },
        assessmentType: 'test',
        assessment: {
          id: 'test-99',
          title: 'Legacy Test',
          passing_score_percent: 50,
        },
        profile: null,
        questions: [], // questions table was truncated or questions deleted
        allOptions: [],
        answers: [
          {
            id: 'ans-legacy-1',
            question_id: 'q-deleted-1',
            is_correct: true,
            time_spent_seconds: 150,
          },
        ],
        answerOptions: [
          { test_answer_id: 'ans-legacy-1', option_id: 'opt-deleted-1' },
        ],
      });

      expect(mapped.attempt_id).toBe('attempt-legacy-1');
      expect(mapped.assessment_type).toBe('test');
      expect(mapped.student_name).toBeNull();
      expect(mapped.student_email).toBeNull();
      expect(mapped.score).toBe(1);
      expect(mapped.max_score).toBe(1);
      expect(mapped.percentage).toBe(100);
      expect(mapped.passed).toBe(true);
      expect(mapped.time_spent_seconds).toBe(300); // derived from started_at and completed_at
      expect(mapped.question_review[0]).toEqual(
        expect.objectContaining({
          questionId: 'q-deleted-1',
          questionText: 'Question (Archived)',
          isCorrect: true,
        }),
      );
    });
  });

  describe('migrateSingleAssignmentAttempt', () => {
    it('should fetch attempt with relations and persist to MongoDB', async () => {
      const buildRequest = (payload: any) => ({
        ...payload,
        then: (resolve: (value: any) => void) => resolve(payload),
      });

      supabaseMock.from.mockImplementation((table: string) => {
        const requests: Record<string, any> = {
          assignment_attempts: buildRequest({
            data: {
              id: 'attempt-migrate-1',
              assignment_id: 'assign-1',
              student_id: 'student-1',
              started_at: '2026-01-01T00:00:00.000Z',
              completed_at: '2026-01-01T00:10:00.000Z',
              score: 10,
              max_score: 10,
              time_spent_seconds: 600,
              assignments: {
                id: 'assign-1',
                title: 'Navigation 101',
                passing_score_percent: 60,
              },
            },
            error: null,
          }),
          profiles: buildRequest({
            data: { full_name: 'Pilot Pete', email: 'pete@example.com' },
            error: null,
          }),
          assignment_answers: buildRequest({
            data: [
              {
                id: 'ans-1',
                question_id: 'q-1',
                is_correct: true,
                time_spent_seconds: 600,
              },
            ],
            error: null,
          }),
          assignment_answer_options: buildRequest({
            data: [],
            error: null,
          }),
          questions: buildRequest({
            data: [
              { id: 'q-1', question_text: 'Compass reading?', points: 10 },
            ],
            error: null,
          }),
          question_options: buildRequest({
            data: [],
            error: null,
          }),
        };

        const req = requests[table] ?? buildRequest({ data: [], error: null });
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue(req),
          then: (resolve: (val: any) => void) => resolve(req),
        };
      });

      const result =
        await service.migrateSingleAssignmentAttempt('attempt-migrate-1');
      expect(result).toBe(true);
      expect(mongoServiceMock.saveAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt_id: 'attempt-migrate-1',
          student_name: 'Pilot Pete',
          assessment_title: 'Navigation 101',
        }),
      );
    });

    it('should return false if attempt is not found in Supabase', async () => {
      supabaseMock.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      const result =
        await service.migrateSingleAssignmentAttempt('non-existent');
      expect(result).toBe(false);
      expect(mongoServiceMock.saveAttempt).not.toHaveBeenCalled();
    });
  });

  describe('migrateAllAttempts', () => {
    it('should iterate through assignment and test attempts and return summary', async () => {
      const buildRequest = (payload: any) => ({
        ...payload,
        then: (resolve: (value: any) => void) => resolve(payload),
      });

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'assignment_attempts') {
          return {
            select: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue(
              buildRequest({
                data: [{ id: 'a-1', completed_at: '2026-01-01' }],
                error: null,
              }),
            ),
          };
        }
        if (table === 'test_attempts') {
          return {
            select: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue(
              buildRequest({
                data: [{ id: 't-1', completed_at: '2026-01-01' }],
                error: null,
              }),
            ),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          maybeSingle: jest
            .fn()
            .mockResolvedValue(buildRequest({ data: null, error: null })),
        };
      });

      jest
        .spyOn(service, 'migrateSingleAssignmentAttempt')
        .mockResolvedValue(true);
      jest.spyOn(service, 'migrateSingleTestAttempt').mockResolvedValue(true);

      const summary = await service.migrateAllAttempts();
      expect(summary.totalEvaluated).toBe(2);
      expect(summary.migratedCount).toBe(2);
      expect(summary.failedCount).toBe(0);
      expect(summary.errors).toHaveLength(0);
    });
  });
});
