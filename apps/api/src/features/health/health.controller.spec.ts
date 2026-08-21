import { ConfigService } from '@nestjs/config';
import { DiskHealthIndicator } from '@nestjs/terminus';
import { HealthCheckService } from '@nestjs/terminus';
import { HttpHealthIndicator } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { MemoryHealthIndicator } from '@nestjs/terminus';
import { TerminusModule } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule, HttpModule],
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn().mockResolvedValue({ status: 'ok' }),
          },
        },
        {
          provide: HttpHealthIndicator,
          useValue: {
            pingCheck: jest.fn().mockReturnValue(() => Promise.resolve({ http: { status: 'up' } })),
          },
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: {
            pingCheck: jest.fn().mockReturnValue(() => Promise.resolve({ database: { status: 'up' } })),
          },
        },
        {
          provide: DiskHealthIndicator,
          useValue: {
            checkStorage: jest.fn().mockReturnValue(() => Promise.resolve({ disk: { status: 'up' } })),
          },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: {
            checkHeap: jest.fn().mockReturnValue(() => Promise.resolve({ memory: { status: 'up' } })),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                ALLOW_CORS_URL: 'http://localhost:3000',
              };
              return values[key];
            }),
          },
        },
        {
          provide: 'SUPABASE_HEALTH_CHECK',
          useValue: Promise.resolve({ healthy: true }),
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
