import { FileModule } from '@/features/file/file.module';
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [FileModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
