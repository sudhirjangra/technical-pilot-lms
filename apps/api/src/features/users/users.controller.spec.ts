import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import { FileService } from '@/features/file/file.service';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        {
          provide: SUPABASE_ADMIN,
          useValue: { from: jest.fn().mockReturnThis() },
        },
        {
          provide: FileService,
          useValue: { uploadFile: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
