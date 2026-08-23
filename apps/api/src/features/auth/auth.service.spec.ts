import {
  SUPABASE_ADMIN,
  SUPABASE_ANON,
} from '@/common/modules/supabase.module';
import { MailService } from '@/features/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const mockSupabaseAdmin = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      auth: {
        admin: {
          createUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-id', email: 'test@test.com' } },
            error: null,
          }),
          getUserById: jest.fn().mockResolvedValue({
            data: {
              user: {
                id: 'test-id',
                email: 'test@test.com',
                email_confirmed_at: null,
              },
            },
            error: null,
          }),
          updateUserById: jest.fn().mockResolvedValue({ error: null }),
          deleteUser: jest.fn().mockResolvedValue({ error: null }),
          signOut: jest.fn().mockResolvedValue({ error: null }),
        },
      },
    };

    const mockSupabaseAnon = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({ error: null }),
        resend: jest.fn().mockResolvedValue({ error: null }),
        verifyOtp: jest.fn().mockResolvedValue({ error: null }),
        resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
      },
    };

    const mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('test-token'),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          ACCESS_TOKEN_SECRET: 'test-secret',
          ACCESS_TOKEN_EXPIRATION: '15m',
          REFRESH_TOKEN_SECRET: 'test-secret',
          REFRESH_TOKEN_EXPIRATION: '30d',
          PASSWORD_RESET_REDIRECT_URL: 'http://localhost:3000/reset-password',
        };
        return config[key];
      }),
    };

    const mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    };

    const mockMailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SUPABASE_ADMIN, useValue: mockSupabaseAdmin },
        { provide: SUPABASE_ANON, useValue: mockSupabaseAnon },
        { provide: Logger, useValue: mockLogger },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
