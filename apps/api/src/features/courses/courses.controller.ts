import { Public, Roles, User } from '@/common/decorators';
import { Audit, AuditLogInterceptor } from '@/common/interceptors';
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
  UseInterceptors,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto } from './dto';

@Controller('courses')
@UseInterceptors(AuditLogInterceptor)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Roles('ADMIN')
  @Audit('course.create')
  @Post()
  async create(@Body() dto: CreateCourseDto, @User() user: { id: string }) {
    const data = await this.coursesService.create(dto, user.id);
    return { message: 'Course created successfully', data };
  }

  @Roles('ADMIN')
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

  @Roles('ADMIN')
  @Audit('course.update')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    const data = await this.coursesService.update(id, dto);
    return { message: 'Course updated successfully', data };
  }

  @Roles('ADMIN')
  @Audit('course.delete')
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.coursesService.remove(id);
    return { message: 'Course deleted successfully' };
  }
}
