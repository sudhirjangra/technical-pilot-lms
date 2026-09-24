import { Module } from '@nestjs/common';
import { LessonsModule } from '../lessons/lessons.module';
import { VideosModule } from '../videos/videos.module';
import { ChaptersController } from './chapters.controller';
import { ChaptersService } from './chapters.service';

@Module({
  imports: [LessonsModule, VideosModule],
  controllers: [ChaptersController],
  providers: [ChaptersService],
  exports: [ChaptersService],
})
export class ChaptersModule {}
