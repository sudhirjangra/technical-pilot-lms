import { AssignmentsService } from './assignments.service';

describe('AssignmentsService', () => {
  it('should resolve a student-owned assignment attempt without using the admin detail lookup', async () => {
    const buildRequest = (payload: any) => ({
      ...payload,
      then: (resolve: (value: any) => void) => resolve(payload),
    });

    const supabase = {
      from: jest.fn((table: string) => {
        const requests: Record<string, any> = {
          assignment_attempts: buildRequest({
            data: {
              id: 'attempt-1',
              assignment_id: 'assignment-1',
              student_id: 'student-1',
              started_at: '2026-01-01T00:00:00.000Z',
              completed_at: '2026-01-01T00:10:00.000Z',
              score: 10,
              max_score: 10,
              time_spent_seconds: 600,
              assignments: { passing_score_percent: 60 },
              profiles: { full_name: 'Alice', email: 'alice@example.com' },
            },
            error: null,
          }),
          assignment_answers: buildRequest({
            data: [
              {
                id: 'answer-1',
                question_id: 'q-1',
                text_answer: null,
                is_correct: true,
                time_spent_seconds: 120,
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
              {
                id: 'q-1',
                question_type: 'mcq',
                points: 10,
                explanation: 'Why',
                topic: 'Topic 1',
                question_text: 'What?',
              },
            ],
            error: null,
          }),
          question_options: buildRequest({
            data: [{ id: 'opt-1', question_id: 'q-1', is_correct: true }],
            error: null,
          }),
        };

        const request =
          requests[table] ?? buildRequest({ data: [], error: null });
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
      migrateAllAttempts: jest.fn().mockResolvedValue({
        totalEvaluated: 0,
        migratedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        errors: [],
      }),
    };

    const service = new AssignmentsService(
      supabase as any,
      mongoService as any,
      attemptMigrationService as any,
    );

    await expect(
      service.findAttemptForStudent('attempt-1', 'student-1'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'attempt-1',
        assignment_id: 'assignment-1',
        student_id: 'student-1',
      }),
    );
  });

  it('should allow an admin to view any student assignment attempt', async () => {
    const supabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'attempt-1',
            assignment_id: 'assignment-1',
            student_id: 'student-1',
            started_at: '2026-01-01T00:00:00.000Z',
            completed_at: '2026-01-01T00:10:00.000Z',
            score: 10,
            max_score: 10,
            time_spent_seconds: 600,
            assignments: { passing_score_percent: 60 },
            profiles: { full_name: 'Alice', email: 'alice@example.com' },
          },
          error: null,
        }),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: 'attempt-1',
            assignment_id: 'assignment-1',
            student_id: 'student-1',
            started_at: '2026-01-01T00:00:00.000Z',
            completed_at: '2026-01-01T00:10:00.000Z',
            score: 10,
            max_score: 10,
            time_spent_seconds: 600,
            assignments: { passing_score_percent: 60 },
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
      migrateAllAttempts: jest.fn().mockResolvedValue({
        totalEvaluated: 0,
        migratedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        errors: [],
      }),
    };

    const service = new AssignmentsService(
      supabase as any,
      mongoService as any,
      attemptMigrationService as any,
    );

    await expect(
      service.findAttemptForStudent('attempt-1', 'student-2', 'ADMIN'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'attempt-1',
        assignment_id: 'assignment-1',
        student_id: 'student-1',
      }),
    );
  });

  it('should resolve attempt from MongoDB primary store when present', async () => {
    const supabase = { from: jest.fn() };
    const mongoDoc = {
      attempt_id: 'attempt-mongo-1',
      assessment_id: 'assignment-1',
      assessment_type: 'assignment' as const,
      student_id: 'student-1',
      student_name: 'Bob',
      student_email: 'bob@example.com',
      started_at: '2026-01-01T00:00:00.000Z',
      completed_at: '2026-01-01T00:10:00.000Z',
      submitted_at: '2026-01-01T00:10:00.000Z',
      score: 90,
      max_score: 100,
      percentage: 90,
      passed: true,
      time_spent_seconds: 400,
      correct_count: 9,
      total_count: 10,
      avg_time_per_question: 40,
      topic_breakdown: [],
      question_review: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mongoService = {
      getAttemptByAttemptId: jest.fn().mockResolvedValue(mongoDoc),
      saveAttempt: jest.fn().mockResolvedValue(undefined),
    };

    const attemptMigrationService = {
      migrateSingleAssignmentAttempt: jest.fn().mockResolvedValue(true),
      migrateSingleTestAttempt: jest.fn().mockResolvedValue(true),
      migrateAllAttempts: jest.fn().mockResolvedValue({
        totalEvaluated: 0,
        migratedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        errors: [],
      }),
    };

    const service = new AssignmentsService(
      supabase as any,
      mongoService as any,
      attemptMigrationService as any,
    );

    const result = await service.findAttemptForStudent(
      'attempt-mongo-1',
      'student-1',
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'attempt-mongo-1',
        assignment_id: 'assignment-1',
        student_id: 'student-1',
        score: 90,
        passed: true,
      }),
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('should prevent Student A from reading Student B assignment attempt in MongoDB', async () => {
    const supabase = { from: jest.fn() };
    const mongoDoc = {
      attempt_id: 'attempt-mongo-2',
      assessment_id: 'assignment-1',
      assessment_type: 'assignment' as const,
      student_id: 'student-b',
      started_at: '2026-01-01T00:00:00.000Z',
      completed_at: '2026-01-01T00:10:00.000Z',
      score: 80,
      max_score: 100,
      percentage: 80,
      passed: true,
      time_spent_seconds: 300,
      correct_count: 8,
      total_count: 10,
      avg_time_per_question: 30,
      topic_breakdown: [],
      question_review: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mongoService = {
      getAttemptByAttemptId: jest.fn().mockResolvedValue(mongoDoc),
    };

    const attemptMigrationService = {};
    const service = new AssignmentsService(
      supabase as any,
      mongoService as any,
      attemptMigrationService as any,
    );

    await expect(
      service.findAttemptForStudent('attempt-mongo-2', 'student-a'),
    ).rejects.toThrow('Access denied');
  });

  it('should prevent Student A from reading Student B assignment attempt in Supabase fallback', async () => {
    const supabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: 'attempt-supa-2',
            assignment_id: 'assignment-1',
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
    const service = new AssignmentsService(
      supabase as any,
      mongoService as any,
      attemptMigrationService as any,
    );

    await expect(
      service.findAttemptForStudent('attempt-supa-2', 'student-a'),
    ).rejects.toThrow('Access denied');
  });

  it('should throw NotFoundException when attempt does not exist anywhere', async () => {
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
    const service = new AssignmentsService(
      supabase as any,
      mongoService as any,
      attemptMigrationService as any,
    );

    await expect(
      service.findAttemptForStudent('non-existent-attempt', 'student-a'),
    ).rejects.toThrow('Attempt not found');
  });

  it('should submit an attempt with consistent MongoDB snapshot, Supabase reference, and lesson sync', async () => {
    const upsertedAnswers: any[] = [];
    let updatedAttempt: any = null;
    let savedMongoDoc: any = null;
    let progressUpsert: any = null;

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'assignment_attempts') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'attempt-submit-1',
                assignment_id: 'assign-1',
                student_id: 'student-1',
                started_at: '2026-01-01T00:00:00.000Z',
                completed_at: null,
                assignments: {
                  id: 'assign-1',
                  title: 'Aviation Quiz',
                  passing_score_percent: 60,
                  lesson_id: 'lesson-1',
                  lessons: {
                    id: 'lesson-1',
                    title: 'Navigation',
                    chapter_id: 'chapter-1',
                    chapters: {
                      id: 'chapter-1',
                      title: 'Ground School',
                      course_id: 'course-1',
                      courses: { id: 'course-1', title: 'Private Pilot' },
                    },
                  },
                },
              },
              error: null,
            }),
            update: jest.fn((payload) => {
              updatedAttempt = payload;
              return {
                eq: jest.fn().mockReturnValue({ error: null }),
              };
            }),
            then: (resolve: (val: any) => void) =>
              resolve({
                data: [
                  {
                    id: 'attempt-submit-1',
                    score: 10,
                    max_score: 10,
                    completed_at: '2026-01-01T00:10:00.000Z',
                  },
                ],
                error: null,
              }),
          };
        }

        if (table === 'questions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'q-1',
                  question_type: 'mcq',
                  points: 10,
                  explanation: 'Exp 1',
                  topic: 'Navigation',
                  question_text: 'Heading?',
                },
              ],
              error: null,
            }),
          };
        }

        if (table === 'question_options') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'opt-1',
                  question_id: 'q-1',
                  option_text: '360',
                  is_correct: true,
                },
                {
                  id: 'opt-2',
                  question_id: 'q-1',
                  option_text: '180',
                  is_correct: false,
                },
              ],
              error: null,
            }),
          };
        }

        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { full_name: 'Bob', email: 'bob@example.com' },
              error: null,
            }),
          };
        }

        if (table === 'assignment_answers') {
          return {
            upsert: jest.fn((data) => {
              upsertedAnswers.push(data);
              return {
                select: jest.fn().mockReturnThis(),
                single: jest
                  .fn()
                  .mockResolvedValue({ data: { id: 'ans-1' }, error: null }),
              };
            }),
          };
        }

        if (table === 'assignment_answer_options') {
          return {
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ error: null }),
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }

        if (table === 'progress') {
          return {
            upsert: jest.fn((payload) => {
              progressUpsert = payload;
              return { error: null };
            }),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [{ lesson_id: 'lesson-1', status: 'completed' }],
              error: null,
            }),
          };
        }

        if (table === 'lessons' || table === 'chapters') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'lesson-1', chapters: { course_id: 'course-1' } },
              error: null,
            }),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'lesson-1', chapters: { course_id: 'course-1' } },
              error: null,
            }),
            then: (resolve: (val: any) => void) =>
              resolve({
                data: [
                  {
                    id: 'chapter-1',
                    lessons: [{ id: 'lesson-1', is_published: true }],
                  },
                ],
                error: null,
              }),
          };
        }

        if (table === 'enrollments') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ error: null }),
          };
        }

        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    const mongoService = {
      saveAttempt: jest.fn((doc) => {
        savedMongoDoc = doc;
        return Promise.resolve();
      }),
      isConnected: jest.fn().mockReturnValue(true),
      getAttemptByAttemptId: jest.fn().mockResolvedValue(null),
    };

    const attemptMigrationService = {};
    const service = new AssignmentsService(
      supabase as any,
      mongoService as any,
      attemptMigrationService as any,
    );

    const result = await service.submitAttempt(
      'attempt-submit-1',
      'student-1',
      {
        answers: [
          {
            questionId: 'q-1',
            selectedOptionIds: ['opt-1'],
            timeSpentSeconds: 45,
          },
        ],
      },
    );

    expect(result.score).toBe(10);
    expect(result.passed).toBe(true);
    expect(savedMongoDoc).toBeDefined();
    expect(savedMongoDoc.score).toBe(10);
    expect(savedMongoDoc.passed).toBe(true);
    expect(updatedAttempt).toBeDefined();
    expect(updatedAttempt.score).toBe(10);
    expect(progressUpsert).toBeDefined();
    expect(progressUpsert.status).toBe('completed');
  });
});
