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
import { ChaptersService } from './chapters.service';
import { CreateChapterDto, ReorderChaptersDto, UpdateChapterDto } from './dto';

@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Roles('ADMIN')
  @Post()
  async create(@Body() dto: CreateChapterDto) {
    const data = await this.chaptersService.create(dto);
    return { message: 'Chapter created successfully', data };
  }

  @Get('course/:courseId')
  async findByCourse(@Param('courseId', ParseUUIDPipe) courseId: string) {
    const data = await this.chaptersService.findByCourse(courseId);
    return { message: 'Chapters fetched successfully', data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.chaptersService.findOne(id);
    return { message: 'Chapter fetched successfully', data };
  }

  @Roles('ADMIN')
  @Patch('reorder')
  async reorder(@Body() dto: ReorderChaptersDto) {
    await this.chaptersService.reorder(dto.chapters);
    return { message: 'Chapters reordered successfully' };
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChapterDto,
  ) {
    const data = await this.chaptersService.update(id, dto);
    return { message: 'Chapter updated successfully', data };
  }

  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.chaptersService.remove(id);
    return { message: 'Chapter deleted successfully' };
  }
}
