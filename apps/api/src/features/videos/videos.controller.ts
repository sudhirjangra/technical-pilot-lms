import { Ip, Permissions, Roles, User } from '@/common/decorators';
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
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import {
  CancelVideoUploadDto,
  CompleteVideoUploadDto,
  CreateVideoLessonDto,
  UpdateVideoLessonDto,
} from './dto';
import { VideosService } from './videos.service';

@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  // ── Admin endpoints ──────────────────────────────────────────────────────

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Post('lesson')
  async createVideoLesson(@Body() dto: CreateVideoLessonDto) {
    const data = await this.videosService.createVideoLesson(dto);
    return { message: 'Video lesson created', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Post('lesson/:lessonId/upload-credentials')
  async getUploadCredentials(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    const data = await this.videosService.getUploadCredentials(lessonId);
    return { message: 'Upload credentials generated', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Post('lesson/:lessonId/complete-upload')
  async completeUpload(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: CompleteVideoUploadDto,
  ) {
    const data = await this.videosService.completeUpload(lessonId, dto.videoId);
    return { message: 'Video upload completed', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Post('cancel-upload')
  async cancelUpload(@Body() dto: CancelVideoUploadDto) {
    const data = await this.videosService.cancelUpload(dto.videoId);
    return { message: 'Incomplete video upload cancelled', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Post('cleanup-failed')
  async cleanupFailedUploads() {
    const data = await this.videosService.cleanupFailedUploads();
    return { message: 'Failed and orphaned video uploads cleaned up', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Post('lesson/:lessonId/upload')
  async uploadVideo(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Req() request: FastifyRequest,
  ) {
    const data = await this.videosService.uploadVideo(lessonId, request);
    return { message: 'Video uploaded', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Get('lesson/:lessonId')
  async findByLesson(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    const data = await this.videosService.findByLesson(lessonId);
    return { message: 'Video lesson fetched', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Get('course/:courseId')
  async findByCourse(@Param('courseId', ParseUUIDPipe) courseId: string) {
    const data = await this.videosService.findByCourse(courseId);
    return { message: 'Video lessons fetched', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Patch('lesson/:lessonId')
  async updateVideoLesson(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateVideoLessonDto,
  ) {
    const data = await this.videosService.updateVideoLesson(lessonId, dto);
    return { message: 'Video lesson updated', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Delete('lesson/:lessonId')
  async deleteVideoLesson(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    await this.videosService.deleteVideoLesson(lessonId);
    return { message: 'Video lesson deleted' };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Post('lesson/:lessonId/thumbnail')
  async uploadThumbnail(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Req() request: FastifyRequest,
  ) {
    const data = await this.videosService.uploadThumbnail(lessonId, request);
    return { message: 'Thumbnail uploaded', data };
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
