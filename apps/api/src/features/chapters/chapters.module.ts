import { Module } from '@nestjs/common';
import { LessonsModule } from '../lessons/lessons.module';
import { ChaptersController } from './chapters.controller';
import { ChaptersService } from './chapters.service';

@Module({
  imports: [LessonsModule],
  controllers: [ChaptersController],
  providers: [ChaptersService],
  exports: [ChaptersService],
})
export class ChaptersModule {}
