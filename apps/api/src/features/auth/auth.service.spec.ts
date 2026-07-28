import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import { MailService } from '@/features/mail/mail.service';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule, ConfigModule],
      providers: [
        AuthService,
        MailService,
        {
          provide: SUPABASE_ADMIN,
          useValue: {
            from: jest.fn().mockReturnThis(),
            auth: { admin: {} },
          },
        },
        {
          provide: MailerService,
          useValue: { sendMail: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
