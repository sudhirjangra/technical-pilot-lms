import { Roles } from '@/common/decorators';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateProgressDto, UpdateProgressDto } from './dto';
import { ProgressService } from './progress.service';

@ApiTags('Progress')
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  /** Student: start tracking a lesson (verifies enrollment) */
  @Post()
  initProgress(@Body() dto: CreateProgressDto, @Req() req: { user: { id: string } }) {
    return this.progressService.initOrGet(dto, req.user.id);
  }

  /** Student: get progress for a single lesson */
  @Get('lesson/:lessonId')
  getLessonProgress(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.progressService.getByLesson(lessonId, req.user.id);
  }

  /** Student: update lesson progress (video position, completion) */
  @Patch(':lessonId')
  updateProgress(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateProgressDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.progressService.update(lessonId, req.user.id, dto);
  }

  /** Student: get course progress overview */
  @Get('course/:courseId')
  getCourseProgress(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.progressService.getCourseProgress(courseId, req.user.id);
  }

  /** Admin: get a student's full progress */
  @Get('student/:studentId')
  @Roles('ADMIN')
  getStudentProgress(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.progressService.getStudentProgress(studentId);
  }
}
