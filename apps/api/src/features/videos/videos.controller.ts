import { Ip, Roles, User } from '@/common/decorators';
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
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Throttle } from '@nestjs/throttler';
import { CreateVideoLessonDto, UpdateVideoLessonDto } from './dto';
import { VideosService } from './videos.service';

@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  // ── Admin endpoints ──────────────────────────────────────────────────────

  @Roles('ADMIN')
  @Post('lesson')
  async createVideoLesson(@Body() dto: CreateVideoLessonDto) {
    const data = await this.videosService.createVideoLesson(dto);
    return { message: 'Video lesson created', data };
  }

  @Roles('ADMIN')
  @Post('lesson/:lessonId/upload')
  async uploadVideo(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Req() request: FastifyRequest,
  ) {
    const data = await this.videosService.uploadVideo(lessonId, request);
    return { message: 'Video uploaded', data };
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
  @Patch('lesson/:lessonId')
  async updateVideoLesson(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateVideoLessonDto,
  ) {
    const data = await this.videosService.updateVideoLesson(lessonId, dto);
    return { message: 'Video lesson updated', data };
  }

  @Roles('ADMIN')
  @Delete('lesson/:lessonId')
  async deleteVideoLesson(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    await this.videosService.deleteVideoLesson(lessonId);
    return { message: 'Video lesson deleted' };
  }

  // ── Student endpoint: OTP generation ────────────────────────────────────

  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @Post(':lessonId/otp')
  async generateOtp(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @User() user: { id: string },
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const data = await this.videosService.generateOtp(
      lessonId,
      user.id,
      ip ?? 'unknown',
      userAgent ?? '',
    );
    return { message: 'OTP generated', data };
  }
}
