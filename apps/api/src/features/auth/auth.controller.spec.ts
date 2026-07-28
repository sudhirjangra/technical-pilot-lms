import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import { MailService } from '@/features/mail/mail.service';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule, ConfigModule],
      controllers: [AuthController],
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

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
