import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { FileService } from './file.service';

describe('FileService', () => {
  let service: FileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: Logger, useValue: { error: jest.fn(), warn: jest.fn() } },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
  });


  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
