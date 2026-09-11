import { ConfigService } from '@nestjs/config';
import { MongoAttemptDocument, MongoService } from './mongodb.service';

describe('MongoService', () => {
  let service: MongoService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'MONGODB_URI') return 'mongodb://localhost:27017/test';
        if (key === 'MONGODB_DB_NAME') return 'test_lms';
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new MongoService(configService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty list when not connected', async () => {
    const attempts = await service.getAttemptsByStudent('student-1');
    expect(attempts).toEqual([]);
  });

  it('should return null for attempt lookup when not connected', async () => {
    const attempt = await service.getAttemptByAttemptId('attempt-1');
    expect(attempt).toBeNull();
  });

  it('should return 0 for student attempt count when not connected', async () => {
    const count = await service.getStudentAttemptCount('test-1', 'student-1');
    expect(count).toBe(0);
  });

  it('should handle saveAttempt gracefully when not connected', async () => {
    const doc: Omit<MongoAttemptDocument, 'created_at' | 'updated_at'> = {
      attempt_id: 'attempt-1',
      assessment_type: 'test',
      student_id: 'student-1',
      assessment_id: 'test-1',
      started_at: '2026-01-01T00:00:00.000Z',
      completed_at: '2026-01-01T00:10:00.000Z',
      submitted_at: '2026-01-01T00:10:00.000Z',
      score: 100,
      max_score: 100,
      percentage: 100,
      passed: true,
      time_spent_seconds: 600,
      correct_count: 10,
      total_count: 10,
      avg_time_per_question: 60,
      topic_breakdown: [],
      question_review: [],
    };

    await expect(service.saveAttempt(doc)).resolves.toBeUndefined();
  });
});
