import { TestsService } from './tests.service';

describe('TestsService', () => {
  it('should resolve a student-owned test attempt without using the admin detail lookup', async () => {
    const buildRequest = (payload: any) => ({
      ...payload,
      then: (resolve: (value: any) => void) => resolve(payload),
    });

    const supabase = {
      from: jest.fn((table: string) => {
        const requests: Record<string, any> = {
          test_attempts: buildRequest({
            data: {
              id: 'attempt-1',
              test_id: 'test-1',
              student_id: 'student-1',
              started_at: '2026-01-01T00:00:00.000Z',
              completed_at: '2026-01-01T00:10:00.000Z',
              score: 10,
              max_score: 10,
              time_spent_seconds: 600,
              tests: { passing_score_percent: 60 },
              profiles: { full_name: 'Alice', email: 'alice@example.com' },
            },
            error: null,
          }),
          test_answers: buildRequest({
            data: [{ id: 'answer-1', question_id: 'q-1', text_answer: null, is_correct: true, time_spent_seconds: 120 }],
            error: null,
          }),
          test_answer_options: buildRequest({
            data: [],
            error: null,
          }),
          questions: buildRequest({
            data: [{ id: 'q-1', question_type: 'mcq', points: 10, explanation: 'Why', topic: 'Topic 1', question_text: 'What?' }],
            error: null,
          }),
          question_options: buildRequest({
            data: [{ id: 'opt-1', question_id: 'q-1', is_correct: true }],
            error: null,
          }),
        };

        const request = requests[table] ?? buildRequest({ data: [], error: null });
        const chain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue(request),
          maybeSingle: jest.fn().mockResolvedValue(request),
          then: (resolve: (value: any) => void) => resolve(request),
        };
        return chain;
      }),
    };

    const mongoService = {
      getAttemptByAttemptId: jest.fn().mockResolvedValue(null),
      saveAttempt: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
    };

    const attemptMigrationService = {
      migrateSingleAssignmentAttempt: jest.fn().mockResolvedValue(true),
      migrateSingleTestAttempt: jest.fn().mockResolvedValue(true),
      migrateAllAttempts: jest.fn().mockResolvedValue({ totalEvaluated: 0, migratedCount: 0, skippedCount: 0, failedCount: 0, errors: [] }),
    };

    const service = new TestsService(supabase as any, mongoService as any, attemptMigrationService as any);

    await expect(service.findAttemptForStudent('attempt-1', 'student-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'attempt-1',
        test_id: 'test-1',
        student_id: 'student-1',
      }),
    );
  });

  it('should allow an admin to view any student test attempt', async () => {
    const supabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'attempt-1',
            test_id: 'test-1',
            student_id: 'student-1',
            started_at: '2026-01-01T00:00:00.000Z',
            completed_at: '2026-01-01T00:10:00.000Z',
            score: 10,
            max_score: 10,
            time_spent_seconds: 600,
            tests: { passing_score_percent: 60 },
            profiles: { full_name: 'Alice', email: 'alice@example.com' },
          },
          error: null,
        }),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: 'attempt-1',
            test_id: 'test-1',
            student_id: 'student-1',
            started_at: '2026-01-01T00:00:00.000Z',
            completed_at: '2026-01-01T00:10:00.000Z',
            score: 10,
            max_score: 10,
            time_spent_seconds: 600,
            tests: { passing_score_percent: 60 },
            profiles: { full_name: 'Alice', email: 'alice@example.com' },
          },
          error: null,
        }),
      })),
    };

    const mongoService = {
      getAttemptByAttemptId: jest.fn().mockResolvedValue(null),
      saveAttempt: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
    };

    const attemptMigrationService = {
      migrateSingleAssignmentAttempt: jest.fn().mockResolvedValue(true),
      migrateSingleTestAttempt: jest.fn().mockResolvedValue(true),
      migrateAllAttempts: jest.fn().mockResolvedValue({ totalEvaluated: 0, migratedCount: 0, skippedCount: 0, failedCount: 0, errors: [] }),
    };

    const service = new TestsService(supabase as any, mongoService as any, attemptMigrationService as any);

    await expect(service.findAttemptForStudent('attempt-1', 'student-2', 'ADMIN')).resolves.toEqual(
      expect.objectContaining({
        id: 'attempt-1',
        test_id: 'test-1',
        student_id: 'student-1',
      }),
    );
  });

  it('should resolve attempt from MongoDB primary store when present', async () => {
    const supabase = { from: jest.fn() };
    const mongoDoc = {
      attempt_id: 'attempt-mongo-1',
      assessment_id: 'test-1',
      assessment_type: 'test' as const,
      student_id: 'student-1',
      student_name: 'Bob',
      student_email: 'bob@example.com',
      started_at: '2026-01-01T00:00:00.000Z',
      completed_at: '2026-01-01T00:10:00.000Z',
      submitted_at: '2026-01-01T00:10:00.000Z',
      score: 85,
      max_score: 100,
      percentage: 85,
      passed: true,
      time_spent_seconds: 600,
      correct_count: 8,
      total_count: 10,
      avg_time_per_question: 60,
      topic_breakdown: [],
      question_review: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mongoService = {
      getAttemptByAttemptId: jest.fn().mockResolvedValue(mongoDoc),
      saveAttempt: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
    };

    const attemptMigrationService = {
      migrateSingleAssignmentAttempt: jest.fn().mockResolvedValue(true),
      migrateSingleTestAttempt: jest.fn().mockResolvedValue(true),
      migrateAllAttempts: jest.fn().mockResolvedValue({ totalEvaluated: 0, migratedCount: 0, skippedCount: 0, failedCount: 0, errors: [] }),
    };

    const service = new TestsService(supabase as any, mongoService as any, attemptMigrationService as any);
    const result = await service.findAttemptForStudent('attempt-mongo-1', 'student-1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'attempt-mongo-1',
        test_id: 'test-1',
        student_id: 'student-1',
        score: 85,
        passed: true,
      }),
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('should prevent Student A from reading Student B test attempt in MongoDB', async () => {
    const supabase = { from: jest.fn() };
    const mongoDoc = {
      attempt_id: 'attempt-mongo-2',
      assessment_id: 'test-1',
      assessment_type: 'test' as const,
      student_id: 'student-b',
      started_at: '2026-01-01T00:00:00.000Z',
      completed_at: '2026-01-01T00:10:00.000Z',
      score: 75,
      max_score: 100,
      percentage: 75,
      passed: true,
      time_spent_seconds: 500,
      correct_count: 7,
      total_count: 10,
      avg_time_per_question: 50,
      topic_breakdown: [],
      question_review: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mongoService = {
      getAttemptByAttemptId: jest.fn().mockResolvedValue(mongoDoc),
    };

    const attemptMigrationService = {};
    const service = new TestsService(supabase as any, mongoService as any, attemptMigrationService as any);

    await expect(service.findAttemptForStudent('attempt-mongo-2', 'student-a')).rejects.toThrow('Access denied');
  });

  it('should prevent Student A from reading Student B test attempt in Supabase fallback', async () => {
    const supabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: 'attempt-supa-2',
            test_id: 'test-1',
            student_id: 'student-b',
          },
          error: null,
        }),
      })),
    };

    const mongoService = {
      getAttemptByAttemptId: jest.fn().mockResolvedValue(null),
    };

    const attemptMigrationService = {};
    const service = new TestsService(supabase as any, mongoService as any, attemptMigrationService as any);

    await expect(service.findAttemptForStudent('attempt-supa-2', 'student-a')).rejects.toThrow('Access denied');
  });

  it('should throw NotFoundException when test attempt does not exist anywhere', async () => {
    const supabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })),
    };

    const mongoService = {
      getAttemptByAttemptId: jest.fn().mockResolvedValue(null),
    };

    const attemptMigrationService = {};
    const service = new TestsService(supabase as any, mongoService as any, attemptMigrationService as any);

    await expect(service.findAttemptForStudent('non-existent-attempt', 'student-a')).rejects.toThrow('Attempt not found');
  });
});


