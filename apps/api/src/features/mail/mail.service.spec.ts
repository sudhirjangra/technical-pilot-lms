import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { MailService } from './mail.service';

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('noreply@technicalpilot.com'),
          },
        },
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: Logger,
          useValue: {
            error: jest.fn(),
            warn: jest.fn(),
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
