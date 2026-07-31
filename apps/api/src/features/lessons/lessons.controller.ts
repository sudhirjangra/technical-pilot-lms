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
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto, ReorderLessonsDto, UpdateLessonDto } from './dto';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Roles('ADMIN')
  @Post()
  async create(@Body() dto: CreateLessonDto) {
    const data = await this.lessonsService.create(dto);
    return { message: 'Lesson created successfully', data };
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
