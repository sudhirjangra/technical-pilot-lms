import { Roles } from '@/common/decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CreateLessonDto, ReorderLessonsDto, UpdateLessonDto } from './dto';
import { LessonsService } from './lessons.service';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Roles('ADMIN')
  @Post()
  async create(@Body() dto: CreateLessonDto) {
    const data = await this.lessonsService.create(dto);
    return { message: 'Lesson created successfully', data };
  }

  @Roles('ADMIN')
  @Post(':id/pdf')
  async uploadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: FastifyRequest,
  ) {
    const data = await this.lessonsService.uploadPdf(id, request);
    return { message: 'PDF uploaded', data };
  }

  @Roles('ADMIN')
  @Delete(':id/pdf')
  async deletePdf(@Param('id', ParseUUIDPipe) id: string) {
    await this.lessonsService.deletePdf(id);
    return { message: 'PDF deleted' };
  }

  @Get('chapter/:chapterId')
  async findByChapter(@Param('chapterId', ParseUUIDPipe) chapterId: string) {
    const data = await this.lessonsService.findByChapter(chapterId);
    return { message: 'Lessons fetched successfully', data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.lessonsService.findOne(id);
    return { message: 'Lesson fetched successfully', data };
  }

  @Roles('ADMIN')
  @Patch('reorder')
  async reorder(@Body() dto: ReorderLessonsDto) {
    await this.lessonsService.reorder(dto.lessons);
    return { message: 'Lessons reordered successfully' };
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLessonDto,
  ) {
    const data = await this.lessonsService.update(id, dto);
    return { message: 'Lesson updated successfully', data };
  }

  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.lessonsService.remove(id);
    return { message: 'Lesson deleted successfully' };
  }
}
