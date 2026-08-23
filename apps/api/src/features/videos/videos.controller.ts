import { Audit } from '@/common/interceptors/audit-log.interceptor';
import { Ip, User } from '@/common/decorators';
import { Roles } from '@/common/decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { AuditLogInterceptor } from '@/common/interceptors/audit-log.interceptor';
import { CreateVideoLessonDto, UpdateVideoLessonDto } from './dto';
import { VideosService } from './videos.service';
import { Throttle } from '@nestjs/throttler';

@Controller('videos')
@UseInterceptors(AuditLogInterceptor)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  // ── Admin endpoints ──────────────────────────────────────────────────────

  @Roles('ADMIN')
  @Audit('video_lesson.create')
  @Post('lesson')
  async createVideoLesson(@Body() dto: CreateVideoLessonDto) {
    const data = await this.videosService.createVideoLesson(dto);
    return { message: 'Video lesson created', data };
  }

  @Roles('ADMIN')
  @Get('lesson/:lessonId')
  async findByLesson(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    const data = await this.videosService.findByLesson(lessonId);
    return { message: 'Video lesson fetched', data };
  }

  @Roles('ADMIN')
  @Get('course/:courseId')
  async findByCourse(@Param('courseId', ParseUUIDPipe) courseId: string) {
    const data = await this.videosService.findByCourse(courseId);
    return { message: 'Video lessons fetched', data };
  }

  @Roles('ADMIN')
  @Audit('video_lesson.update')
  @Patch('lesson/:lessonId')
  async updateVideoLesson(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateVideoLessonDto,
  ) {
    const data = await this.videosService.updateVideoLesson(lessonId, dto);
    return { message: 'Video lesson updated', data };
  }

  @Roles('ADMIN')
  @Audit('video_lesson.delete')
  @Delete('lesson/:lessonId')
  async deleteVideoLesson(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    await this.videosService.deleteVideoLesson(lessonId);
    return { message: 'Video lesson deleted' };
  }

  // ── Student endpoint: OTP generation ────────────────────────────────────

  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @Audit('video.otp_requested')
  @Post(':lessonId/otp')
  async generateOtp(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @User() user: { id: string; email: string },
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const data = await this.videosService.generateOtp(
      lessonId,
      user.id,
      user.email,
      ip ?? 'unknown',
      userAgent ?? '',
    );
    return { message: 'OTP generated', data };
  }
}
