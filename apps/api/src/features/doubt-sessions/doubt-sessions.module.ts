import { Module } from '@nestjs/common';
import { DoubtSessionsController } from './doubt-sessions.controller';
import { DoubtSessionsService } from './doubt-sessions.service';

@Module({
  controllers: [DoubtSessionsController],
  providers: [DoubtSessionsService],
})
export class DoubtSessionsModule {}
