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
          then: (resolve: (value: any) => void) => resolve(request),
        };
        return chain;
      }),
    };

    const service = new TestsService(supabase as any);

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
      })),
    };

    const service = new TestsService(supabase as any);

    await expect(service.findAttemptForStudent('attempt-1', 'student-2', 'ADMIN')).resolves.toEqual(
      expect.objectContaining({
        id: 'attempt-1',
        test_id: 'test-1',
        student_id: 'student-1',
      }),
    );
  });
});
