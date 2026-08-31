import { Permissions, Public, Roles, User } from '@/common/decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto } from './dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Post()
  async create(@Body() dto: CreateCourseDto, @User() user: { id: string }) {
    const data = await this.coursesService.create(dto, user.id);
    return { message: 'Course created successfully', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:read')
  @Get('admin')
  async findAll(
    @Query('status') status?: string,
    @Query('category_id') category_id?: string,
  ) {
    const data = await this.coursesService.findAll({ status, category_id });
    return { message: 'Courses fetched successfully', data };
  }

  @Public()
  @Get()
  async findPublished() {
    const data = await this.coursesService.findPublished();
    return { message: 'Courses fetched successfully', data };
  }

  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    const data = await this.coursesService.findBySlug(slug);
    return { message: 'Course fetched successfully', data };
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.coursesService.findOne(id);
    return { message: 'Course fetched successfully', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    const data = await this.coursesService.update(id, dto);
    return { message: 'Course updated successfully', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.coursesService.remove(id);
    return { message: 'Course deleted successfully' };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Post(':id/thumbnail')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  async uploadThumbnail(@Param('id', ParseUUIDPipe) id: string, @Req() request: FastifyRequest) {
    const data = await this.coursesService.uploadThumbnail(id, request);
    return { message: 'Thumbnail uploaded successfully', data };
  }
}
