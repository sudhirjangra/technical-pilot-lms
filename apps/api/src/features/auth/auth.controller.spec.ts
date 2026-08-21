import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Logger } from 'nestjs-pino';
import { SUPABASE_ADMIN, SUPABASE_ANON } from '@/common/modules/supabase.module';
import { MailService } from '@/features/mail/mail.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

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
          createUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-id', email: 'test@test.com' } }, error: null }),
          getUserById: jest.fn().mockResolvedValue({ data: { user: { id: 'test-id', email: 'test@test.com', email_confirmed_at: null } }, error: null }),
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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                ACCESS_TOKEN_SECRET: 'test-secret',
                REFRESH_TOKEN_SECRET: 'test-refresh-secret',
                ACCESS_TOKEN_EXPIRATION: '15m',
                REFRESH_TOKEN_EXPIRATION: '7d',
                PASSWORD_RESET_REDIRECT_URL: 'http://localhost:3000/reset-password',
              };
              return values[key];
            }),
          },
        },
        {
          provide: SUPABASE_ADMIN,
          useValue: mockSupabaseAdmin,
        },
        {
          provide: SUPABASE_ANON,
          useValue: mockSupabaseAnon,
        },
        {
          provide: Logger,
          useValue: {
            error: jest.fn(),
            warn: jest.fn(),
            log: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
