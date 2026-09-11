import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Collection, Db, MongoClient } from 'mongodb';

export interface QuestionReviewOption {
  id: string;
  text: string;
  isCorrect: boolean;
  isSelected?: boolean;
}

export interface QuestionReviewItem {
  questionId: string;
  questionText: string;
  questionType: string;
  topic: string | null;
  isCorrect: boolean | null;
  timeSpentSeconds: number;
  points: number;
  pointsEarned: number;
  explanation: string | null;
  correctOptionIds: string[];
  selectedOptionIds: string[];
  correctOptionTexts: string[];
  selectedOptionTexts: string[];
  options: QuestionReviewOption[];
  textAnswer: string | null;
}

export interface TopicBreakdownItem {
  topic: string;
  total: number;
  correct: number;
  totalTime: number;
  points: number;
  earnedPoints: number;
}

export interface MongoAttemptDocument {
  attempt_id: string;
  assessment_type: 'assignment' | 'test';
  student_id: string;
  student_name?: string | null;
  student_email?: string | null;
  course_id?: string | null;
  course_title?: string | null;
  lesson_id?: string | null;
  assessment_id: string;
  assessment_title?: string | null;
  attempt_number?: number;
  started_at: string;
  completed_at: string;
  submitted_at: string;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  time_spent_seconds: number;
  correct_count: number;
  total_count: number;
  avg_time_per_question: number;
  topic_breakdown: TopicBreakdownItem[];
  question_review: QuestionReviewItem[];
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class MongoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongoService.name);
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private readonly uri: string;
  private readonly dbName: string;

  constructor(private readonly config: ConfigService) {
    this.uri = this.config.get<string>('MONGODB_URI') || '';
    this.dbName =
      this.config.get<string>('MONGODB_DB_NAME') || 'technical_pilot_lms';
  }

  async onModuleInit() {
    if (!this.uri) {
      this.logger.warn(
        'MONGODB_URI is not set. MongoDB operations will be skipped.',
      );
      return;
    }

    try {
      this.client = new MongoClient(this.uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
      });
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.logger.log(`Connected to MongoDB database: ${this.dbName}`);

      await this.ensureIndexes();
    } catch (error) {
      this.logger.error(
        `Failed to connect to MongoDB: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
      this.logger.log('Disconnected from MongoDB');
    }
  }

  private async ensureIndexes() {
    if (!this.db) return;
    try {
      const attemptsCollection = this.getAttemptsCollection();
      await attemptsCollection.createIndex({ attempt_id: 1 }, { unique: true });
      await attemptsCollection.createIndex({ student_id: 1, assessment_id: 1 });
      await attemptsCollection.createIndex({
        student_id: 1,
        assessment_type: 1,
      });
      await attemptsCollection.createIndex({ assessment_id: 1 });
      await attemptsCollection.createIndex({ created_at: -1 });
    } catch (error) {
      this.logger.warn(
        `Failed to create MongoDB indexes: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  getAttemptsCollection(): Collection<MongoAttemptDocument> {
    if (!this.db) {
      throw new Error('MongoDB database connection is not initialized');
    }
    return this.db.collection<MongoAttemptDocument>('attempts');
  }

  isConnected(): boolean {
    return this.db !== null && this.client !== null;
  }

  async isHealthy(): Promise<boolean> {
    if (!this.db) return false;
    try {
      await this.db.command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }

  async saveAttempt(
    doc: Omit<MongoAttemptDocument, 'created_at' | 'updated_at'>,
  ): Promise<void> {
    if (!this.isConnected()) {
      this.logger.warn(
        `MongoDB not connected. Skipping MongoDB persist for attempt ${doc.attempt_id}`,
      );
      return;
    }

    const now = new Date();

    await this.getAttemptsCollection().updateOne(
      { attempt_id: doc.attempt_id },
      {
        $set: {
          ...doc,
          updated_at: now,
        },
        $setOnInsert: {
          created_at: now,
        },
      },
      { upsert: true },
    );
  }

  async getAttemptByAttemptId(
    attemptId: string,
    studentId?: string,
  ): Promise<MongoAttemptDocument | null> {
    if (!this.isConnected()) return null;

    const query: Record<string, unknown> = { attempt_id: attemptId };
    if (studentId) {
      query.student_id = studentId;
    }

    return this.getAttemptsCollection().findOne(query);
  }

  async getAttemptsByStudent(
    studentId: string,
    assessmentType?: 'assignment' | 'test',
  ): Promise<MongoAttemptDocument[]> {
    if (!this.isConnected()) return [];

    const query: Record<string, unknown> = { student_id: studentId };
    if (assessmentType) {
      query.assessment_type = assessmentType;
    }

    return this.getAttemptsCollection()
      .find(query)
      .sort({ created_at: -1 })
      .toArray();
  }

  async getAttemptsByAssessment(
    assessmentId: string,
    assessmentType?: 'assignment' | 'test',
  ): Promise<MongoAttemptDocument[]> {
    if (!this.isConnected()) return [];

    const query: Record<string, unknown> = { assessment_id: assessmentId };
    if (assessmentType) {
      query.assessment_type = assessmentType;
    }

    return this.getAttemptsCollection()
      .find(query)
      .sort({ created_at: -1 })
      .toArray();
  }

  async getStudentAttemptCount(
    assessmentId: string,
    studentId: string,
  ): Promise<number> {
    if (!this.isConnected()) return 0;

    return this.getAttemptsCollection().countDocuments({
      assessment_id: assessmentId,
      student_id: studentId,
    });
  }
}
